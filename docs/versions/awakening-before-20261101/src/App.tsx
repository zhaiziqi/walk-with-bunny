import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { content } from './config/content';
import { GraphicsBoundary } from './scene/GraphicsBoundary';
import { viewFromHash } from './state/experience';
import type { View } from './state/experience';
import { useAssets } from './scene/useAssets';
import { StaticGarden } from './scene/StaticGarden';
import { useMedia, usePageVisible, useWindowSize } from './motion/preferences';
import { useMeadowJourney } from './motion/useMeadowJourney';
import { objects, project, HOME, objectVisibility } from './scene/world';
import { encounterCopy, encounterRadius } from './scene/meadowWorld';
import { depthProject, depthFocusPose as focusPose, depthVisibility } from './scene/depthWorld';
import type { MeadowPoint } from './scene/meadowMotion';
import type { Place } from './scene/world';
import type { JourneyPose } from './scene/journey';
import { regionAt, regionAtmosphere } from './scene/gardenAtlas';
import type { GardenRegion, RegionId } from './scene/gardenAtlas';
import { atlasEncounterSites } from './scene/atlasInteraction';
import type { AtlasPulse } from './scene/atlasInteraction';
import { GardenMap } from './scene/GardenMap';
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
  const [visited,setVisited]=useState<RegionId[]>(['entry']);
  const [atlasPulse,setAtlasPulse]=useState<AtlasPulse>(null);
  const [discovered,setDiscovered]=useState<Place[]>([]);
  const [encounter,setEncounter]=useState<Place|null>(null);
  const [worldEvents,setWorldEvents]=useState<string[]>([]);
  const seenWorldEvents=useRef(new Set<string>());
  const [worldNotice,setWorldNotice]=useState('');
  const worldNoticeTimer=useRef<number|undefined>(undefined);
  const onWorldEvent=useCallback((event:string)=>{
    if(seenWorldEvents.current.has(event))return;seenWorldEvents.current.add(event);
    setWorldEvents(current=>[...current,event]);
    const copy:Record<string,string>={'butterfly-flight':'蝴蝶好像想带你去什么地方。','pond-ripple':'连水面，也听见了你的脚步。','stones-awake':'安静一会儿，小路会告诉你方向。',...Object.fromEntries(atlasEncounterSites.map(site=>[site.event,site.hint]))};
    if(copy[event]){setWorldNotice(copy[event]);window.clearTimeout(worldNoticeTimer.current);worldNoticeTimer.current=window.setTimeout(()=>setWorldNotice(''),4200);}
  },[]);
  const systemReduced = useMedia('(prefers-reduced-motion: reduce)');
  const reduced = systemReduced || quiet;
  const visible = usePageVisible();
  const viewport = useWindowSize();
  const size = { width: viewport.width, height: Math.max(420, viewport.height) };
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const close = view !== 'overview';
  const startExploring = useCallback(() => {setEntered(true);history.replaceState({...history.state,entered:true},'',location.hash||'#garden');}, []);
  const journey = useMeadowJourney({ initialPose: initialView.current === 'overview' ? HOME : focusPose(initialView.current === 'gift' ? 'lock' : initialView.current, size.width, size.height, true), reduced, enabled: !close, entered, onExplore: startExploring, width: size.width, height: size.height });
  const { pose, poseRef, surfaceRef, jumpTo, goTo, dragging, moving, heading:walkingHeading, actor:walkingActor, actorRef } = journey;
  const assets = useAssets();
  const title = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const returnFocus = useRef('journey-surface');
  const panelOrigin = useRef<JourneyPose | null>(null);
  const panelActor=useRef<MeadowPoint|null>(null);
  const panelHeading=useRef<MeadowPoint|null>(null);
  const heading=close?(panelHeading.current??walkingHeading):walkingHeading;
  const actor=close?(panelActor.current??walkingActor):walkingActor;
  const encounterTimer=useRef<number|undefined>(undefined);
  const lastView = useRef(view);
  const timer = useRef<number | undefined>(undefined);
  const failGraphics = useCallback(() => { setWebgl(false); setCanvasReady(false); }, []);
  const markReady = useCallback(() => setCanvasReady(true), []);
  const canvasActive = assets.ready && !!assets.images.environment && webgl && !reduced;
  const writeHistory = useCallback((next: View, nextPose = poseRef.current, nextHeading = walkingHeading) => {
    history.pushState({ journey: { ...nextPose }, returnJourney: next === 'overview' ? null : panelOrigin.current, actor: {...actorRef.current}, heading: {...nextHeading}, returnHeading: next === 'overview' ? null : panelHeading.current, returnActor: next === 'overview' ? null : panelActor.current, entered: true }, '', next === 'overview' ? '#garden' : `#${next}`);
  }, [poseRef,actorRef,walkingHeading]);
  const openPlace = useCallback((place: Place, origin: string) => {
    history.replaceState({ journey: { ...poseRef.current }, actor:{...actorRef.current}, heading:{...walkingHeading}, entered: true }, '', location.href);
    returnFocus.current = origin;
    panelOrigin.current = { ...poseRef.current };
    panelActor.current = {...actorRef.current};
    panelHeading.current = {...walkingHeading};
    const target = focusPose(place, size.width, size.height, true);
    goTo(target);
    setEntered(true);
    setMenuOpen(false);
    setView(place);
    writeHistory(place, target);
  }, [goTo, poseRef, actorRef, walkingHeading, writeHistory, size.width, size.height]);
  const closePanel = useCallback(() => {
    const restored = panelOrigin.current ?? poseRef.current;
    const restoredHeading=panelHeading.current??walkingHeading;
    jumpTo(restored,panelActor.current??undefined,panelHeading.current??undefined);
    panelOrigin.current = null;
    panelActor.current = null;
    panelHeading.current = null;
    setView('overview');
    writeHistory('overview', restored, restoredHeading);
    requestAnimationFrame(() => (document.getElementById(returnFocus.current) ?? surfaceRef.current)?.focus({ preventScroll: true }));
  }, [writeHistory, surfaceRef, jumpTo, poseRef,walkingHeading]);
  const returnToEntry = () => {
    setView('overview');
    setEntered(false);
    setMenuOpen(false);
    setEncounter(null);
    setWorldNotice('');window.clearTimeout(worldNoticeTimer.current);
    window.clearTimeout(encounterTimer.current);
    panelActor.current=null;
    jumpTo(HOME);
    history.pushState({ journey: { ...HOME }, entered: false }, '', '#garden');
    surfaceRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const sync = () => {
      const next = viewFromHash(location.hash);
      const saved = history.state?.journey;
      panelOrigin.current = validPose(history.state?.returnJourney) ? { ...history.state.returnJourney } : null;
      panelActor.current=history.state?.returnActor??null;
      panelHeading.current=history.state?.returnHeading??null;
      if (validPose(saved)) jumpTo(saved,history.state?.actor,history.state?.heading);
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
  useEffect(() => {
    if(!entered||close||moving)return;
    history.replaceState({journey:{...pose},actor:{...walkingActor},heading:{...walkingHeading},entered:true},'',location.href);
  },[entered,close,moving,pose,walkingActor,walkingHeading]);
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
  useEffect(()=>()=>{window.clearTimeout(encounterTimer.current);window.clearTimeout(worldNoticeTimer.current);},[]);
  const touchFlower = () => {
    setBloom(count => count + 1);
    setFlowerMessage(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlowerMessage(false), 3200);
  };
  const region=regionAt(actor.x,actor.y),atmosphere=regionAtmosphere(close?pose.x:actor.x,close?pose.y-220:actor.y),dusk=atmosphere.dusk;
  const nearbySite=atlasEncounterSites.find(site=>Math.hypot(site.x-actor.x,site.y-actor.y)<site.radius);
  const activateSite=useCallback(()=>{if(canvasActive&&nearbySite&&!close&&!moving)setAtlasPulse(current=>({id:nearbySite.id,serial:(current?.serial??0)+1}));},[canvasActive,nearbySite,close,moving]);
  useEffect(()=>{if(entered&&!close&&!moving&&!visited.includes(region.id)&&Math.hypot(actor.x-region.x,actor.y-region.y)<region.radius*.7)setVisited(current=>[...current,region.id]);},[entered,close,moving,region,visited,actor.x,actor.y]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(!nearbySite||close||moving||!entered||event.repeat||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||(event.target instanceof Element&&event.target.closest('button,a,input,textarea')))return;if(event.code==='KeyE'||event.code==='Space'){event.preventDefault();activateSite();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[nearbySite,close,moving,entered,activateSite]);
  const travelTo=(place:GardenRegion)=>{setMenuOpen(false);jumpTo({x:place.x+80,y:place.y+(place.id==='pond'?-100:80),zoom:1});surfaceRef.current?.focus({preventScroll:true});};
  const color=(v:number[])=>v.map(n=>Math.round(n*255)).join(',');
  const worldNavigation = (
      <nav className="landmarks" aria-label="花园中的物件">
        {objects.map(object => {
          const point = entered?depthProject(object.x,object.y,pose,size.width,size.height):project(object.x, object.y, pose, size.width, size.height, object.z);
          const objectWidth = object.width * point.scale, objectHeight = object.height * point.scale;
          const enoughVisible = entered ? depthVisibility(object,pose,size.width,size.height)>.35 && Math.hypot(actor.x-object.x,actor.y-object.y)<360 : objectVisibility(object, pose, size.width, size.height) > .5;
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
    style={{ '--dusk': dusk,'--region-sky':color(atmosphere.sky),'--region-fog':color(atmosphere.fog) } as React.CSSProperties} data-region={region.id} data-visited={visited.join(',')} data-atlas-pulse={atlasPulse?`${atlasPulse.id}:${atlasPulse.serial}`:''} data-entered={entered} data-heading-x={heading.x.toFixed(6)} data-heading-y={heading.y.toFixed(6)} data-world-events={worldEvents.join(",")} data-view={view} data-moving={moving&&!close} data-discovered={discovered.join(',')} data-actor-x={actor.x.toFixed(6)} data-actor-y={actor.y.toFixed(6)} data-camera-x={pose.x.toFixed(6)} data-camera-y={pose.y.toFixed(6)} data-camera-zoom={pose.zoom.toFixed(6)} data-renderer={canvasActive && canvasReady ? 'webgl' : 'static'}>
    <div className="art-stage">
      {entered&&<div className="exploration-sky"/>}
      {(!canvasActive || !canvasReady) && <StaticGarden reading={close} images={assets.images} pose={pose} width={size.width} height={size.height} bloom={bloom} lampOn={lampOn} entered={entered} actor={actor} heading={heading} discovered={discovered}/>}
      {canvasActive && <div className={`canvas-stage ${canvasReady ? 'ready' : ''}`}><GraphicsBoundary onFail={failGraphics}><Suspense fallback={null}><GardenCanvas images={assets.images} pose={pose} bloom={bloom} lampOn={lampOn} visible={visible} reading={close} entered={entered} actor={actor} moving={moving} heading={heading} discovered={discovered} onWorldEvent={onWorldEvent} atlasPulse={atlasPulse} onFail={failGraphics} onReady={markReady}/></Suspense></GraphicsBoundary></div>}
      <div className="dusk-veil"/><div className="paper-grain"/>
      {entered&&<div className="meadow-atmosphere"/>}
    </div>
    <div ref={surfaceRef} id="journey-surface" className="journey-surface" inert={close || undefined} role="region" aria-label="花园：按住鼠标指引小兔，拖动改变方向，松手停下；方向键和滚轮也可移动" tabIndex={close ? -1 : 0} aria-hidden={close || undefined}>{!close && worldNavigation}</div>

    <header className="site-header" inert={close || undefined}>
      <a className="wordmark" href="#garden" onClick={event => { event.preventDefault(); returnToEntry(); }} aria-label="秘密花园，回到入口"><span className="mark"><Icon type="leaf" size={23}/></span><span>秘密花园<small>A LITTLE WORLD FOR YOU</small></span></a>
      {entered&&!close&&<span className="current-region">{region.name}</span>}
      <div className="header-actions"><button className="music-shortcut" id="music-shortcut" onClick={() => openPlace('music', 'music-shortcut')}><Icon type="music" size={18}/><span>我来点歌</span></button><button className="motion-toggle" aria-label="减少动态效果" aria-pressed={reduced} onClick={() => setQuiet(value => !value)}><Icon type={reduced ? 'leaf' : 'sun'}/></button></div>
    </header>
    {!entered && !close && <section className="welcome" aria-label="花园邀请">
      <div className="eyebrow"><span/> A SECRET GARDEN <span/></div>
      <h1>{content.site.welcome.title}</h1><p>一只小兔，替我等你。</p>
      <button className="primary-button" id="enter-garden" onClick={() => { startExploring(); surfaceRef.current?.focus({ preventScroll: true }); }}>跟着小兔出发<Icon type="arrow"/></button>
    </section>}
    {!close && <>
      {entered && <div className="wayfinding"><button className="entry-back" onClick={returnToEntry} aria-label="回到花园入口"><Icon type="back" size={17}/><span>回到入口</span></button></div>}
      {entered&&(encounter||worldNotice)&&<p className="encounter-whisper" role="status">{encounter?encounterCopy[encounter]:worldNotice}</p>}

      {entered&&nearbySite&&!moving&&canvasActive&&<button className="encounter-action" onClick={activateSite}>{nearbySite.label}<kbd>E</kbd></button>}
      {entered && <>
        <section className={`explore-dock ${menuOpen ? 'menu-open' : ''}`} aria-label="花园导览">
          <div className="pan-hint">按住前行 · 拖动转向 · 松手停留 <span>·</span><button className="menu-toggle" aria-expanded={menuOpen} aria-controls="garden-map-wrap" onClick={() => setMenuOpen(value => !value)}>小兔的地图</button></div>
          {menuOpen&&<div id="garden-map-wrap"><GardenMap actor={actor} visited={visited} travel={travelTo} onClose={()=>setMenuOpen(false)}/></div>}
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
