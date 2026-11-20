import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { wheelPixels } from '../scene/journey';
import type { JourneyPose } from '../scene/journey';
import { constrainPose, HOME } from '../scene/world';
import { advanceMeadow, groundVelocity, steerMeadow, emptyMeadowDynamics, followMeadowCamera, advanceMeadowLook, meadowPressIntent, MEADOW_SPEED, MEADOW_HOLD_DELAY_MS, SHARED_RABBIT_FOOT_OFFSET, keyboardMeadowVelocity, wheelMeadowVelocity, wheelMeadowDuration } from '../scene/meadowMotion';
import { depthProject, terrainHeight } from '../scene/depthWorld';
import { constrainWalkableGround } from '../scene/walkableGround';
import type { MeadowPoint, MeadowGuidance } from '../scene/meadowMotion';
import { emptyPointerGuide, movePointerGuide, pointerGuideStrength } from '../scene/pointerGuidance';
import { capturePointingVelocity, pointingNeutral, POINTING_BRAKE_SECONDS } from '../scene/pointToWalk';
import type { JourneyFrame } from '../scene/journeyFrame';

export { SHARED_RABBIT_FOOT_OFFSET } from '../scene/meadowMotion';

type Options = {
  initialPose: JourneyPose;
  reduced: boolean;
  enabled: boolean;
  entered: boolean;
  onExplore: () => void;
  width: number;
  height: number;
  renderDriven?: boolean;
};
type WalkPointer = {
  id: number; start: MeadowPoint; target: MeadowPoint; downAt: number;
  moved: boolean; worldObject: boolean; started: boolean;
};
const isWorldObject = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-world-object]');
const isJourneyShortcut = (target: EventTarget | null) => target instanceof Element && !!target.closest('button[data-journey-shortcut]');
const isDesktopPointer = (event: PointerEvent) => event.pointerType === 'mouse' || !event.pointerType;
const isControl = (target: EventTarget | null, allowWorldObject = false) => {
  if (allowWorldObject && isWorldObject(target)) return false;
  return target instanceof Element && !!target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="dialog"], [data-no-journey]');
};

/** Desktop pointing holds a direction; bringing the pointer to the companion pauses. */
export function useMeadowJourney(options: Options) {
  const [pose, setPose] = useState<JourneyPose>(() => constrainPose(options.initialPose, options.width, options.height));
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState(false);
  const [heading, setHeading] = useState<MeadowPoint>({ x: 0, y: -1 });
  const [guidance, setGuidance] = useState<MeadowGuidance>({ active: false, heading: { x: 0, y: -1 }, strength: 0 });
  const [destination, setDestination] = useState<MeadowPoint | null>(null);
  const [actor, setActor] = useState<MeadowPoint>(() => constrainWalkableGround({ x: pose.x, y: pose.y - SHARED_RABBIT_FOOT_OFFSET }));
  const actorRef = useRef(actor);
  const headingRef = useRef(heading);
  const speedRef = useRef(0);
  const dynamicsRef = useRef(emptyMeadowDynamics());
  const lookRef = useRef<MeadowPoint>({x:0,y:0});
  const guidanceRef = useRef(guidance);
  const poseRef = useRef(pose);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const motion = useRef<JourneyFrame>({ pose, actor, heading, guidance, moving: false, speed: 0 });
  const running = useRef(false);
  const renderStepRef = useRef<(time: number) => void>(() => {});
  const fallbackStartRef = useRef<() => void>(() => {});
  const stepRenderFrame = useCallback(() => {
    if (optionsRef.current.renderDriven && running.current) renderStepRef.current(performance.now());
  }, []);
  const pointer = useRef<WalkPointer | null>(null);
  const hover = useRef(emptyPointerGuide());
  const hoverVelocity = useRef<MeadowPoint>({ x: 0, y: 0 });
  const frame = useRef(0);
  const lastFrame = useRef(0);
  const suppressPointerClick = useRef(false);
  const tween = useRef<gsap.core.Tween | null>(null);
  const heldKeys = useRef(new Set<string>());
  const wheelInput = useRef({ x: 0, y: 0, until: 0 });
  const qaWalk = useRef<{ started: number } | null>(null);
  const runSampleRef = useRef<() => void>(() => {});
  const runMotionSample = useCallback(() => {
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === 'motion') runSampleRef.current();
  }, []);

  const publishMoving = useCallback((value: boolean) => {
    motion.current.moving = value; setMoving(value);
  }, []);

  const publishGuidance = useCallback((active:boolean, velocity:MeadowPoint={x:0,y:0}) => {
    const speed=Math.hypot(velocity.x,velocity.y),previous=guidanceRef.current;
    const next={active:active&&speed>.001,heading:speed>.001?{x:velocity.x/speed,y:velocity.y/speed}:previous.heading,strength:active?Math.min(1,speed/MEADOW_SPEED):0};
    if(next.active===previous.active&&Math.abs(next.strength-previous.strength)<.0001&&Math.hypot(next.heading.x-previous.heading.x,next.heading.y-previous.heading.y)<.0001)return;
    guidanceRef.current=next;motion.current.guidance=next;setGuidance(next);
  },[]);
  const publishHeading = useCallback((next: MeadowPoint) => {
    if (Math.hypot(next.x - headingRef.current.x, next.y - headingRef.current.y) < .0001) return;
    headingRef.current = next;
    motion.current.heading = next;
    setHeading(next);
  }, []);
  const publishPose = useCallback((next: JourneyPose) => {
    const { width, height } = optionsRef.current;
    const safe = constrainPose(next, width, height), previous = poseRef.current;
    if (safe.x === previous.x && safe.y === previous.y && safe.zoom === previous.zoom) return false;
    poseRef.current = safe; motion.current.pose = safe; setPose(safe);
    return Math.hypot(safe.x - previous.x, safe.y - previous.y) > .0001;
  }, []);
  const publishActor = useCallback((next: MeadowPoint, zoom = poseRef.current.zoom) => {
    const { width, height } = optionsRef.current;
    const previous = actorRef.current;
    const grounded = constrainWalkableGround(next, previous);
    const clamped = constrainPose({ x: grounded.x, y: grounded.y + SHARED_RABBIT_FOOT_OFFSET, zoom }, width, height);
    const safe = { x: clamped.x, y: clamped.y - SHARED_RABBIT_FOOT_OFFSET };
    if (safe.x === previous.x && safe.y === previous.y) return false;
    actorRef.current = safe; motion.current.actor = safe; setActor(safe);
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

  const stopTween = useCallback(() => { if (!tween.current) return; tween.current.kill(); tween.current = null; publishMoving(false); }, [publishMoving]);
  const stopPointer = useCallback((reason = 'cancelled') => {
    if (import.meta.env.DEV && surfaceRef.current) {
      surfaceRef.current.dataset.journeyLastStop = reason;
      surfaceRef.current.dataset.journeyStopAt = performance.now().toFixed(1);
    }
    const active = pointer.current;
    pointer.current = null;
    qaWalk.current = null;
    // An ordinary rest ends intention, not the last known physical coordinate.
    // Keeping that baseline lets the next real stroke start on its first event.
    // Overlays, focus changes and cancellation still discard it, so stale
    // compatibility events cannot resume movement when a panel closes.
    hover.current = reason === 'rest'
      ? { sample: hover.current.sample, target: null, lastMovedAt: -Infinity }
      : emptyPointerGuide();
    hoverVelocity.current = { x: 0, y: 0 };
    cancelAnimationFrame(frame.current); frame.current = 0; lastFrame.current = 0;
    running.current = false;
    heldKeys.current.clear();
    wheelInput.current = { x: 0, y: 0, until: 0 };
    speedRef.current = 0;
    dynamicsRef.current = emptyMeadowDynamics();
    motion.current.speed = 0;
    publishGuidance(false);
    setDragging(false); publishMoving(false); setDestination(null);
    if (active && surfaceRef.current?.hasPointerCapture(active.id)) surfaceRef.current.releasePointerCapture(active.id);
  }, [publishGuidance, publishMoving]);

  const transition = useCallback((next: JourneyPose, explore: boolean) => {
    stopTween(); stopPointer();
    lookRef.current={x:0,y:0};
    const { width, height, reduced, onExplore } = optionsRef.current;
    if (explore) onExplore();
    const target = constrainPose(next, width, height);
    if (reduced) { publish(target); return; }
    const animated = { ...poseRef.current, actorX: actorRef.current.x, actorY: actorRef.current.y };
    tween.current = gsap.to(animated, {
      ...target, actorX: target.x, actorY: target.y - SHARED_RABBIT_FOOT_OFFSET, duration: 1.1, ease: 'power2.inOut',
      onUpdate: () => publishMoving(publish(animated, { x: animated.actorX, y: animated.actorY })),
      onComplete: () => { publish(target); tween.current = null; publishMoving(false); },
    });
  }, [publish, publishMoving, stopPointer, stopTween]);
  const goTo = useCallback((next: JourneyPose) => {
    if (optionsRef.current.enabled) transition(next, true);
  }, [transition]);
  const reset = useCallback(() => transition(HOME, false), [transition]);
  const jumpTo = useCallback((next: JourneyPose, actorOverride?: MeadowPoint, headingOverride?: MeadowPoint) => {
    stopTween(); stopPointer(); publish(next, actorOverride);
    lookRef.current={x:0,y:0};
    if (headingOverride) publishHeading(headingOverride);
  }, [publish, publishHeading, stopPointer, stopTween]);

  useEffect(() => {
    if (options.reduced) stopTween();
    // Do not cancel the explicit approach tween when a content panel opens.
    if (!options.enabled || options.reduced || !options.entered) stopPointer(!options.enabled ? 'disabled' : options.reduced ? 'reduced-motion-change' : 'invitation-reset');
  }, [options.enabled, options.reduced, options.entered, stopPointer, stopTween]);
  useEffect(() => { stopTween(); stopPointer('resize'); publish(poseRef.current, actorRef.current); }, [options.width, options.height, publish, stopPointer, stopTween]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const previousTouchAction = surface.style.touchAction;
    surface.style.touchAction = 'pinch-zoom';
    let ignoreCompatibilityMouseUntil = 0;
    const relative = (event: MouseEvent) => {
      const rect = surface.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const pointerVelocity=(target:MeadowPoint, desktop = false) => {
      const {width,height}=optionsRef.current,currentActor=actorRef.current,currentPose=poseRef.current;
      // Steering uses a horizontal tangent at the rabbit's altitude. Sampling each
      // axis on the slope can invert the screen derivative behind a steep ridge.
      const groundZ=terrainHeight(currentActor.x,currentActor.y);
      const foot=depthProject(currentActor.x,currentActor.y,currentPose,width,height,groundZ);
      const axisX=depthProject(currentActor.x+1,currentActor.y,currentPose,width,height,groundZ);
      const axisY=depthProject(currentActor.x,currentActor.y+1,currentPose,width,height,groundZ);
      if (desktop) {
        if (import.meta.env.DEV) surface.dataset.journeyNeutral = JSON.stringify(pointingNeutral(foot));
        return capturePointingVelocity(target,foot,axisX,axisY);
      }
      return groundVelocity(target,foot,axisX,axisY);
    };
    const walkFrame = (_renderingTimestamp: number) => {
      // RAF's rendering timestamp can precede a pointer event delivered in the
      // same frame. Input leases and integration must share the event-time clock.
      const now = performance.now();
      frame.current = 0;
      if (!optionsRef.current.enabled || !optionsRef.current.entered || surface.inert || document.hidden) { stopPointer(!optionsRef.current.enabled ? 'disabled' : !optionsRef.current.entered ? 'invitation-reset' : surface.inert ? 'inert' : 'hidden'); return; }
      const active = pointer.current;
      const hoverStrength = pointerGuideStrength(hover.current, now);
      const dt = lastFrame.current ? Math.max(0, now - lastFrame.current) / 1000 : 0;
      lastFrame.current = now;
      const press=active?meadowPressIntent(now-active.downAt,active.worldObject,active.moved):null;
      const currentActor = actorRef.current, currentPose = poseRef.current;
      let targetVelocity: MeadowPoint = { x: 0, y: 0 };
      let intentVelocity: MeadowPoint = targetVelocity;
      let stopWithinSeconds: number | undefined;
      if (active && press?.anticipating) {
        intentVelocity=pointerVelocity(active.target);
      }
      if (active && press?.walking) {
        if (!active.started) {
          active.started = true; suppressPointerClick.current = true;
          optionsRef.current.onExplore(); setDragging(true); setDestination(active.target);
        }
        targetVelocity = intentVelocity;
      } else if (heldKeys.current.size) {
        targetVelocity = intentVelocity = keyboardMeadowVelocity(heldKeys.current);
      } else if (wheelInput.current.until > now) {
        const remaining = Math.min(1, (wheelInput.current.until - now) / 130);
        targetVelocity = intentVelocity = { x: wheelInput.current.x * remaining, y: wheelInput.current.y * remaining };
      } else if (hover.current.target) {
        // Keep the direction captured by the last real move. Camera following
        // must not turn a held direction into a shrinking chase/dead zone.
        targetVelocity = intentVelocity = { x: hoverVelocity.current.x * hoverStrength, y: hoverVelocity.current.y * hoverStrength };
        if (Math.hypot(targetVelocity.x, targetVelocity.y) < .001) stopWithinSeconds = POINTING_BRAKE_SECONDS;
      }
      // Explicit development-only walking sample: the same integrator, no synthetic input events.
      if (qaWalk.current) {
        const elapsed = now - qaWalk.current.started;
        if (elapsed >= 8000) qaWalk.current = null;
        else {
          targetVelocity = elapsed < 2000 ? { x: 0, y: -MEADOW_SPEED }
            : elapsed < 3400 ? { x: MEADOW_SPEED, y: 0 }
            : elapsed < 4980 ? { x: -MEADOW_SPEED, y: 0 }
            : elapsed < 6000 ? { x: 0, y: 0 }
            : elapsed < 7480 ? { x: 0, y: MEADOW_SPEED } : { x: 0, y: 0 };
          if (elapsed >= 4980 && elapsed < 6000) stopWithinSeconds = Math.max(0, (5340 - elapsed) / 1000);
          if (elapsed >= 7480) stopWithinSeconds = Math.max(0, (7840 - elapsed) / 1000);
          intentVelocity = targetVelocity;
        }
      }
      if (import.meta.env.DEV) {
        surface.dataset.journeyFrames = String((Number(surface.dataset.journeyFrames ?? 0) + 1) % 1_000_000);
        surface.dataset.journeyIntent = `${targetVelocity.x.toFixed(2)},${targetVelocity.y.toFixed(2)}`;
        surface.dataset.journeyHoverAge = Number.isFinite(hover.current.lastMovedAt) ? (now - hover.current.lastMovedAt).toFixed(1) : 'none';
        surface.dataset.journeyRafLag = (now - _renderingTimestamp).toFixed(1);
      }
      publishGuidance(true,intentVelocity);
      const locomotion = steerMeadow(headingRef.current, speedRef.current, targetVelocity, dt, dynamicsRef.current, stopWithinSeconds);
      dynamicsRef.current = locomotion;
      speedRef.current = locomotion.speed;
      motion.current.speed = locomotion.speed;
      const advanced = advanceMeadow({ ...currentActor, zoom: currentPose.zoom }, locomotion.velocity, dt);
      const didMove = publishActor(advanced);
      publishHeading(locomotion.heading);
      lookRef.current=advanceMeadowLook(lookRef.current,locomotion.heading,locomotion.speed,dt);
      if (didMove) publishPose(followMeadowCamera(currentPose, actorRef.current, dt, true, {...locomotion,lead:lookRef.current}));
      publishMoving(didMove);
      if (qaWalk.current || active || heldKeys.current.size || wheelInput.current.until > now || (hoverStrength && Math.hypot(hoverVelocity.current.x, hoverVelocity.current.y) > .001) || speedRef.current > .001) {
        if (!optionsRef.current.renderDriven) frame.current = requestAnimationFrame(walkFrame);
      }
      else stopPointer('rest');
    };
    const ensureFrame = () => {
      if (!running.current) { running.current = true; lastFrame.current = performance.now(); }
      if (!optionsRef.current.renderDriven && !frame.current) frame.current = requestAnimationFrame(walkFrame);
    };
    renderStepRef.current = walkFrame;
    fallbackStartRef.current = ensureFrame;
    runSampleRef.current = () => {
      if (!optionsRef.current.enabled || !optionsRef.current.entered || surface.inert || document.hidden) return;
      jumpTo(HOME, undefined, { x: 0, y: -1 }); optionsRef.current.onExplore();
      qaWalk.current = { started: performance.now() }; ensureFrame();
    };
    const pointerDown = (event: PointerEvent) => {
      if (isDesktopPointer(event)) {
        // Clicking opens things. It never arms or extends a desktop walk.
        stopPointer(); suppressPointerClick.current = false;
        // A blank click restores keyboard navigation after using an overlay
        // control, without moving focus away from an object being opened.
        if (event.button === 0 && optionsRef.current.enabled && optionsRef.current.entered && !isControl(event.target) && !isWorldObject(event.target)) {
          surface.focus({ preventScroll: true });
        }
        return;
      }
      ignoreCompatibilityMouseUntil = performance.now() + 800;
      if (!optionsRef.current.enabled || !optionsRef.current.entered || surface.inert || isControl(event.target, true)) return;
      if (!event.isPrimary) { stopPointer(); return; }
      if (event.button !== 0) return;
      stopTween(); stopPointer(); suppressPointerClick.current = false;
      const worldObject = isWorldObject(event.target), target = relative(event);
      pointer.current = { id: event.pointerId, start: target, target, downAt: performance.now(), moved: false, worldObject, started: false };
      if (!worldObject) { publishGuidance(true,pointerVelocity(target)); surface.setPointerCapture(event.pointerId); surface.focus({ preventScroll: true }); }
      ensureFrame();
    };
    const desktopMove = (event: MouseEvent) => {
        if (import.meta.env.DEV) surface.dataset.journeyLastInput = `${event.type}@${performance.now().toFixed(1)}:${event.clientX},${event.clientY};buttons=${event.buttons}`;
        // World-object hitboxes are part of the meadow while passing over them.
        // Their pointerdown still stops walking before the click opens content.
        const blocked = isControl(event.target, true);
        if (blocked || !optionsRef.current.enabled || !optionsRef.current.entered || surface.inert || event.buttons !== 0) {
          stopPointer(blocked ? 'control' : !optionsRef.current.enabled ? 'disabled' : !optionsRef.current.entered ? 'invitation-reset' : surface.inert ? 'inert' : 'mouse-button');
          return;
        }
        // Key intent wins until keyup; a pointer gesture must be fresh after it.
        if (heldKeys.current.size || pointer.current) return;
        const previous = hover.current;
        const next = movePointerGuide(previous, {
          point: relative(event), movementX: event.movementX, movementY: event.movementY,
          pointerType: 'mouse', buttons: event.buttons, blocked,
          enabled: optionsRef.current.enabled, entered: optionsRef.current.entered,
        }, performance.now());
        if (next === hover.current) return;
        hover.current = next;
        if (!next.target) return;
        hoverVelocity.current = pointerVelocity(next.target, true);
        if (import.meta.env.DEV) surface.dataset.journeyPointingVelocity = `${hoverVelocity.current.x.toFixed(2)},${hoverVelocity.current.y.toFixed(2)}`;
        stopTween(); wheelInput.current.until = 0;
        ensureFrame();
    };
    const compatibilityMouseMove = (event: MouseEvent) => {
      const capabilities = (event as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities;
      if (performance.now() < ignoreCompatibilityMouseUntil || capabilities?.firesTouchEvents) return;
      // Both event types may fire for a mouse. Identical coordinates do not
      // renew the input lease, so the compatibility event cannot double it.
      desktopMove(event);
    };
    const pointerMove = (event: PointerEvent) => {
      if (isDesktopPointer(event)) { desktopMove(event); return; }
      ignoreCompatibilityMouseUntil = performance.now() + 800;
      const active = pointer.current;
      if (!active || active.id !== event.pointerId || !optionsRef.current.enabled || !optionsRef.current.entered) return;
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
      if (isDesktopPointer(event)) { stopPointer(); return; }
      if (pointer.current?.id === event.pointerId) { suppressPointerClick.current = false; stopPointer(); }
    };
    const lostCapture = (event: PointerEvent) => { if (event.target === surface) pointerCancel(event); };
    const click = (event: MouseEvent) => {
      if (!suppressPointerClick.current || event.detail === 0) return;
      suppressPointerClick.current = false; event.preventDefault(); event.stopPropagation();
    };
    const wheel = (event: WheelEvent) => {
      // Landmark hitboxes remain meadow ground for scrolling; clicks still open them.
      if (!optionsRef.current.enabled || !optionsRef.current.entered || surface.inert || event.ctrlKey || event.metaKey || isControl(event.target, true)) return;
      const { width, height } = optionsRef.current;
      const dx = wheelPixels(event.deltaX, event.deltaMode, width), dy = wheelPixels(event.deltaY, event.deltaMode, height);
      if (!dx && !dy) return;
      event.preventDefault();
      if (pointer.current || heldKeys.current.size) return;
      stopTween(); optionsRef.current.onExplore();
      hover.current = emptyPointerGuide();
      hoverVelocity.current = { x: 0, y: 0 };
      const velocity = wheelMeadowVelocity(dx, dy);
      wheelInput.current = { ...velocity, until: performance.now() + wheelMeadowDuration(headingRef.current, velocity) };
      ensureFrame();
    };
    const movementKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'PageUp', 'PageDown']);
    const keyDown = (event: KeyboardEvent) => {
      // Keep the opener focused after reading. Only an explicit walking key hands
      // control back to the meadow; Enter, Space and Tab still operate the opener.
      const resumeFromOpener = movementKeys.has(event.code) && (isWorldObject(event.target) || isJourneyShortcut(event.target));
      if (event.defaultPrevented || !optionsRef.current.enabled || !optionsRef.current.entered || surface.inert || document.hidden || event.ctrlKey || event.metaKey || event.altKey || (isControl(event.target) && !resumeFromOpener)) return;
      if (event.code === 'Home') { event.preventDefault(); transition(HOME, true); return; }
      if (!movementKeys.has(event.code)) return;
      event.preventDefault();
      if (event.repeat || pointer.current) return;
      // Landmark buttons unmount beyond interaction range; keep later keys in the meadow.
      if (resumeFromOpener) surface.focus({ preventScroll: true });
      stopTween(); optionsRef.current.onExplore();
      hover.current = emptyPointerGuide();
      hoverVelocity.current = { x: 0, y: 0 };
      heldKeys.current.add(event.code); wheelInput.current.until = 0; setDestination(null); ensureFrame();
    };
    // Header shortcuts sit outside the surface. Opt in only those reading
    // openers, never arbitrary page controls or text inputs, to the same handler.
    const shortcutKeyDown = (event: KeyboardEvent) => { if (isJourneyShortcut(event.target)) keyDown(event); };
    const keyUp = (event: KeyboardEvent) => {
      if (!heldKeys.current.delete(event.code)) return;
      event.preventDefault();
      if (!heldKeys.current.size && !pointer.current) stopPointer();
    };
    const cancelActivity = (event?: Event) => { stopTween(); stopPointer(event?.type ?? 'hidden'); };
    const visibility = () => { if (document.hidden) cancelActivity(); };
    const pointerLeave = (event: PointerEvent) => { if (isDesktopPointer(event)) stopPointer('pointer-leave'); };
    const mouseLeave = () => { if (!pointer.current) stopPointer('mouse-leave'); };
    const pointerOver = (event: PointerEvent) => {
      if (isDesktopPointer(event) && isControl(event.target, true)) stopPointer('control-over');
    };
    // A control may receive focus by keyboard without a mouse event.
    const controlFocus = (event: FocusEvent) => { if (isControl(event.target)) stopPointer('control-focus'); };
    surface.addEventListener('pointerdown', pointerDown);
    surface.addEventListener('pointermove', pointerMove);
    surface.addEventListener('mousemove', compatibilityMouseMove);
    surface.addEventListener('pointerleave', pointerLeave);
    surface.addEventListener('mouseleave', mouseLeave);
    surface.addEventListener('pointerover', pointerOver);
    surface.addEventListener('pointerup', pointerUp);
    surface.addEventListener('pointercancel', pointerCancel);
    surface.addEventListener('lostpointercapture', lostCapture);
    surface.addEventListener('click', click, true);
    surface.addEventListener('wheel', wheel, { passive: false });
    surface.addEventListener('keydown', keyDown);
    window.addEventListener('keydown', shortcutKeyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', cancelActivity);
    window.addEventListener('pointerup', pointerUp);
    document.addEventListener('focusin', controlFocus);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      surface.removeEventListener('pointerdown', pointerDown);
      surface.removeEventListener('pointermove', pointerMove);
      surface.removeEventListener('mousemove', compatibilityMouseMove);
      surface.removeEventListener('pointerleave', pointerLeave);
      surface.removeEventListener('mouseleave', mouseLeave);
      surface.removeEventListener('pointerover', pointerOver);
      surface.removeEventListener('pointerup', pointerUp);
      surface.removeEventListener('pointercancel', pointerCancel);
      surface.removeEventListener('lostpointercapture', lostCapture);
      surface.removeEventListener('click', click, true);
      surface.removeEventListener('wheel', wheel);
      surface.removeEventListener('keydown', keyDown);
      window.removeEventListener('keydown', shortcutKeyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', cancelActivity);
      window.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('focusin', controlFocus);
      document.removeEventListener('visibilitychange', visibility);
      surface.style.touchAction = previousTouchAction; stopTween(); stopPointer('unmount');
    };
  }, [publishActor, publishHeading, publishPose, publishGuidance, publishMoving, stopPointer, stopTween, transition, jumpTo]);

  useEffect(() => {
    // Exactly one owner advances locomotion. Static mode retains the RAF fallback.
    if (options.renderDriven) { cancelAnimationFrame(frame.current); frame.current = 0; }
    else if (running.current) fallbackStartRef.current();
  }, [options.renderDriven]);

  return { pose, poseRef, actor, actorRef, surfaceRef, goTo, jumpTo, reset, dragging, moving, heading, destination, guidance, runMotionSample, motion, stepRenderFrame };
}
