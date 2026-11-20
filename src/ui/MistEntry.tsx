import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createMistPainter } from './mistPaint';
import { createMistBrush } from './mistBrush';
import type { MistPhase } from './mistBrush';
import { startMistHandTracking } from './mistHandTracking';
import type { MistHandError } from './mistHandTracking';
import '../styles/mist-entry.css';

type Mode = 'invite' | 'starting' | 'camera' | 'error' | 'pointer';
type Props = {
  width: number; height: number; anchor: { x: number; y: number };
  onGreet: (side: number) => void; onEnter: () => void;
};
const errors: Record<MistHandError, string> = {
  permission: 'Camera access is off. Allow it in your browser or use your pointer.',
  unavailable: 'No camera is available here. Connect one or use your pointer.',
  busy: 'The camera is busy. Close the other camera app and try again.',
  tracking: 'Hand tracking couldn’t start. Try again or use your pointer.',
};
function CameraIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="13.5" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3"/></svg>;
}

export function MistEntry({ width, height, anchor, onGreet, onEnter }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const entryButton = useRef<HTMLButtonElement>(null);
  const fingertip = useRef<HTMLSpanElement>(null);
  const session = useRef<AbortController | null>(null);
  const brush = useRef<ReturnType<typeof createMistBrush> | null>(null);
  const glass = useRef<ReturnType<typeof createMistPainter> | null>(null);
  const modeRef = useRef<Mode>('invite');
  const lastSeen = useRef(-Infinity);
  const lostHandTimer = useRef<number | undefined>(undefined);
  const greetingSide = useRef(1);
  const handCanEnter = useRef(false);
  const pointedSince = useRef<number | null>(null);
  const leaving = useRef(false);
  const exitTimer = useRef<number | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('invite');
  const [phase, setPhase] = useState<MistPhase>('waiting');
  const [handSeen, setHandSeen] = useState(false);
  const [message, setMessage] = useState('');
  const [restart, setRestart] = useState(0);
  const { x: orbX, y: orbY } = anchor;
  const chooseMode = useCallback((value: Mode) => { modeRef.current = value; setMode(value); }, []);
  const clearPointing = useCallback(() => {
    pointedSince.current = null;
    entryButton.current?.style.removeProperty('--hold');
  }, []);
  const hideFingertip = useCallback(() => {
    if (fingertip.current) fingertip.current.hidden = true;
    clearPointing();
    setHandSeen(false);
  }, [clearPointing]);
  const cancelCamera = useCallback(() => {
    const active = session.current;
    session.current = null;
    active?.abort();
    lastSeen.current = -Infinity;
    window.clearTimeout(lostHandTimer.current);
    hideFingertip();
  }, [hideFingertip]);
  const changeInput = (value: 'invite' | 'pointer') => {
    if (leaving.current) return;
    chooseMode(value);
    cancelCamera();
    brush.current?.lift();
    setMessage('');
    setRestart(n => n + 1);
  };
  const enter = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    const finish = () => { cancelCamera(); onEnter(); };
    if (modeRef.current !== 'camera' && modeRef.current !== 'pointer') {
      finish();
      return;
    }
    brush.current?.lift();
    onGreet(greetingSide.current);
    setPhase('opening');
    exitTimer.current = window.setTimeout(finish, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 830);
  }, [onEnter, onGreet, cancelCamera]);

  const enableCamera = () => {
    const element = video.current, surface = canvas.current;
    if (!element || !surface || session.current || leaving.current) return;
    const active = new AbortController();
    session.current = active;
    setMessage('');
    setRestart(n => n + 1);
    chooseMode('starting');
    const current = () => session.current === active && !active.signal.aborted && !leaving.current;
    let checkedGlass: typeof glass.current = null;
    const fail = (kind: MistHandError, detail = errors[kind]) => {
      if (!current()) return;
      chooseMode('error');
      cancelCamera();
      brush.current?.lift();
      setMessage(detail);
    };
    void startMistHandTracking({
      video: element, signal: active.signal,
      bounds: () => ({ width: surface.clientWidth, height: surface.clientHeight }),
      onReady: () => {
        if (!current() || !glass.current) return;
        // Paint before the same video element can ever become visible, including on retries.
        glass.current.setMirror(true);
        glass.current.render(0, performance.now());
        chooseMode('camera');
      },
      onSample: point => {
        if (!current()) return;
        const now = performance.now();
        const previousSample = lastSeen.current;
        const contact = brush.current?.sample(point, true, now);
        if (!point || !contact || !glass.current) { clearPointing(); return; }
        // Check the presented fog canvas once per backing store. No camera pixels
        // are read. A tracking result alone cannot confirm a visible first mark.
        if (checkedGlass !== glass.current) {
          const px = Math.min(surface.width - 1, Math.max(0, Math.floor(contact.x * surface.width / surface.clientWidth)));
          const py = Math.min(surface.height - 1, Math.max(0, Math.floor(contact.y * surface.height / surface.clientHeight)));
          const ctx = surface.getContext('2d');
          if (!ctx || ctx.isContextLost?.() || ctx.getImageData(px, py, 1, 1).data[3] > 32) {
            fail('tracking', 'Your hand was found, but the glass couldn’t clear. Try the camera again.');
            return;
          }
          checkedGlass = glass.current;
        }
        lastSeen.current = now;
        const rim = fingertip.current;
        if (rim) {
          const diameter = contact.radius * 2;
          rim.style.width = rim.style.height = diameter + 'px';
          rim.style.transform = `translate(${contact.x - contact.radius}px, ${contact.y - contact.radius}px)`;
          rim.hidden = false;
        }
        setHandSeen(true);
        window.clearTimeout(lostHandTimer.current);
        lostHandTimer.current = window.setTimeout(hideFingertip, 320);
        const button = entryButton.current;
        if (!handCanEnter.current || !button) return;
        const origin = surface.getBoundingClientRect();
        const target = button.getBoundingClientRect();
        const x = point.x + origin.left, y = point.y + origin.top;
        if (x < target.left || x > target.right || y < target.top || y > target.bottom) {
          if (pointedSince.current !== null) clearPointing();
          return;
        }
        // A deliberate hold on the visible control is also a way in with the camera.
        if (pointedSince.current === null || now - previousSample > 240) pointedSince.current = now;
        const held = Math.min(1, (now - pointedSince.current) / 1350);
        button.style.setProperty('--hold', String(held));
        if (held === 1) enter();
      },
      onError: fail,
    }).catch(() => fail('tracking'));
  };

  useEffect(() => {
    const pause = () => {
      if (!document.hidden || !session.current) return;
      cancelCamera();
      if (!leaving.current) {
        chooseMode('invite');
        setMessage('Camera paused while you were away.');
        setRestart(n => n + 1);
      }
    };
    document.addEventListener('visibilitychange', pause);
    return () => {
      document.removeEventListener('visibilitychange', pause);
      session.current?.abort();
      session.current = null;
      window.clearTimeout(exitTimer.current);
      window.clearTimeout(lostHandTimer.current);
    };
  }, [cancelCamera, chooseMode]);

  useLayoutEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    const painter = createMistPainter(surface, width, height, { x: orbX, y: orbY });
    glass.current = painter;
    painter.setMirror(modeRef.current === 'camera');
    painter.render(0, performance.now());
    let found: number | null = null;
    let frame = 0;
    let paintedAt = -Infinity;
    handCanEnter.current = false;
    clearPointing();
    if (!leaving.current) setPhase('waiting');
    const controller = createMistBrush(painter, { x: orbX, y: orbY }, width, side => {
      if (leaving.current) return;
      greetingSide.current = side;
      found = performance.now();
      handCanEnter.current = modeRef.current === 'camera';
      setPhase('found');
      if (modeRef.current === 'pointer') onGreet(side);
    });
    brush.current = controller;
    const draw = (now: number) => {
      if (modeRef.current !== 'camera' && !document.hidden && !leaving.current && now - paintedAt >= 16) {
        paintedAt = now;
        if (modeRef.current === 'pointer') painter.beckon(found === null ? 0 : Math.min(1, (now - found) / 900));
        painter.render(0, now);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const pointer = (event: PointerEvent) => {
      if (leaving.current || modeRef.current !== 'pointer' || !event.isPrimary || (event.pointerType === 'touch' && !event.buttons)) return;
      const rect = surface.getBoundingClientRect();
      const radius = Math.max(39, Math.min(82, height * .103, width * .08));
      controller.sample({ x: event.clientX - rect.left, y: event.clientY - rect.top, radius }, false, performance.now());
    };
    const releasePointer = () => { if (modeRef.current === 'pointer') controller.lift(); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('button,a,input,textarea,select')) return;
      event.preventDefault();
      enter();
    };
    surface.addEventListener('pointermove', pointer);
    surface.addEventListener('pointerdown', pointer);
    surface.addEventListener('pointerleave', releasePointer);
    surface.addEventListener('pointercancel', releasePointer);
    surface.addEventListener('pointerup', releasePointer);
    window.addEventListener('keydown', keyboard);
    return () => {
      cancelAnimationFrame(frame);
      brush.current = null;
      glass.current = null;
      surface.removeEventListener('pointermove', pointer);
      surface.removeEventListener('pointerdown', pointer);
      surface.removeEventListener('pointerleave', releasePointer);
      surface.removeEventListener('pointercancel', releasePointer);
      surface.removeEventListener('pointerup', releasePointer);
      window.removeEventListener('keydown', keyboard);
    };
  }, [width, height, orbX, orbY, restart, onGreet, enter, clearPointing]);

  const invitation = mode === 'invite' || mode === 'starting' || mode === 'error';
  let instruction = 'Brush the mist aside.';
  if (mode === 'camera') {
    instruction = handSeen ? 'Trace a line on the glass.' : 'Hold up one hand, fingers in view.';
  }
  if (phase === 'found' && (handSeen || mode === 'pointer')) instruction = 'The glass is yours to draw on.';

  return <section className="mist-entry" data-no-journey data-mode={mode} data-phase={phase}
    data-hand={handSeen ? 'seen' : 'searching'} aria-label="The mist at the garden entrance">
    <div className="mist-landscape" aria-hidden="true"/>
    <div className="mist-window">
      <div className="mist-reflection" aria-hidden="true"><video ref={video} muted playsInline autoPlay/></div>
      <canvas className="mist-veil" ref={canvas} data-orb-x={Math.round(orbX)} data-orb-y={Math.round(orbY)} aria-hidden="true"/>
      <span className="mist-fingertip" ref={fingertip} hidden aria-hidden="true"/>
    </div>
    {invitation ? <div className="mist-invitation">
      <h1>Through the mist.</h1>
      <p className="mist-invite-line" role="status">{message || (mode === 'starting' ? 'Preparing the glass…' : 'Lift a finger to wipe the glass.')}</p>
      <div className="mist-choices">
        <button className="mist-enable" id="mist-enable-camera" type="button" onClick={enableCamera} disabled={mode === 'starting'}>
          <CameraIcon/>{mode === 'starting' ? 'Opening…' : mode === 'error' ? 'Try camera again' : 'Enable camera'}
        </button>
        <button className="mist-alternate" type="button" onClick={() => changeInput('pointer')}>Use pointer</button>
      </div>
    </div> : <div className="mist-caption">
      {mode === 'camera' && <span className="mist-tracking" role="status"><i aria-hidden="true"/>{handSeen ? 'Hand in view' : 'Looking for your hand'}</span>}
      <p className="mist-prompt">{instruction}</p>
      {mode === 'camera' && <button className="mist-stop" type="button" onClick={() => changeInput('invite')}><CameraIcon/>Turn camera off</button>}
    </div>}
    <button type="button" ref={entryButton} className="mist-enter" id="enter-garden" onClick={enter}>
      <span>Enter the garden <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 13 13 3M4 3h9v9"/></svg></span>
      {mode === 'camera' && phase === 'found' && <small>Click or hold your fingertip here</small>}
    </button>
  </section>;
}
