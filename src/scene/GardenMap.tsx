import { paths, regions } from './gardenAtlas';
import type { GardenRegion, RegionId } from './gardenAtlas';
import type { MeadowPoint } from './meadowMotion';
import { mainRouteGoal, mainRouteFrom } from './mainRouteGuide';
import { NewWalkLink } from '../ui/NewWalkLink';
import '../styles/map-guide.css';

type Props = {
  actor: MeadowPoint;
  visited: RegionId[];
  travel: (region: GardenRegion) => void;
  onClose: () => void;
  puzzleSolved?: boolean;
  puzzleStarted?: boolean;
  envelopeStored?: boolean;
  hasSong?: boolean;
  giftUnlocked?: boolean;
  freshHref?: string;
};

/** Known places can be revisited; the current clue gives direction, never a teleport. */
export function GardenMap({ actor, visited, travel, onClose, puzzleSolved = false, puzzleStarted = false, envelopeStored = false, hasSong = false, giftUnlocked = false, freshHref }: Props) {
  const known = regions.filter(region => visited.includes(region.id));
  const goal = mainRouteGoal({ puzzleSolved, envelopeStored, hasSong, giftUnlocked });
  const route = goal ? mainRouteFrom(actor, goal) : null;
  const goalVisited = !!goal && visited.includes(goal.region);
  const framed = [...known, ...(route?.points ?? []), ...(route ? [route.destination] : [])];
  const minY = Math.min(actor.y, ...framed.map(region => region.y)) - 550;
  const maxY = Math.max(actor.y, ...framed.map(region => region.y)) + 850;
  const minX = Math.min(actor.x, ...framed.map(region => region.x)) - 650;
  const maxX = Math.max(actor.x, ...framed.map(region => region.x)) + 650;
  const position = (x: number, y: number) => ({ x: 26 + (y - minY) / (maxY - minY) * 468, y: 24 + (x - minX) / (maxX - minX) * 136 });
  const rabbit = position(actor.x, actor.y);
  const nextMarker = route ? position(route.destination.x, route.destination.y) : null;
  const linePoints = (points: readonly MeadowPoint[]) => points.map(point => { const mapped = position(point.x, point.y); return `${mapped.x},${mapped.y}`; }).join(' ');
  const clue = goal?.id === 'desk'
    ? puzzleSolved ? 'Your four digits are ready. Keep the note at the desk.'
      : puzzleStarted ? 'Your questions are waiting by the lantern.'
        : goalVisited ? 'Look for the paper beneath the lantern. Click the desk to begin.'
          : 'Follow the pale path to the lantern. Four small questions wait there.'
    : goal?.id === 'music' ? 'Your envelope is safe. Follow the path to the pink flowers.'
      : 'The little door waits beyond the hill. Your envelope comes with you.';

  return <nav className="garden-map guide-map" aria-label="A little map">
    <div className="map-caption"><span>A little map <small>Places you remember</small></span><button aria-label="Close map" onClick={onClose}>×</button></div>
    <svg viewBox="0 0 520 190" aria-hidden="true">
      <defs><linearGradient id="unseen-path"><stop offset="0" stopColor="#a2a899" stopOpacity=".55"/><stop offset="1" stopColor="#a2a899" stopOpacity="0"/></linearGradient></defs>
      {paths.filter(path => visited.includes(path.from) || visited.includes(path.to)).map(path => {
        const complete = visited.includes(path.from) && visited.includes(path.to);
        const ordered = visited.includes(path.from) ? path.points : [...path.points].reverse();
        const points = complete ? ordered : ordered.slice(0, Math.max(3, Math.round(ordered.length * .28)));
        return <polyline key={path.id} data-map-path={path.id} data-map-path-state={complete ? 'known' : 'unseen'} points={linePoints(points)} fill="none" stroke={complete ? '#a2a899' : 'url(#unseen-path)'} strokeWidth={complete ? 1.7 : 1.2} strokeDasharray={complete ? undefined : '2 5'} opacity={.7}/>;
      })}
      {route && <polyline data-map-route={goal!.region} data-map-path-state="clue" points={linePoints(route.points)} fill="none" stroke="#9f8b65" strokeWidth="1.7" strokeDasharray="3 4" opacity=".78"/>}
      {known.map(region => {
        const point = position(region.x, region.y);
        return <circle key={region.id} data-map-known={region.id} cx={point.x} cy={point.y} r="5" fill={region.color} stroke="#88988d" strokeWidth=".8"/>;
      })}
      {goal && nextMarker && !goalVisited && <g className="map-next-marker" data-map-clue={goal.region} transform={`translate(${nextMarker.x} ${nextMarker.y})`}>
        <circle r="11" fill="#f8f5ec" stroke="#9c9178" strokeWidth="1" strokeDasharray="2 3"/>
        {goal.id === 'desk' ? <path d="M-3-4H3L4 5H-4ZM-2-4V-7H2V-4" fill="none" stroke="#8d8064" strokeWidth="1" strokeLinejoin="round"/>
          : goal.id === 'music' ? <path d="M0 0C-8-8-8 5 0 0C8-8 8 5 0 0C-4 9 8 9 0 0M0 0V7" fill="none" stroke="#8d8064" strokeWidth="1"/>
            : <path d="M-4 6V-2C-4-8 4-8 4-2V6ZM1 2h.5" fill="none" stroke="#8d8064" strokeWidth="1"/>}
        <text y="28" textAnchor="middle">{goal.title}</text>
      </g>}
      <circle cx={rabbit.x} cy={rabbit.y} r="7" fill="none" stroke="#986d77" strokeWidth="1.5"/>
      <circle cx={rabbit.x} cy={rabbit.y} r="2" fill="#986d77"/>
    </svg>
    {goal && <section className="map-next-clue" aria-label="Your next clue" data-next-goal={goal.id}>
      <span className="map-clue-caption">{route?.nearby ? 'Close by' : 'Next along the path'}</span>
      <div><h2>{goal.title}</h2><p>{clue}</p></div>
    </section>}
    <div className="map-places">{known.map(region => <button key={region.id} onClick={() => travel(region)}><small>return to</small>{region.name}</button>)}</div>
    {known.length < regions.length && <p className="map-unseen">There is more beyond the mist.</p>}
    {freshHref && <NewWalkLink href={freshHref}/>}
  </nav>;
}
