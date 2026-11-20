import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { dragJourney, keyJourney, wheelJourney, wheelPixels } from '../scene/journey';
import { cameraFrame, constrainPose } from '../scene/world';
import type { JourneyPose } from '../scene/journey';

export type { JourneyPose } from '../scene/journey';

type Options = {
  initialPose: JourneyPose;
  reduced: boolean;
  enabled: boolean;
  onExplore: () => void;
  width: number;
  height: number;
};

type PointerStart = {
  id: number; x: number; y: number; lastX: number; lastY: number;
  moved: boolean; worldObject: boolean;
};

const isWorldObject = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-world-object]');
const isControl = (target: EventTarget | null, allowWorldObject = false) => {
  if (allowWorldObject && isWorldObject(target)) return false;
  return target instanceof Element && !!target.closest(
    'button, a, input, textarea, select, [contenteditable="true"], [role="dialog"], [data-no-journey]',
  );
};

/** One controller owns both camera axes. User input has no inertia, snapping or route constraint. */
export function useJourney(options: Options) {
  const [pose, setPose] = useState<JourneyPose>(() => constrainPose(options.initialPose, options.width, options.height));
  const [dragging, setDragging] = useState(false);
  const poseRef = useRef(pose);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const pointer = useRef<PointerStart | null>(null);
  const suppressPointerClick = useRef(false);
  const tween = useRef<gsap.core.Tween | null>(null);

  const publish = useCallback((next: JourneyPose) => {
    const { width, height } = optionsRef.current;
    const safe = constrainPose(next, width, height);
    if (safe.x === poseRef.current.x && safe.y === poseRef.current.y && safe.zoom === poseRef.current.zoom) return;
    poseRef.current = safe;
    setPose(safe);
  }, []);

  const stopTween = useCallback(() => { tween.current?.kill(); tween.current = null; }, []);
  const stopPointer = useCallback(() => {
    const active = pointer.current;
    pointer.current = null;
    setDragging(false);
    if (active && surfaceRef.current?.hasPointerCapture(active.id)) surfaceRef.current.releasePointerCapture(active.id);
  }, []);

  const transition = useCallback((next: JourneyPose, explore: boolean) => {
    stopTween(); stopPointer();
    const { width, height, reduced, onExplore } = optionsRef.current;
    if (explore) onExplore();
    const target = constrainPose(next, width, height);
    if (reduced) { publish(target); return; }
    const animated = { ...poseRef.current };
    tween.current = gsap.to(animated, {
      ...target, duration: 1.1, ease: 'power2.inOut',
      onUpdate: () => publish(animated),
      onComplete: () => { publish(target); tween.current = null; },
    });
  }, [publish, stopPointer, stopTween]);

  const goTo = useCallback((next: JourneyPose) => {
    if (optionsRef.current.enabled) transition(next, true);
  }, [transition]);
  const reset = useCallback(() => transition({ x: 0, y: 0, zoom: 1 }, false), [transition]);
  const jumpTo = useCallback((next: JourneyPose) => {
    stopTween(); stopPointer(); publish(next);
  }, [publish, stopPointer, stopTween]);

  useEffect(() => {
    // Opening content disables gestures while the explicit approach can finish.
    if (options.reduced) stopTween();
    if (!options.enabled || options.reduced) stopPointer();
  }, [options.enabled, options.reduced, stopPointer, stopTween]);
  useEffect(() => {
    stopTween(); stopPointer(); publish(poseRef.current);
  }, [options.width, options.height, publish, stopPointer, stopTween]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const previousTouchAction = surface.style.touchAction;
    surface.style.touchAction = 'pinch-zoom';
    const scale = () => {
      const { width, height } = optionsRef.current;
      return cameraFrame(poseRef.current, width, height).scale;
    };

    const pointerDown = (event: PointerEvent) => {
      if (!optionsRef.current.enabled || isControl(event.target, true)) return;
      if (!event.isPrimary) { stopPointer(); return; }
      if (event.button !== 0) return;
      stopTween(); suppressPointerClick.current = false;
      const worldObject = isWorldObject(event.target);
      pointer.current = {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        lastX: event.clientX, lastY: event.clientY, moved: false, worldObject,
      };
      // Keep a short click addressed to the object; transfer capture only when it becomes a drag.
      if (!worldObject) { surface.setPointerCapture(event.pointerId); surface.focus({ preventScroll: true }); }
    };
    const pointerMove = (event: PointerEvent) => {
      const active = pointer.current;
      if (!active || active.id !== event.pointerId || !optionsRef.current.enabled) return;
      if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 4) return;
      if (!active.moved) {
        active.moved = true; suppressPointerClick.current = true;
        if (active.worldObject) { surface.setPointerCapture(event.pointerId); surface.focus({ preventScroll: true }); }
        setDragging(true); optionsRef.current.onExplore();
      }
      const dx = event.clientX - active.lastX, dy = event.clientY - active.lastY;
      // Advance the pointer anchor even when world bounds clamp the view. Reversing at an edge
      // responds immediately instead of requiring a drag back through the discarded overshoot.
      active.lastX = event.clientX; active.lastY = event.clientY;
      publish(dragJourney(poseRef.current, dx, dy, scale()));
    };
    const pointerUp = (event: PointerEvent) => {
      if (pointer.current?.id !== event.pointerId) return;
      pointerMove(event); stopPointer();
    };
    const pointerCancel = (event: PointerEvent) => {
      if (pointer.current?.id === event.pointerId) { suppressPointerClick.current = false; stopPointer(); }
    };
    const lostCapture = (event: PointerEvent) => {
      if (event.target === surface) pointerCancel(event);
    };
    const click = (event: MouseEvent) => {
      if (!suppressPointerClick.current || event.detail === 0) return;
      suppressPointerClick.current = false; event.preventDefault(); event.stopPropagation();
    };
    const wheel = (event: WheelEvent) => {
      if (!optionsRef.current.enabled || event.ctrlKey || event.metaKey || isControl(event.target, true)) return;
      const { width, height } = optionsRef.current;
      const dx = wheelPixels(event.deltaX, event.deltaMode, width);
      const dy = wheelPixels(event.deltaY, event.deltaMode, height);
      if (!dx && !dy) return;
      event.preventDefault(); stopTween(); stopPointer(); optionsRef.current.onExplore();
      publish(wheelJourney(poseRef.current, dx, dy, scale()));
    };
    const keyDown = (event: KeyboardEvent) => {
      if (!optionsRef.current.enabled || event.ctrlKey || event.metaKey || event.altKey || isControl(event.target)) return;
      const next = keyJourney(poseRef.current, event.key, scale(), optionsRef.current.height);
      if (!next) return;
      event.preventDefault(); stopTween(); stopPointer(); optionsRef.current.onExplore(); publish(next);
    };
    surface.addEventListener('pointerdown', pointerDown);
    surface.addEventListener('pointermove', pointerMove);
    surface.addEventListener('pointerup', pointerUp);
    surface.addEventListener('pointercancel', pointerCancel);
    surface.addEventListener('lostpointercapture', lostCapture);
    surface.addEventListener('click', click, true);
    surface.addEventListener('wheel', wheel, { passive: false });
    surface.addEventListener('keydown', keyDown);
    return () => {
      surface.removeEventListener('pointerdown', pointerDown);
      surface.removeEventListener('pointermove', pointerMove);
      surface.removeEventListener('pointerup', pointerUp);
      surface.removeEventListener('pointercancel', pointerCancel);
      surface.removeEventListener('lostpointercapture', lostCapture);
      surface.removeEventListener('click', click, true);
      surface.removeEventListener('wheel', wheel);
      surface.removeEventListener('keydown', keyDown);
      surface.style.touchAction = previousTouchAction; stopTween(); stopPointer();
    };
  }, [publish, stopPointer, stopTween]);

  return { pose, poseRef, surfaceRef, goTo, jumpTo, reset, dragging };
}
