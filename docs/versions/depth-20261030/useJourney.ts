import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { clampJourney, dragJourney, keyJourney, wheelJourney, wheelPixels } from '../scene/journey';
import type { JourneyPose } from '../scene/journey';

export type { JourneyPose } from '../scene/journey';

type Options = {
  initialProgress: number;
  reduced: boolean;
  enabled: boolean;
  onExplore: () => void;
};

type PointerStart = { id: number; x: number; y: number; pose: JourneyPose; moved: boolean; worldObject: boolean };

const isWorldObject = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-world-object]');
const isControl = (target: EventTarget | null, allowWorldObject = false) => {
  if (allowWorldObject && isWorldObject(target)) return false;
  return target instanceof Element && !!target.closest(
    'button, a, input, textarea, select, [contenteditable="true"], [role="dialog"], [data-no-journey]',
  );
};

/**
 * One controller owns travel. Native gestures write immediately and never retain velocity.
 * Only explicit goTo/reset actions create a GSAP transition; all input interrupts it.
 */
export function useJourney(options: Options) {
  const [pose, setPose] = useState<JourneyPose>(() => clampJourney({ progress: options.initialProgress, pan: 0 }));
  const [dragging, setDragging] = useState(false);
  const poseRef = useRef(pose);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const pointer = useRef<PointerStart | null>(null);
  const suppressPointerClick = useRef(false);
  const tween = useRef<gsap.core.Tween | null>(null);

  const publish = useCallback((next: JourneyPose) => {
    const safe = clampJourney(next);
    if (safe.progress === poseRef.current.progress && safe.pan === poseRef.current.pan) return;
    poseRef.current = safe;
    setPose(safe);
  }, []);

  const stopTween = useCallback(() => {
    tween.current?.kill();
    tween.current = null;
  }, []);

  const stopPointer = useCallback(() => {
    const active = pointer.current;
    pointer.current = null;
    setDragging(false);
    if (active && surfaceRef.current?.hasPointerCapture(active.id)) {
      surfaceRef.current.releasePointerCapture(active.id);
    }
  }, []);

  const transition = useCallback((progress: number, pan: number, explore: boolean) => {
    stopTween();
    stopPointer();
    if (explore) optionsRef.current.onExplore();
    const target = clampJourney({ progress, pan });
    if (optionsRef.current.reduced) {
      publish(target);
      return;
    }
    const animated = { ...poseRef.current };
    tween.current = gsap.to(animated, {
      ...target,
      duration: 1.25,
      ease: 'power2.inOut',
      onUpdate: () => publish(animated),
      onComplete: () => { publish(target); tween.current = null; },
    });
  }, [publish, stopPointer, stopTween]);

  const goTo = useCallback((progress: number, pan = poseRef.current.pan) => {
    // Readable content pauses travel. Explicit route jumps use jumpTo below.
    if (!optionsRef.current.enabled) return;
    transition(progress, pan, true);
  }, [transition]);

  const reset = useCallback(() => transition(0, 0, false), [transition]);

  const jumpTo = useCallback((progress: number, pan = 0) => {
    stopTween();
    stopPointer();
    publish({ progress, pan });
  }, [publish, stopPointer, stopTween]);

  useEffect(() => {
    if (!options.enabled || options.reduced) {
      stopTween();
      stopPointer();
    }
  }, [options.enabled, options.reduced, stopPointer, stopTween]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    // Single-finger motion belongs to the garden; browser pinch zoom remains available.
    const previousTouchAction = surface.style.touchAction;
    surface.style.touchAction = 'pinch-zoom';

    const pointerDown = (event: PointerEvent) => {
      if (!optionsRef.current.enabled || isControl(event.target, true)) return;
      if (!event.isPrimary) { stopPointer(); return; }
      if (event.button !== 0) return;
      stopTween();
      suppressPointerClick.current = false;
      const worldObject = isWorldObject(event.target);
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pose: { ...poseRef.current }, moved: false, worldObject };
      // A short click must remain addressed to the object button. Capture it only once it becomes a drag.
      if (!worldObject) {
        surface.setPointerCapture(event.pointerId);
        surface.focus({ preventScroll: true });
      }
    };

    const pointerMove = (event: PointerEvent) => {
      const active = pointer.current;
      if (!active || active.id !== event.pointerId || !optionsRef.current.enabled) return;
      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      if (!active.moved && Math.hypot(dx, dy) < 4) return;
      if (!active.moved) {
        active.moved = true;
        suppressPointerClick.current = true;
        if (active.worldObject) {
          surface.setPointerCapture(event.pointerId);
          surface.focus({ preventScroll: true });
        }
        setDragging(true);
        optionsRef.current.onExplore();
      }
      publish(dragJourney(active.pose, dx, dy));
    };

    const pointerUp = (event: PointerEvent) => {
      if (pointer.current?.id !== event.pointerId) return;
      pointerMove(event);
      stopPointer();
    };

    const pointerCancel = (event: PointerEvent) => {
      if (pointer.current?.id === event.pointerId) {
        suppressPointerClick.current = false;
        stopPointer();
      }
    };

    const lostCapture = (event: PointerEvent) => {
      // Transferring touch's implicit capture from an object button to the surface also bubbles here.
      if (event.target === surface) pointerCancel(event);
    };

    const click = (event: MouseEvent) => {
      // Keyboard activation has detail=0 and remains an ordinary, accessible object click.
      if (!suppressPointerClick.current || event.detail === 0) return;
      suppressPointerClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    };

    const wheel = (event: WheelEvent) => {
      if (!optionsRef.current.enabled || event.ctrlKey || event.metaKey || isControl(event.target, true)) return;
      const height = surface.clientHeight || window.innerHeight;
      const dx = wheelPixels(event.deltaX, event.deltaMode, height);
      const dy = wheelPixels(event.deltaY, event.deltaMode, height);
      if (!dx && !dy) return;
      event.preventDefault();
      stopTween();
      stopPointer();
      optionsRef.current.onExplore();
      publish(wheelJourney(poseRef.current, dx, dy));
    };

    const keyDown = (event: KeyboardEvent) => {
      if (!optionsRef.current.enabled || event.ctrlKey || event.metaKey || event.altKey || isControl(event.target)) return;
      const next = keyJourney(poseRef.current, event.key);
      if (!next) return;
      event.preventDefault();
      stopTween();
      stopPointer();
      optionsRef.current.onExplore();
      publish(next);
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
      surface.style.touchAction = previousTouchAction;
      stopTween();
      stopPointer();
    };
  }, [publish, stopPointer, stopTween]);

  return { pose, poseRef, surfaceRef, goTo, jumpTo, reset, dragging };
}
