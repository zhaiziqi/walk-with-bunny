import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { content } from './config/content';
import { GraphicsBoundary } from './scene/GraphicsBoundary';
import { viewFromHash } from './state/experience';
import type { View } from './state/experience';
import { useAssets } from './scene/useAssets';
import { StaticGarden } from './scene/StaticGarden';
import { useMedia, usePageVisible, useWindowSize } from './motion/preferences';
import { useMeadowJourney, SHARED_RABBIT_FOOT_OFFSET } from './motion/useMeadowJourney';
import { objects, project, HOME, focusPose, duskAt, objectVisibility, baseScale } from './scene/world';
import { encounterCopy, encounterRadius } from './scene/meadowWorld';
import { meadowScreenFoot } from './scene/meadowMotion';
import type { Place } from './scene/world';
import type { JourneyPose } from './scene/journey';
const GardenCanvas = lazy(() => import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === 'chunk-error'
  ? Promise.reject(new Error('Intentional QA graphics-module failure')) : import('./scene/GardenCanvas'));
function Icon({ type, size = 20 }: { type: 'flower' | 'arrow' | 'back' | 'music' | 'leaf' | 'sun'; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    flower: <><path d="M12 8C5-2 1 9 8 11C-2 15 8 22 11 16C15 26 22 16 16 13C26 9 16 1 12 8Z"/><circle cx="12" cy="12" r="2.5"/></>,
    arrow: <path d="M4 12h15m-5-5 5 5-5 5"/>, back: <path d="M20 12H5m5-5-5 5 5 5"/>,
    music: <><path d="M10 17V5l10-2v12M10 8l10-2"/><ellipse cx="6.5" cy="18" rx="3.5" ry="2.5"/><ellipse cx="16.5" cy="16" rx="3.5" ry="2.5"/></>,
    leaf: <><path d="M6 21Q9 11 20 3C22 13 17 19 8 17M7 15C1 13 2 7 2 7Q9 6 10 12"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[type]}</svg>;
}
function detectWebGL() {
  if (new URLSearchParams(location.search).has('static')) return false;
  try { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
}
const names = { puzzle: '信号花圃', music: '音乐花圃', lock: '礼物之门', gift: '礼物之门' };
function validPose(value: unknown): value is JourneyPose {
  return !!value && typeof value === 'object' && 'x' in value && 'y' in value && 'zoom' in value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.zoom);
}
export default function App() {
  const initialView = useRef(viewFromHash(location.hash));
  const [view, setView] = useState<View>(initialView.current);
  const [entered, setEntered] = useState(initialView.current !== 'overview');
  const [bloom, setBloom] = useState(0);
  const [lampOn, setLampOn] = useState(false);
  const [flowerMessage, setFlowerMessage] = useState(false);
  const [webgl, setWebgl] = useState(detectWebGL);
  const [canvasReady, setCanvasReady] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [discovered,setDiscovered]=useState<Place[]>([]);
  const [encounter,setEncounter]=useState<Place|null>(null);
  const systemReduced = useMedia('(prefers-reduced-motion: reduce)');
  const reduced = systemReduced || quiet;
  const visible = usePageVisible();
  const viewport = useWindowSize();
  const size = { width: viewport.width, height: Math.max(420, viewport.height) };
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const close = view !== 'overview';
  const startExploring = useCallback(() => setEntered(true), []);
  const journey = useMeadowJourney({ initialPose: initialView.current === 'overview' ? HOME : focusPose(initialView.current === 'gift' ? 'lock' : initialView.current, size.width, size.height, true), reduced, enabled: !close, entered, onExplore: startExploring, width: size.width, height: size.height });
  const { pose, poseRef, surfaceRef, jumpTo, goTo, dragging, moving, heading, destination } = journey;
  const assets = useAssets();
  const title = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const returnFocus = useRef('journey-surface');
  const panelOrigin = useRef<JourneyPose | null>(null);
  const actorPose=close?(panelOrigin.current??pose):pose;
  const actor={x:actorPose.x,y:actorPose.y-SHARED_RABBIT_FOOT_OFFSET};
  const foot=meadowScreenFoot(size.width,size.height,baseScale(size.width,size.height)*pose.zoom);
  const encounterTimer=useRef<number|undefined>(undefined);
  const lastView = useRef(view);
  const timer = useRef<number | undefined>(undefined);
  const failGraphics = useCallback(() => { setWebgl(false); setCanvasReady(false); }, []);
  const markReady = useCallback(() => setCanvasReady(true), []);
  const canvasActive = assets.ready && !!assets.images.environment && webgl && !reduced;
  const writeHistory = useCallback((next: View, nextPose = poseRef.current) => {
    history.pushState({ journey: { ...nextPose }, returnJourney: next === 'overview' ? null : panelOrigin.current, entered: true }, '', next === 'overview' ? '#garden' : `#${next}`);
  }, [poseRef]);
  const openPlace = useCallback((place: Place, origin: string) => {
    history.replaceState({ journey: { ...poseRef.current }, entered: true }, '', location.href);
    returnFocus.current = origin;
    panelOrigin.current = { ...poseRef.current };
    const target = focusPose(place, size.width, size.height, true);
    goTo(target);
    setEntered(true);
    setMenuOpen(false);
    setView(place);
    writeHistory(place, target);
  }, [goTo, poseRef, writeHistory, size.width, size.height]);
  const closePanel = useCallback(() => {
    const restored = panelOrigin.current ?? poseRef.current;
    jumpTo(restored);
    panelOrigin.current = null;
    setView('overview');
    writeHistory('overview', restored);
    requestAnimationFrame(() => (document.getElementById(returnFocus.current) ?? surfaceRef.current)?.focus({ preventScroll: true }));
  }, [writeHistory, surfaceRef, jumpTo, poseRef]);
  const returnToEntry = () => {
    setView('overview');
    setEntered(false);
    setMenuOpen(false);
    setEncounter(null);
    jumpTo(HOME);
    history.pushState({ journey: { ...HOME }, entered: false }, '', '#garden');
    surfaceRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const sync = () => {
      const next = viewFromHash(location.hash);
      const saved = history.state?.journey;
      panelOrigin.current = validPose(history.state?.returnJourney) ? { ...history.state.returnJourney } : null;
      if (validPose(saved)) jumpTo(saved);
      else if (next !== 'overview') jumpTo(focusPose(next === 'gift' ? 'lock' : next, sizeRef.current.width, sizeRef.current.height, true));
      setView(next);
      if (next === 'overview' && lastView.current !== 'overview') requestAnimationFrame(() => (document.getElementById(returnFocus.current) ?? surfaceRef.current)?.focus({ preventScroll: true }));
      setEntered(next !== 'overview' || history.state?.entered === true);
      if (location.hash === '#gift') history.replaceState(history.state, '', '#lock');
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, [jumpTo, surfaceRef]);
  useEffect(() => { lastView.current = view; }, [view]);
  useEffect(() => {
    if (close) title.current?.focus({ preventScroll: true });
  }, [close, view]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!close) return;
      if (event.key === 'Escape') { event.preventDefault(); closePanel(); }
      if (event.key === 'Tab') {
        const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex="0"]') ?? [])];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === title.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === title.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [close, closePanel]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(()=>{
    if(!entered||close)return;
    const nearby=objects.find(object=>Math.hypot(object.x-actor.x,object.y-actor.y)<encounterRadius);
    if(!nearby||discovered.includes(nearby.id))return;
    setDiscovered(current=>[...current,nearby.id]);
    setEncounter(nearby.id);
    window.clearTimeout(encounterTimer.current);
    encounterTimer.current=window.setTimeout(()=>setEncounter(null),4200);
  },[actor.x,actor.y,entered,close,discovered]);
  useEffect(()=>()=>window.clearTimeout(encounterTimer.current),[]);
  const touchFlower = () => {
    setBloom(count => count + 1);
    setFlowerMessage(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlowerMessage(false), 3200);
  };
  const dusk = duskAt(pose);
  const travelTo = (place: Place) => {
    setMenuOpen(false); const object=objects.find(item=>item.id===place)!;
    goTo({...focusPose(place,size.width,size.height),x:object.x+130,y:object.y+130});
  };
  const worldNavigation = (
      <nav className="landmarks" aria-label="花园中的物件">
        {objects.map(object => {
          const point = project(object.x, object.y, pose, size.width, size.height, object.z);
          const objectWidth = object.width * point.scale, objectHeight = object.height * point.scale;
          const enoughVisible = objectVisibility(object, pose, size.width, size.height) > .5;
          if (!enoughVisible) return null;
          return <button key={object.id} id={`landmark-${object.id}`} data-world-object className={`landmark landmark-${object.id}`} aria-label={`查看${names[object.id]}`}
            style={{ zIndex: Math.round(5000 - point.depth), left: point.x, top: point.y - objectHeight + object.footInset * point.scale, width: Math.max(70, objectWidth), height: objectHeight + 54 }}
            onClick={() => openPlace(object.id, `landmark-${object.id}`)}>
            <span className="object-outline"/><span className="landmark-label"><span>{names[object.id]}</span><Icon type="arrow" size={14}/></span>
          </button>;
        })}
      </nav>
  );
  return <main className={`garden-app ${entered ? 'is-exploring' : ''} ${close ? 'is-reading' : ''} ${dragging ? 'is-dragging' : ''} ${reduced ? 'reduced-motion' : ''} ${!visible ? 'page-hidden' : ''}`}
    style={{ '--dusk': dusk } as React.CSSProperties} data-view={view} data-moving={moving&&!close} data-discovered={discovered.join(',')} data-actor-x={actor.x.toFixed(6)} data-actor-y={actor.y.toFixed(6)} data-camera-x={pose.x.toFixed(6)} data-camera-y={pose.y.toFixed(6)} data-camera-zoom={pose.zoom.toFixed(6)} data-renderer={canvasActive && canvasReady ? 'webgl' : 'static'}>
    <div className="art-stage">
      {(!canvasActive || !canvasReady) && <StaticGarden images={assets.images} pose={pose} width={size.width} height={size.height} bloom={bloom} lampOn={lampOn} entered={entered} actor={actor} heading={heading} discovered={discovered}/>}
      {canvasActive && <div className={`canvas-stage ${canvasReady ? 'ready' : ''}`}><GraphicsBoundary onFail={failGraphics}><Suspense fallback={null}><GardenCanvas images={assets.images} pose={pose} bloom={bloom} lampOn={lampOn} visible={visible} reading={close} entered={entered} actor={actor} moving={moving} heading={heading} discovered={discovered} onFail={failGraphics} onReady={markReady}/></Suspense></GraphicsBoundary></div>}
      <div className="dusk-veil"/><div className="paper-grain"/>
      {entered&&<div className="meadow-atmosphere"/>}
    </div>
    <div ref={surfaceRef} id="journey-surface" className="journey-surface" role="region" aria-label="花园：按住鼠标指引小兔，拖动改变方向，松手停下；方向键和滚轮也可移动" tabIndex={close ? -1 : 0} aria-hidden={close || undefined}>{!close && worldNavigation}</div>
    {destination&&!close&&<svg className="walking-guide" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true"><path d={`M${foot.x} ${foot.y} Q${(foot.x+destination.x)/2} ${Math.min(foot.y,destination.y)-35} ${destination.x} ${destination.y}`}/><circle cx={destination.x} cy={destination.y} r="11"/><circle className="guide-dot" cx={destination.x} cy={destination.y} r="2"/></svg>}
    <header className="site-header" inert={close || undefined}>
      <a className="wordmark" href="#garden" onClick={event => { event.preventDefault(); returnToEntry(); }} aria-label="秘密花园，回到入口"><span className="mark"><Icon type="leaf" size={23}/></span><span>秘密花园<small>A LITTLE WORLD FOR YOU</small></span></a>
      <div className="header-actions"><button className="music-shortcut" id="music-shortcut" onClick={() => openPlace('music', 'music-shortcut')}><Icon type="music" size={18}/><span>我来点歌</span></button><button className="motion-toggle" aria-label="减少动态效果" aria-pressed={reduced} onClick={() => setQuiet(value => !value)}><Icon type={reduced ? 'leaf' : 'sun'}/></button></div>
    </header>
    {!entered && !close && <section className="welcome" aria-label="花园邀请">
      <div className="eyebrow"><span/> A SECRET GARDEN <span/></div>
      <h1>{content.site.welcome.title}</h1><p>一只小兔，替我等你。</p>
      <button className="primary-button" id="enter-garden" onClick={() => { setEntered(true); surfaceRef.current?.focus({ preventScroll: true }); }}>跟着小兔出发<Icon type="arrow"/></button>
    </section>}
    {!close && <>
      {entered && <div className="wayfinding"><button className="entry-back" onClick={returnToEntry} aria-label="回到花园入口"><Icon type="back" size={17}/><span>回到入口</span></button></div>}
      {entered&&encounter&&<p className="encounter-whisper" role="status">{encounterCopy[encounter]}</p>}

      {entered && <>
        <section className={`explore-dock ${menuOpen ? 'menu-open' : ''}`} aria-label="花园导览">
          <div className="pan-hint">按住前行 · 拖动转向 · 松手停留 <span>·</span><button className="menu-toggle" aria-expanded={menuOpen} aria-controls="garden-nav" onClick={() => setMenuOpen(value => !value)}>去哪里</button></div>
          <nav id="garden-nav" className="garden-nav" aria-label="发现花园">
            <button onClick={() => travelTo('puzzle')}>花灯</button>
            <button onClick={() => travelTo('music')}>听花</button>
            <button onClick={() => travelTo('lock')}>小门</button>
          </nav>
        </section>
      </>}
      {!entered && <div className="first-hint"><span>✥</span> 按住鼠标，让小兔带你慢慢逛</div>}
    </>}
    {close && <>
      <div className="reading-shade"/>
      <section ref={panel} className="content-panel" role="dialog" aria-modal="true" aria-labelledby="scene-title" data-no-journey>
        <div className="panel-topline"><span className="panel-eyebrow">{view === 'puzzle' ? '01' : view === 'music' ? '02' : '03'} / {names[view]}</span><button className="close-control" onClick={closePanel} aria-label="关闭内容，回到刚才的位置">×</button></div>
        <h1 id="scene-title" tabIndex={-1} ref={title}>{view === 'puzzle' ? '让小灯，回应你。' : view === 'music' ? '和花打个招呼。' : '期待，在门的那边。'}</h1>
        {view === 'puzzle' ? <>
          <p className="panel-description">靠近一点，和花园里的光打个招呼。</p>
          <button className="primary-button panel-action" aria-pressed={lampOn} onClick={() => setLampOn(value => !value)}><Icon type="sun" size={18}/>{lampOn ? '让光柔和一点' : '让小灯再亮一点'}<Icon type="arrow" size={18}/></button>
          <p className="response-copy" role="status">{lampOn ? '小灯亮了。你可以留在这里，也可以继续走。' : '轻轻一点，就会有回应。'}</p>
        </> : view === 'music' ? <>
          <p className="panel-description">轻碰这朵花，它会向你点点头。</p><button className="primary-button panel-action" onClick={touchFlower}><Icon type="flower" size={18}/>碰一碰粉花<Icon type="arrow" size={18}/></button><p className="response-copy" role="status">{flowerMessage ? '它轻轻摇了摇，像在说：你好。' : '不着急，在这里多停一会儿。'}</p>
        </> : <p className="panel-description door-note">门前的小路，通向一份心意。<br/>等准备好了，再轻轻打开。</p>}
        <div className="panel-bottom"><small>{view === 'puzzle' ? '美术样片 · 完整信号谜题待接入' : view === 'music' ? '美术样片 · 点歌待接入' : '美术样片 · 礼物待接入'}</small><button className="resume-button" onClick={closePanel}>继续散步 <Icon type="arrow" size={14}/></button></div>
      </section>
    </>}
    {!entered && <footer className="site-footer"><span>为你，慢慢生长</span><Icon type="leaf" size={16}/></footer>}
    {import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === 'context-loss' && <button className="qa-button" onClick={() => { const gl = document.querySelector('canvas')?.getContext('webgl2'); gl?.getExtension('WEBGL_lose_context')?.loseContext(); }}>模拟图形失效</button>}
    {!assets.ready && <div className="load-status" role="status">正在迎接花与微风 · {assets.settled}/{assets.total}</div>}
    {assets.ready && (assets.failed.length > 0 || !webgl) && <p className="fallback-note" role="status">静态花园 · 仍可自由探索</p>}
  </main>;
}
