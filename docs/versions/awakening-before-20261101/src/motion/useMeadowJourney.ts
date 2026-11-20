import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { keyJourney, wheelJourney, wheelPixels } from '../scene/journey';
import type { JourneyPose } from '../scene/journey';
import { cameraFrame, constrainPose } from '../scene/world';
import { advanceMeadow, groundVelocity, steerMeadow, followMeadowCamera, MEADOW_HOLD_DELAY_MS, SHARED_RABBIT_FOOT_OFFSET } from '../scene/meadowMotion';
import { depthProject } from '../scene/depthWorld';
import { constrainWalkableGround } from '../scene/walkableGround';
import type { MeadowPoint } from '../scene/meadowMotion';

export { SHARED_RABBIT_FOOT_OFFSET } from '../scene/meadowMotion';

type Options = {
  initialPose: JourneyPose;
  reduced: boolean;
  enabled: boolean;
  entered: boolean;
  onExplore: () => void;
  width: number;
  height: number;
};
type WalkPointer = {
  id: number; start: MeadowPoint; target: MeadowPoint; downAt: number;
  moved: boolean; worldObject: boolean; started: boolean;
};
const isWorldObject = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-world-object]');
const isControl = (target: EventTarget | null, allowWorldObject = false) => {
  if (allowWorldObject && isWorldObject(target)) return false;
  return target instanceof Element && !!target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="dialog"], [data-no-journey]');
};

/** Hold a direction to walk. Release stops the character and camera together, without inertia. */
export function useMeadowJourney(options: Options) {
  const [pose, setPose] = useState<JourneyPose>(() => constrainPose(options.initialPose, options.width, options.height));
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState(false);
  const [heading, setHeading] = useState<MeadowPoint>({ x: 0, y: -1 });
  const [destination, setDestination] = useState<MeadowPoint | null>(null);
  const [actor, setActor] = useState<MeadowPoint>(() => constrainWalkableGround({ x: pose.x, y: pose.y - SHARED_RABBIT_FOOT_OFFSET }));
  const actorRef = useRef(actor);
  const headingRef = useRef(heading);
  const speedRef = useRef(0);
  const poseRef = useRef(pose);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const pointer = useRef<WalkPointer | null>(null);
  const frame = useRef(0);
  const lastFrame = useRef(0);
  const suppressPointerClick = useRef(false);
  const tween = useRef<gsap.core.Tween | null>(null);
  const pulseTimer = useRef<number | undefined>(undefined);

  const publishHeading = useCallback((next: MeadowPoint) => {
    if (Math.hypot(next.x - headingRef.current.x, next.y - headingRef.current.y) < .0001) return;
    headingRef.current = next;
    setHeading(next);
  }, []);
  const publishPose = useCallback((next: JourneyPose) => {
    const { width, height } = optionsRef.current;
    const safe = constrainPose(next, width, height), previous = poseRef.current;
    if (safe.x === previous.x && safe.y === previous.y && safe.zoom === previous.zoom) return false;
    poseRef.current = safe; setPose(safe);
    return Math.hypot(safe.x - previous.x, safe.y - previous.y) > .0001;
  }, []);
  const publishActor = useCallback((next: MeadowPoint, zoom = poseRef.current.zoom) => {
    const { width, height } = optionsRef.current;
    const previous = actorRef.current;
    const grounded = constrainWalkableGround(next, previous);
    const clamped = constrainPose({ x: grounded.x, y: grounded.y + SHARED_RABBIT_FOOT_OFFSET, zoom }, width, height);
    const safe = { x: clamped.x, y: clamped.y - SHARED_RABBIT_FOOT_OFFSET };
    if (safe.x === previous.x && safe.y === previous.y) return false;
    actorRef.current = safe; setActor(safe);
    return Math.hypot(safe.x - previous.x, safe.y - previous.y) > .0001;
  }, []);
  const publish = useCallback((next: JourneyPose, actorOverride?: MeadowPoint) => {
    const previous = actorRef.current;
    const moved = publishActor(actorOverride ?? { x: next.x, y: next.y - SHARED_RABBIT_FOOT_OFFSET }, next.zoom);
    publishPose(next);
    const dx = actorRef.current.x - previous.x, dy = actorRef.current.y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (distance > .0001) publishHeading({ x: dx / distance, y: dy / distance });
    return moved;
  }, [publishActor, publishHeading, publishPose]);

  const stopTween = useCallback(() => { tween.current?.kill(); tween.current = null; setMoving(false); }, []);
  const stopPointer = useCallback(() => {
    const active = pointer.current;
    pointer.current = null;
    cancelAnimationFrame(frame.current); frame.current = 0; lastFrame.current = 0;
    window.clearTimeout(pulseTimer.current);
    speedRef.current = 0;
    setDragging(false); setMoving(false); setDestination(null);
    if (active && surfaceRef.current?.hasPointerCapture(active.id)) surfaceRef.current.releasePointerCapture(active.id);
  }, []);

  const transition = useCallback((next: JourneyPose, explore: boolean) => {
    stopTween(); stopPointer();
    const { width, height, reduced, onExplore } = optionsRef.current;
    if (explore) onExplore();
    const target = constrainPose(next, width, height);
    if (reduced) { publish(target); return; }
    const animated = { ...poseRef.current, actorX: actorRef.current.x, actorY: actorRef.current.y };
    tween.current = gsap.to(animated, {
      ...target, actorX: target.x, actorY: target.y - SHARED_RABBIT_FOOT_OFFSET, duration: 1.1, ease: 'power2.inOut',
      onUpdate: () => setMoving(publish(animated, { x: animated.actorX, y: animated.actorY })),
      onComplete: () => { publish(target); tween.current = null; setMoving(false); },
    });
  }, [publish, stopPointer, stopTween]);
  const goTo = useCallback((next: JourneyPose) => {
    if (optionsRef.current.enabled) transition(next, true);
  }, [transition]);
  const reset = useCallback(() => transition({ x: 0, y: 0, zoom: 1 }, false), [transition]);
  const jumpTo = useCallback((next: JourneyPose, actorOverride?: MeadowPoint, headingOverride?: MeadowPoint) => {
    stopTween(); stopPointer(); publish(next, actorOverride);
    if (headingOverride) publishHeading(headingOverride);
  }, [publish, publishHeading, stopPointer, stopTween]);

  useEffect(() => {
    if (options.reduced) stopTween();
    // Do not cancel the explicit approach tween when a content panel opens.
    if (!options.enabled || options.reduced) stopPointer();
  }, [options.enabled, options.reduced, stopPointer, stopTween]);
  useEffect(() => { stopTween(); stopPointer(); publish(poseRef.current, actorRef.current); }, [options.width, options.height, publish, stopPointer, stopTween]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const previousTouchAction = surface.style.touchAction;
    surface.style.touchAction = 'pinch-zoom';
    const scale = () => cameraFrame(poseRef.current, optionsRef.current.width, optionsRef.current.height).scale;
    const relative = (event: PointerEvent) => {
      const rect = surface.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const walkFrame = (now: number) => {
      const active = pointer.current;
      if (!active || !optionsRef.current.enabled || document.hidden) { stopPointer(); return; }
      const dt = lastFrame.current ? (now - lastFrame.current) / 1000 : 0;
      lastFrame.current = now;
      const canStart = (!active.worldObject || active.moved) && now - active.downAt >= MEADOW_HOLD_DELAY_MS;
      if (canStart) {
        if (!active.started) {
          active.started = true; suppressPointerClick.current = true;
          optionsRef.current.onExplore(); setDragging(true); setDestination(active.target);
        }
        const { width, height } = optionsRef.current;
        const currentActor = actorRef.current, currentPose = poseRef.current;
        const foot = depthProject(currentActor.x, currentActor.y, currentPose, width, height);
        const axisX = depthProject(currentActor.x + 1, currentActor.y, currentPose, width, height);
        const axisY = depthProject(currentActor.x, currentActor.y + 1, currentPose, width, height);
        const targetVelocity = groundVelocity(active.target, foot, axisX, axisY);
        const locomotion = steerMeadow(headingRef.current, speedRef.current, targetVelocity, dt);
        speedRef.current = locomotion.speed;
        const advanced = advanceMeadow({ ...currentActor, zoom: currentPose.zoom }, locomotion.velocity, dt);
        const didMove = publishActor(advanced);
        publishHeading(locomotion.heading);
        if (didMove) publishPose(followMeadowCamera(currentPose, actorRef.current, dt));
        setMoving(didMove);
      }
      frame.current = requestAnimationFrame(walkFrame);
    };
    const pointerDown = (event: PointerEvent) => {
      if (!optionsRef.current.enabled || isControl(event.target, true)) return;
      if (!event.isPrimary) { stopPointer(); return; }
      if (event.button !== 0) return;
      stopTween(); stopPointer(); suppressPointerClick.current = false;
      const worldObject = isWorldObject(event.target), target = relative(event);
      pointer.current = { id: event.pointerId, start: target, target, downAt: performance.now(), moved: false, worldObject, started: false };
      if (!worldObject) { surface.setPointerCapture(event.pointerId); surface.focus({ preventScroll: true }); }
      frame.current = requestAnimationFrame(walkFrame);
    };
    const pointerMove = (event: PointerEvent) => {
      const active = pointer.current;
      if (!active || active.id !== event.pointerId || !optionsRef.current.enabled) return;
      active.target = relative(event);
      if (!active.moved && Math.hypot(active.target.x - active.start.x, active.target.y - active.start.y) >= 5) {
        active.moved = true; suppressPointerClick.current = true;
        active.downAt = Math.min(active.downAt, performance.now() - MEADOW_HOLD_DELAY_MS);
        if (active.worldObject) { surface.setPointerCapture(event.pointerId); surface.focus({ preventScroll: true }); }
      }
      if (active.started) setDestination(active.target);
    };
    const pointerUp = (event: PointerEvent) => { if (pointer.current?.id === event.pointerId) stopPointer(); };
    const pointerCancel = (event: PointerEvent) => {
      if (pointer.current?.id === event.pointerId) { suppressPointerClick.current = false; stopPointer(); }
    };
    const lostCapture = (event: PointerEvent) => { if (event.target === surface) pointerCancel(event); };
    const click = (event: MouseEvent) => {
      if (!suppressPointerClick.current || event.detail === 0) return;
      suppressPointerClick.current = false; event.preventDefault(); event.stopPropagation();
    };
    const pulse = (next: JourneyPose) => {
      stopTween(); stopPointer(); optionsRef.current.onExplore();
      const current = poseRef.current;
      setMoving(publish(next, { x: actorRef.current.x + next.x - current.x, y: actorRef.current.y + next.y - current.y }));
      pulseTimer.current = window.setTimeout(() => setMoving(false), 120);
    };
    const wheel = (event: WheelEvent) => {
      if (!optionsRef.current.enabled || event.ctrlKey || event.metaKey || isControl(event.target, true)) return;
      const { width, height } = optionsRef.current;
      const dx = wheelPixels(event.deltaX, event.deltaMode, width), dy = wheelPixels(event.deltaY, event.deltaMode, height);
      if (!dx && !dy) return;
      // The exploration path goes north (+y): scroll down advances, scroll up returns.
      event.preventDefault(); pulse(wheelJourney(poseRef.current, dx, -dy, scale()));
    };
    const keyDown = (event: KeyboardEvent) => {
      if (!optionsRef.current.enabled || event.ctrlKey || event.metaKey || event.altKey || isControl(event.target)) return;
      const next = keyJourney(poseRef.current, event.key, scale(), optionsRef.current.height);
      if (!next) return;
      event.preventDefault(); pulse(next);
    };
    const cancelActivity = () => { stopTween(); stopPointer(); };
    const visibility = () => { if (document.hidden) cancelActivity(); };
    surface.addEventListener('pointerdown', pointerDown);
    surface.addEventListener('pointermove', pointerMove);
    surface.addEventListener('pointerup', pointerUp);
    surface.addEventListener('pointercancel', pointerCancel);
    surface.addEventListener('lostpointercapture', lostCapture);
    surface.addEventListener('click', click, true);
    surface.addEventListener('wheel', wheel, { passive: false });
    surface.addEventListener('keydown', keyDown);
    window.addEventListener('blur', cancelActivity);
    window.addEventListener('pointerup', pointerUp);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      surface.removeEventListener('pointerdown', pointerDown);
      surface.removeEventListener('pointermove', pointerMove);
      surface.removeEventListener('pointerup', pointerUp);
      surface.removeEventListener('pointercancel', pointerCancel);
      surface.removeEventListener('lostpointercapture', lostCapture);
      surface.removeEventListener('click', click, true);
      surface.removeEventListener('wheel', wheel);
      surface.removeEventListener('keydown', keyDown);
      window.removeEventListener('blur', cancelActivity);
      window.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('visibilitychange', visibility);
      surface.style.touchAction = previousTouchAction; stopTween(); stopPointer();
    };
  }, [publish, publishActor, publishHeading, publishPose, stopPointer, stopTween]);

  return { pose, poseRef, actor, actorRef, surfaceRef, goTo, jumpTo, reset, dragging, moving, heading, destination };
}
