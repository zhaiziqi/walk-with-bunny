import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GraphicsBoundary } from './scene/GraphicsBoundary';
import { viewFromHash } from './state/experience';
import type { View } from './state/experience';
import { useProgress } from './state/useProgress';
import { SignalPuzzle } from './ui/SignalPuzzle';
import { MusicGarden } from './ui/MusicGarden';
import { GiftDoor, GiftReveal } from './ui/GiftDoor';
import { PreviewTools } from './ui/PreviewTools';
import { NewWalkLink } from './ui/NewWalkLink';
import { newWalkHref } from './lib/walkProgress';
import { content } from './config/content';
import { MotionQA } from './diagnostics/MotionQA';
import { LoadingQA } from './diagnostics/LoadingQA';
import { recordMotionCommit } from './diagnostics/motionMetrics';
import { useAssets } from './scene/useAssets';
import { StaticGarden } from './scene/StaticGarden';
import { useMedia, usePageVisible, useWindowSize } from './motion/preferences';
import { useMeadowJourney } from './motion/useMeadowJourney';
import { useGardenSound } from './motion/useGardenSound';
import { objects, HOME } from './scene/world';
import { encounterCopy, encounterRadius } from './scene/meadowWorld';
import { depthProject, depthFocusPose as focusPose, depthVisibility, landmarkReveal, terrainHeight } from './scene/depthWorld';
import type { MeadowPoint } from './scene/meadowMotion';
import type { Place } from './scene/world';
import type { JourneyPose } from './scene/journey';
import { regionAt, regionAtmosphere } from './scene/gardenAtlas';
import type { GardenRegion, RegionId } from './scene/gardenAtlas';
import { atlasEncounterSites } from './scene/atlasInteraction';
import type { AtlasPulse } from './scene/atlasInteraction';
import { GardenMap } from './scene/GardenMap';
import { firstRouteGuide } from './scene/firstRouteGuide';
import { mainRouteGoal, mainRouteFrom, mainRouteText } from './scene/mainRouteGuide';
import { puzzleDesk } from './scene/puzzleDesk';
import type { PaperGuideState } from './scene/paperGuide';
import type { PondListeningState } from './scene/pondListening';
import type { MushroomListening } from './scene/mushroomListening';
import type { FloofAttention } from './scene/floofAttention';
import type { ChimeListeningState } from './scene/chimeListening';
import { createOrangeRest } from './scene/orangeRest';
import { OrangeRestTarget } from './scene/OrangeRestTarget';
import { RestGiftTarget } from './scene/RestGiftTarget';
import { restGiftHome } from './scene/restGift';
import { RestGift } from './ui/RestGift';
const GardenCanvas = lazy(() => import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === 'chunk-error'
  ? Promise.reject(new Error('Intentional QA graphics-module failure')) : import('./scene/GardenCanvas'));
function Icon({ type, size = 20 }: { type: 'flower' | 'arrow' | 'back' | 'music' | 'leaf' | 'sun' | 'gift'; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    flower: <><path d="M12 8C5-2 1 9 8 11C-2 15 8 22 11 16C15 26 22 16 16 13C26 9 16 1 12 8Z"/><circle cx="12" cy="12" r="2.5"/></>,
    arrow: <path d="M4 12h15m-5-5 5 5-5 5"/>, back: <path d="M20 12H5m5-5-5 5 5 5"/>,
    music: <><path d="M10 17V5l10-2v12M10 8l10-2"/><ellipse cx="6.5" cy="18" rx="3.5" ry="2.5"/><ellipse cx="16.5" cy="16" rx="3.5" ry="2.5"/></>,
    leaf: <><path d="M6 21Q9 11 20 3C22 13 17 19 8 17M7 15C1 13 2 7 2 7Q9 6 10 12"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
    gift: <><path d="M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12M4 8.5h16v4H4Z"/><path className="gift-marker-ribbon" d="M12 8.5V21M12 8.5C7 8.5 5.8 4.9 7.5 3.7c2.1-1.5 4.5 2.7 4.5 4.8Zm0 0c5 0 6.2-3.6 4.5-4.8-2.1-1.5-4.5 2.7-4.5 4.8Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[type]}</svg>;
}
function detectWebGL() {
  if (new URLSearchParams(location.search).has('static')) return false;
  try { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
}
const names = { puzzle: 'The puzzle desk', music: 'The music garden', lock: 'The gift', gift: 'The gift', rest: 'A little gift box' };
function panelPose(view: Exclude<View,'overview'>, width: number, height: number): JourneyPose {
  return view === 'rest' ? { ...restGiftHome } : focusPose(view === 'gift' ? 'lock' : view, width, height, true);
}
function validPose(value: unknown): value is JourneyPose {
  return !!value && typeof value === 'object' && 'x' in value && 'y' in value && 'zoom' in value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.zoom);
}
export default function App() {
  useEffect(() => { recordMotionCommit(); });
  const { progress, dispatch, storageStatus, previewMode, walkId } = useProgress();
  const freshHref = newWalkHref(location.href);
  const hasProgress = progress.questions.some(question => question.input !== '' || question.digit !== null)
    || progress.envelopeStored || progress.giftUnlocked || progress.sleepMaskFound || !!progress.lastDraw;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const initialView = useRef(viewFromHash(location.hash, progress.giftUnlocked));
  const [view, setView] = useState<View>(initialView.current);
  const [giftRevealRequested, setGiftRevealRequested] = useState(false);
  const [entered, setEntered] = useState(initialView.current !== 'overview');
  const bloom = 0;
  const lampOn = progress.puzzleSolved;
  const [webgl, setWebgl] = useState(detectWebGL);
  const [canvasReady, setCanvasReady] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasWandered,setHasWandered]=useState(false);
  const [visited,setVisited]=useState<RegionId[]>(['entry']);
  const [atlasPulse,setAtlasPulse]=useState<AtlasPulse>(null);
  // Session-only environmental state survives reading and renderer changes.
  const paperGuide = useRef<PaperGuideState | null>(null);
  const pondListening = useRef<PondListeningState | null>(null);
  const mushroomListening = useRef<MushroomListening | null>(null);
  const floofAttention = useRef<FloofAttention | null>(null);
  const chimeListening = useRef<ChimeListeningState | null>(null);
  const orangeRestRef = useRef(createOrangeRest());
  const [orangeRestVersion,setOrangeRestVersion] = useState(0);
  const [discovered,setDiscovered]=useState<Place[]>([]);
  const [encounter,setEncounter]=useState<Place|null>(null);
  const [worldEvents,setWorldEvents]=useState<string[]>([]);
  const seenWorldEvents=useRef(new Set<string>());
  const [worldNotice,setWorldNotice]=useState('');
  const worldNoticeTimer=useRef<number|undefined>(undefined);
  const onWorldEvent=useCallback((event:string)=>{
    if(seenWorldEvents.current.has(event))return;seenWorldEvents.current.add(event);
    setWorldEvents(current=>[...current,event]);
    const copy:Record<string,string>={'trail-returned':'The flowers remember your footsteps.','trail-butterfly-met':'A little company for the path.','trail-flower-open':'Some things open when you stay.','trail-lantern-awake':'A small light remembers you.','butterfly-flight':'A butterfly has somewhere to show you.','pond-ripple':'Even the water hears your footsteps.','stones-awake':'Be still. The path will show you the way.',...Object.fromEntries(atlasEncounterSites.map(site=>[site.event,site.hint]))};
    if(copy[event]&&event!=='mushroom-chime'&&event!=='paper-flock'&&event!=='pond-lilies'){setWorldNotice(copy[event]);window.clearTimeout(worldNoticeTimer.current);worldNoticeTimer.current=window.setTimeout(()=>setWorldNotice(''),4200);}
  },[]);
  const systemReduced = useMedia('(prefers-reduced-motion: reduce)');
  const finePointer = useMedia('(hover: hover) and (pointer: fine)');
  const reduced = systemReduced || quiet;
  const visible = usePageVisible();
  const viewport = useWindowSize();
  const size = { width: viewport.width, height: Math.max(420, viewport.height) };
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const close = view !== 'overview';
  const startExploring = useCallback(() => {setEntered(true);history.replaceState({...history.state,entered:true},'',location.hash||'#garden');}, []);
  const journey = useMeadowJourney({ initialPose: initialView.current === 'overview' ? HOME : panelPose(initialView.current, size.width, size.height), reduced, enabled: !close && entered, entered, onExplore: startExploring, width: size.width, height: size.height, renderDriven: canvasReady && webgl && !reduced });
  const { pose, poseRef, surfaceRef, jumpTo, goTo, dragging, moving, heading:walkingHeading, actor:walkingActor, actorRef } = journey;
  const {soundOn,toggleSound}=useGardenSound({visible,reading:close,moving,worldEvents});
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
  const failGraphics = useCallback(() => { setWebgl(false); setCanvasReady(false); }, []);
  const markReady = useCallback(() => setCanvasReady(true), []);
  const canvasActive = assets.ready && webgl && !reduced;
  // Switching to a still renderer keeps the amount drunk, but releases an
  // unfinished pose so an explicit sip remains available there.
  useEffect(() => {
    if (!reduced && canvasActive) return;
    if (orangeRestRef.current.phase === 'idle') return;
    orangeRestRef.current = {...orangeRestRef.current,phase:'idle',amount:0,elapsed:0,origin:null};
    setOrangeRestVersion(value=>value+1);
  }, [reduced,canvasActive]);
  const writeHistory = useCallback((next: View, nextPose = poseRef.current, nextHeading = walkingHeading) => {
    history.pushState({ journey: { ...nextPose }, returnJourney: next === 'overview' ? null : panelOrigin.current, actor: {...actorRef.current}, heading: {...nextHeading}, returnHeading: next === 'overview' ? null : panelHeading.current, returnActor: next === 'overview' ? null : panelActor.current, entered: true }, '', next === 'overview' ? '#garden' : `#${next}`);
  }, [poseRef,actorRef,walkingHeading]);
  const openPlace = useCallback((place: Place | 'gift' | 'rest', origin: string) => {
    history.replaceState({ ...history.state, journey: { ...poseRef.current }, actor:{...actorRef.current}, heading:{...walkingHeading}, entered: true }, '', location.href);
    // A reading-to-reading transition keeps the original place in the meadow.
    if (!close) {
      returnFocus.current = origin;
      panelOrigin.current = { ...poseRef.current };
      panelActor.current = {...actorRef.current};
      panelHeading.current = {...walkingHeading};
    }
    // Every garden entry shows the parcel first, including a clearly labelled revisit.
    const destination = place === 'gift' || place === 'lock' ? 'lock' : place;
    const target = destination === 'rest' ? { ...poseRef.current } : panelPose(destination, size.width, size.height);
    if (close || !entered) jumpTo(target, actorRef.current, walkingHeading);
    else goTo(target);
    setEntered(true);
    setMenuOpen(false);
    setView(destination);
    writeHistory(destination, target);
  }, [close, entered, jumpTo, goTo, poseRef, actorRef, walkingHeading, writeHistory, size.width, size.height]);
  // The reveal callback requests a view; only committed business state grants it.
  // It changes neither the close-up camera nor the original return snapshot.
  useEffect(() => {
    if (!giftRevealRequested) return;
    setGiftRevealRequested(false);
    if (view !== 'lock' || !progress.giftUnlocked) return;
    setView('gift');
    writeHistory('gift');
  }, [giftRevealRequested, progress.giftUnlocked, view, writeHistory]);
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
    setHasWandered(false);
    setEncounter(null);
    setWorldNotice('');window.clearTimeout(worldNoticeTimer.current);
    window.clearTimeout(encounterTimer.current);
    panelOrigin.current=null;panelActor.current=null;panelHeading.current=null;
    jumpTo(HOME);
    history.pushState({ journey: { ...HOME }, entered: false }, '', '#garden');
    requestAnimationFrame(() => document.getElementById('enter-garden')?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    const sync = () => {
      const next = viewFromHash(location.hash, progressRef.current.giftUnlocked);
      const saved = history.state?.journey;
      panelOrigin.current = validPose(history.state?.returnJourney) ? { ...history.state.returnJourney } : null;
      panelActor.current=history.state?.returnActor??null;
      panelHeading.current=history.state?.returnHeading??null;
      if (validPose(saved)) jumpTo(saved,history.state?.actor,history.state?.heading);
      else if (next !== 'overview') jumpTo(panelPose(next, sizeRef.current.width, sizeRef.current.height));
      setView(next);
      if (next === 'overview' && lastView.current !== 'overview') requestAnimationFrame(() => (document.getElementById(returnFocus.current) ?? surfaceRef.current)?.focus({ preventScroll: true }));
      setEntered(next !== 'overview' || history.state?.entered === true);
      if (location.hash === '#gift' && !progressRef.current.giftUnlocked) history.replaceState(history.state, '', '#lock');
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
  useEffect(()=>{if(entered&&moving)setHasWandered(true);},[entered,moving]);
  useEffect(() => { lastView.current = view; }, [view]);
  useEffect(() => {
    if (close) {
      const initialFocus = view === 'lock' ? document.getElementById('gift-code') : null;
      (initialFocus ?? title.current)?.focus({ preventScroll: true });
    }
  }, [close, view]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!close) return;
      if (event.key === 'Escape') { event.preventDefault(); closePanel(); }
      if (event.key === 'Tab') {
        const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex="0"]') ?? [])]
          .filter(control => !control.matches(':disabled') && control.tabIndex >= 0 && control.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === title.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === title.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [close, closePanel]);
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
  const region=regionAt(actor.x,actor.y),atmosphere=regionAtmosphere(close?pose.x:actor.x,close?pose.y-220:actor.y),dusk=atmosphere.dusk;
  const nearbySite=atlasEncounterSites.find(site=>Math.hypot(site.x-actor.x,site.y-actor.y)<site.radius);
  const activateSite=useCallback(()=>{
    if(!canvasActive||!nearbySite||nearbySite.id==='hill'||nearbySite.id==='pond'||close||menuOpen||(moving&&nearbySite.id!=='arch'))return;
    setAtlasPulse(current=>({id:nearbySite.id,serial:(current?.serial??0)+1}));
    // The transient encounter button disappears when walking resumes.
    // Return focus to the meadow so the next arrow key can leave the bank.
    surfaceRef.current?.focus({preventScroll:true});
  },[canvasActive,nearbySite,close,menuOpen,moving,surfaceRef]);
  useEffect(()=>{if(entered&&!close&&!visited.includes(region.id)&&Math.hypot(actor.x-region.x,actor.y-region.y)<region.radius*.7)setVisited(current=>[...current,region.id]);},[entered,close,moving,region,visited,actor.x,actor.y]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(!nearbySite||nearbySite.id==='hill'||nearbySite.id==='pond'||close||(moving&&nearbySite.id!=='arch')||!entered||event.repeat||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||(event.target instanceof Element&&event.target.closest('button,a,input,textarea')))return;if(event.code==='KeyE'||event.code==='Space'){event.preventDefault();activateSite();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[nearbySite,close,moving,entered,activateSite]);
  const travelTo=(place:GardenRegion)=>{if(!visited.includes(place.id))return;setMenuOpen(false);jumpTo({x:place.x+80,y:place.y+(place.id==='pond'?-100:80),zoom:1});requestAnimationFrame(()=>surfaceRef.current?.focus({preventScroll:true}));};
  const color=(v:number[])=>v.map(n=>Math.round(n*255)).join(',');
  const puzzleStarted = progress.questions.some(question => question.input !== '' || question.digit !== null);
  const routeGoal = useMemo(() => mainRouteGoal({ puzzleSolved: progress.puzzleSolved, envelopeStored: progress.envelopeStored, hasSong: !!progress.lastDraw, giftUnlocked: progress.giftUnlocked }), [progress.puzzleSolved, progress.envelopeStored, progress.lastDraw, progress.giftUnlocked]);
  // A 100-unit cell keeps route finding off the animation hot path while tracking actual travel.
  const routeCellX = Math.round(actor.x / 100), routeCellY = Math.round(actor.y / 100);
  const onwardRoute = useMemo(() => routeGoal ? mainRouteFrom(actor, routeGoal) : null, [routeGoal, routeCellX, routeCellY]);
  const firstGuide = routeGoal?.id === 'desk' ? firstRouteGuide({ actor, events: worldEvents, started: puzzleStarted, solved: progress.puzzleSolved, packed: progress.envelopeStored, reduced: reduced || !canvasActive }) : null;
  const onwardNearby = !!onwardRoute && Math.hypot(actor.x - onwardRoute.destination.x, actor.y - onwardRoute.destination.y) < 340;
  const routeHint = firstGuide ?? (onwardRoute ? { stage: onwardRoute.goal.id, text: mainRouteText(onwardRoute.goal, onwardNearby, progress.puzzleSolved) } : null);
  const directionPoint = onwardRoute ? depthProject(onwardRoute.waypoint.x, onwardRoute.waypoint.y, pose, size.width, size.height, terrainHeight(actor.x, actor.y)) : null;
  const actorPoint = depthProject(actor.x, actor.y, pose, size.width, size.height, terrainHeight(actor.x, actor.y));
  const routeAngle = directionPoint ? Math.atan2(directionPoint.y - actorPoint.y, directionPoint.x - actorPoint.x) * 180 / Math.PI + 90 : 0;
  const visibleLandmarks = entered && !close ? objects.filter(object => depthVisibility(object,pose,size.width,size.height)>.35 && landmarkReveal(object,actor)>.5 && Math.hypot(actor.x-object.x,actor.y-object.y)<360) : [];
  let nearbyLandmark: Place | undefined;
  if (!moving) {
    let nearestDistance = Infinity;
    for (const object of visibleLandmarks) {
      const distance = Math.hypot(actor.x-object.x,actor.y-object.y);
      if (distance < nearestDistance) { nearbyLandmark = object.id; nearestDistance = distance; }
    }
  }
  const worldNavigation = (
      <nav className="landmarks" aria-label="Places in the garden">
        {visibleLandmarks.map(object => {
          const point = depthProject(object.x,object.y,pose,size.width,size.height);
          const objectWidth = object.width * point.scale, objectHeight = object.height * point.scale;
          let left = point.x - Math.max(70, objectWidth) / 2;
          let right = point.x + Math.max(70, objectWidth) / 2;
          let top = point.y - objectHeight + object.footInset * point.scale;
          let bottom = top + objectHeight + 54;
          if (object.id === 'puzzle') {
            // The lantern and the paper share one accessible destination.
            const desk = depthProject(puzzleDesk.x,puzzleDesk.y,pose,size.width,size.height,terrainHeight(puzzleDesk.x,puzzleDesk.y)+3);
            const width = puzzleDesk.width * desk.scale, height = puzzleDesk.height * desk.scale;
            left = Math.min(left,desk.x - width / 2);
            right = Math.max(right,desk.x + width / 2);
            top = Math.min(top,desk.y - height * puzzleDesk.foot);
            bottom = Math.max(bottom,desk.y + height * (1-puzzleDesk.foot));
          }
          return <button key={object.id} id={`landmark-${object.id}`} data-world-object className={`landmark landmark-${object.id}${nearbyLandmark === object.id ? ' is-nearby' : ''}`} aria-label={`Explore ${names[object.id]}`}
            style={{ zIndex: Math.round(5000 - point.depth), left: (left+right)/2, top, width: right-left, height: bottom-top }}
            onClick={() => openPlace(object.id, `landmark-${object.id}`)}>
            <span className="object-outline"/>{object.id === 'lock'
              ? <span className="landmark-label gift-marker" aria-hidden="true"><span className="gift-marker-glyph"><Icon type="gift" size={28}/></span></span>
              : <span className="landmark-label"><span>{names[object.id]}{object.id === 'puzzle' && <small>{progress.envelopeStored ? 'Read your note' : progress.puzzleSolved ? 'Keep your note' : puzzleStarted ? 'Continue the questions' : 'Four small questions'}</small>}</span><Icon type="arrow" size={14}/></span>}
          </button>;
        })}
      </nav>
  );
  return <main data-sleep-mask-found={progress.sleepMaskFound} data-gift-unlocked={progress.giftUnlocked} data-last-song-id={progress.lastDraw?.songId ?? ''} data-last-draw-id={progress.lastDraw?.drawId ?? ''} className={`garden-app floof-garden ${entered ? 'is-exploring' : ''} ${hasWandered ? 'has-wandered' : ''} ${close ? 'is-reading' : ''} ${dragging ? 'is-dragging' : ''} ${reduced ? 'reduced-motion' : ''} ${!visible ? 'page-hidden' : ''}`}
    style={{ '--dusk': dusk,'--region-sky':color(atmosphere.sky),'--region-fog':color(atmosphere.fog) } as React.CSSProperties} data-progress-mode={previewMode ? 'preview' : walkId ? 'walk' : 'saved'} data-walk-id={walkId ?? ''} data-puzzle-solved={progress.puzzleSolved} data-puzzle-version={content.puzzle.kind} data-questions-solved={progress.questions.filter(question => question.digit !== null).length} data-storage-status={storageStatus} data-envelope-stored={progress.envelopeStored} data-art-version="floof-clearing-v1" data-motion-version="point-to-walk-v1" data-sound={soundOn?"on":"off"} data-region={region.id} data-visited={visited.join(',')} data-atlas-pulse={atlasPulse?`${atlasPulse.id}:${atlasPulse.serial}`:''} data-entered={entered} data-heading-x={heading.x.toFixed(6)} data-heading-y={heading.y.toFixed(6)} data-world-events={worldEvents.join(",")} data-view={view} data-moving={moving&&!close} data-discovered={discovered.join(',')} data-actor-x={actor.x.toFixed(6)} data-actor-y={actor.y.toFixed(6)} data-camera-x={pose.x.toFixed(6)} data-camera-y={pose.y.toFixed(6)} data-camera-zoom={pose.zoom.toFixed(6)} data-renderer={canvasActive && canvasReady ? 'webgl' : 'static'}>
    <div className="art-stage">
      {entered&&<div className="exploration-sky"/>}
      {(!canvasActive || !canvasReady) && <StaticGarden orangeRestRef={orangeRestRef} orangeRestVersion={orangeRestVersion} paperGuide={paperGuide} pondListening={pondListening} mushroomListening={mushroomListening} floofAttention={floofAttention} chimeListening={chimeListening} trailEvents={worldEvents} reading={close} images={assets.images} pose={pose} width={size.width} height={size.height} bloom={bloom} lampOn={lampOn||worldEvents.includes('trail-lantern-awake')} entered={entered} actor={actor} heading={heading} discovered={discovered}/>}
      {canvasActive && <div className={`canvas-stage ${canvasReady ? 'ready' : ''}`}><GraphicsBoundary onFail={failGraphics}><Suspense fallback={null}><GardenCanvas orangeRestRef={orangeRestRef} paperGuide={paperGuide} pondListening={pondListening} mushroomListening={mushroomListening} floofAttention={floofAttention} chimeListening={chimeListening} motion={journey.motion} onMotionFrame={journey.stepRenderFrame} images={assets.images} pose={pose} bloom={bloom} lampOn={lampOn} visible={visible&&!menuOpen} reading={close} entered={entered} actor={actor} moving={moving} heading={heading} guidance={journey.guidance} discovered={discovered} onWorldEvent={onWorldEvent} trailEvents={worldEvents} atlasPulse={atlasPulse} onFail={failGraphics} onReady={markReady}/></Suspense></GraphicsBoundary></div>}
      <div className="dusk-veil"/><div className="paper-grain"/>
      {entered&&<div className="meadow-atmosphere"/>}
    </div>
    <div ref={surfaceRef} id="journey-surface" className="journey-surface" inert={!entered || close || menuOpen || undefined} role="region" aria-label={finePointer ? 'Garden: move your pointer to guide the little light. Leave it in a direction to keep walking. Bring it close to the light to pause. No click needed. Arrow keys and scrolling also move.' : 'Garden: hold and slide to guide the little light, release to pause. Arrow keys also move.'} tabIndex={!entered || close || menuOpen ? -1 : 0} aria-hidden={!entered || close || menuOpen || undefined}>{!close && worldNavigation}<OrangeRestTarget rest={orangeRestRef} motion={journey.motion} width={size.width} height={size.height} active={entered&&!close&&!menuOpen&&visible} reduced={reduced||!canvasActive} onSip={()=>setOrangeRestVersion(value=>value+1)}/><RestGiftTarget motion={journey.motion} width={size.width} height={size.height} active={entered&&!close&&!menuOpen&&visible} found={progress.sleepMaskFound} onOpen={()=>openPlace('rest','rest-gift-target')}/></div>

    <header className="site-header" inert={close || undefined}>
      <a className="wordmark" href="#garden" onClick={event => { event.preventDefault(); returnToEntry(); }} aria-label="A secret garden. Return to the entrance."><span className="mark"><Icon type="leaf" size={23}/></span><span>A secret garden<small>A LITTLE WORLD FOR YOU</small></span></a>
      {entered&&!close&&<span className="current-region">{region.name}</span>}
      <div className="header-actions">{progress.puzzleSolved && <button className="password-shortcut" id="password-shortcut" data-journey-shortcut onClick={() => openPlace('puzzle', 'password-shortcut')}>{progress.envelopeStored ? 'My envelope' : 'My note'}</button>}{progress.giftUnlocked && <button className="gift-shortcut" id="gift-shortcut" data-journey-shortcut onClick={() => openPlace('gift', 'gift-shortcut')}>Your gift</button>}<button className="sound-toggle" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn?"Turn ambient sound off":"Turn ambient sound on"}><span aria-hidden="true">{soundOn?"♪":"♩"}</span><span>Sound {soundOn?"on":"off"}</span></button><button className="music-shortcut" id="music-shortcut" data-journey-shortcut onClick={() => openPlace('music', 'music-shortcut')}><Icon type="music" size={18}/><span>Choose a song</span></button><button className="motion-toggle" aria-label="Reduce motion" aria-pressed={reduced} onClick={() => setQuiet(value => !value)}><Icon type={reduced ? 'leaf' : 'sun'}/></button></div>
    </header>
    {!entered && !close && <section className="welcome" aria-label="An invitation to the garden" data-no-journey>
      <div className="eyebrow"><span/> A SECRET GARDEN <span/></div>
      <h1>A little way into wonder.</h1>
      <button className="primary-button" id="enter-garden" onClick={() => { startExploring(); requestAnimationFrame(() => surfaceRef.current?.focus({ preventScroll: true })); }}>{hasProgress ? 'Continue wandering' : 'Begin wandering'}<Icon type="arrow"/></button>
      {!progress.puzzleSolved && progress.questions.some(question => question.input !== '' || question.digit !== null) && <button className="continue-signal" id="continue-signal" data-journey-shortcut onClick={() => openPlace('puzzle', 'continue-signal')}>Continue the questions</button>}
      {hasProgress && <NewWalkLink href={freshHref}/>}
    </section>}
    {!close && <>
      {entered && <div className="wayfinding"><button className="entry-back" onClick={returnToEntry} aria-label="Return to the entrance"><Icon type="back" size={17}/><span>The entrance</span></button></div>}
      {entered && !menuOpen && routeHint && <p className="first-route-guide" data-guide-stage={routeHint.stage} data-route-goal={routeGoal?.id} data-route-x={onwardRoute?.waypoint.x.toFixed(1)} data-route-y={onwardRoute?.waypoint.y.toFixed(1)} role="status">
        {onwardRoute && !onwardNearby && firstGuide?.stage !== 'flower' && <svg className="route-direction" viewBox="0 0 24 24" width="18" height="18" style={{ transform: `rotate(${routeAngle}deg)` }} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M12 20V4M6 10l6-6 6 6"/></svg>}
        <span>{routeHint.text}</span>
      </p>}
      {entered && !menuOpen && !routeHint && (encounter||worldNotice)&&<p className="encounter-whisper" role="status">{encounter?encounterCopy[encounter]:worldNotice}</p>}

      {entered&&!menuOpen&&actor.y>1400&&nearbySite&&nearbySite.id!=='hill'&&nearbySite.id!=='pond'&&(!moving||nearbySite.id==='arch')&&canvasActive&&(nearbySite.id!=='hollow'||worldEvents.includes('mushroom-listened'))&&!(nearbySite.id==='moon'&&routeGoal?.id==='gift'&&onwardNearby)&&<button className={`encounter-action${nearbySite.id==='hollow'?' encounter-replay':''}`} aria-label={nearbySite.id==='hollow'?'Greet the mushrooms again':undefined} onClick={activateSite}>{nearbySite.id==='hollow'?<svg width="23" height="23" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 15c1-6 5-10 10-10s9 4 10 10c-4 3-16 3-20 0Z" stroke="currentColor" strokeWidth="1.3"/><path d="M13 18c.5 3 0 6-1 8 3 1 5 1 8 0-1-2-1.5-5-1-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M12 11h.01M20 12h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>:<>{nearbySite.label}<kbd>E</kbd></>}</button>}
      {entered && <>
        <section className={`explore-dock ${menuOpen ? 'menu-open' : ''}`} aria-label="Garden navigation">
          <div className="pan-hint"><span className="movement-note">{finePointer ? 'Point to wander · Come close to pause' : 'Slide to wander · Release to pause'}</span><button className="menu-toggle" aria-expanded={menuOpen} aria-controls="garden-map-wrap" onClick={() => {setMenuOpen(!menuOpen);if(menuOpen)requestAnimationFrame(()=>surfaceRef.current?.focus({preventScroll:true}));}}>Map</button></div>
          {menuOpen&&<div id="garden-map-wrap"><GardenMap freshHref={freshHref} actor={actor} visited={visited} puzzleSolved={progress.puzzleSolved} puzzleStarted={puzzleStarted} envelopeStored={progress.envelopeStored} hasSong={!!progress.lastDraw} giftUnlocked={progress.giftUnlocked} travel={travelTo} onClose={()=>{setMenuOpen(false);requestAnimationFrame(()=>surfaceRef.current?.focus({preventScroll:true}));}}/></div>}
        </section>
      </>}
      {!entered && <div className="first-hint"><span>✥</span> {finePointer ? 'Begin your walk, then move your pointer to wander' : 'Begin your walk, then slide to wander'}</div>}
    </>}
    {close && <>
      <div className="reading-shade"/>
      <section ref={panel} className={`content-panel ${view === 'puzzle' ? 'signal-dialog' : view === 'music' ? 'music-dialog' : view === 'rest' ? 'gift-dialog rest-gift-dialog' : `gift-dialog ${view === 'gift' ? 'gift-reveal-dialog' : 'gift-lock-dialog'}`}`} role="dialog" aria-modal="true" aria-labelledby="scene-title" data-no-journey>
        <div className="panel-topline">{view!=='rest'&&<span className="panel-eyebrow">{view === 'puzzle' ? '01' : view === 'music' ? '02' : '03'} / {names[view]}</span>}<button className="close-control" onClick={closePanel} aria-label="Close and return to where you were">×</button></div>
        <h1 id="scene-title" tabIndex={-1} ref={title}>{view === 'rest' ? 'A little gift box' : view === 'puzzle' ? (progress.envelopeStored ? 'Your note' : content.puzzle.title) : view === 'music' ? content.music.title : view === 'gift' ? content.gift.birthdayMessage : content.gift.doorTitle}</h1>
        {view === 'rest' ? <RestGift found={progress.sleepMaskFound} onDiscover={()=>dispatch({type:'FIND_SLEEP_MASK'})} onReturn={closePanel} reduced={reduced} storageStatus={storageStatus}/> : view === 'puzzle' ? <SignalPuzzle progress={progress} dispatch={dispatch} storageStatus={storageStatus} reduced={reduced} onReturn={closePanel} onMusic={() => openPlace('music', 'music-shortcut')}/> : view === 'music' ? <MusicGarden progress={progress} dispatch={dispatch} storageStatus={storageStatus} reduced={reduced} onReturn={closePanel} onGift={() => openPlace('lock', 'music-shortcut')}/> : view === 'lock' ? <GiftDoor progress={progress} dispatch={dispatch} storageStatus={storageStatus} reduced={reduced} onReveal={() => setGiftRevealRequested(true)} onClue={() => openPlace('puzzle', returnFocus.current)} onReturn={closePanel}/> : <GiftReveal storageStatus={storageStatus} onMusic={() => openPlace('music', 'music-shortcut')} onReturn={closePanel}/>}
        {import.meta.env.DEV && <PreviewTools temporary={previewMode} storageStatus={storageStatus} inPanel/>}
      </section>
    </>}
    {!close && import.meta.env.DEV && <PreviewTools temporary={previewMode} storageStatus={storageStatus}/>}
    {!entered && <footer className="site-footer"><span>Growing, gently, for you</span><Icon type="leaf" size={16}/></footer>}
    {import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === 'context-loss' && <button className="qa-button" onClick={() => { const gl = document.querySelector('canvas')?.getContext('webgl2'); gl?.getExtension('WEBGL_lose_context')?.loseContext(); }}>Simulate graphics failure</button>}
    {!assets.ready && <div className="load-status" role="status">Gathering flowers and a little breeze · {assets.settled}/{assets.total}</div>}
    {!close && assets.ready && (assets.failed.length > 0 || !webgl) && <p className="fallback-note" role="status">Still garden · Free to explore</p>}
    {!close && <MotionQA onRun={journey.runMotionSample}/>}
    {!close && <LoadingQA ready={assets.ready} renderer={canvasActive && canvasReady ? 'webgl' : 'static'}/>}
  </main>;
}
