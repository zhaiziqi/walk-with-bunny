import { useEffect, useRef } from 'react';
import { BILLBOARD_TILT, depthProject, terrainHeight } from './depthWorld';
import { inspectOrangeRest, orangeRest, orangeSipAvailable, requestOrangeSip, type OrangeRestRef } from './orangeRest';
import { orangeCupArt } from './orangeRestArt';
import type { JourneyFrameRef } from './journeyFrame';
import './orangeRest.css';

type Props = { rest: OrangeRestRef; motion: JourneyFrameRef; width: number; height: number;
  active: boolean; reduced: boolean; onSip: () => void };

/** A real accessible target on the painted glass. Reads the render-frame pose,
 * never controls locomotion or advances the sip clock. */
export function OrangeRestTarget({ rest, motion, width, height, active, reduced, onSip }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let frame = 0;
    const place = () => {
      const node = button.current;
      if (!node) return;
      const {actor, pose} = motion.current;
      const cupHeight = orangeRest.cup.y + orangeCupArt.height*(orangeCupArt.foot-.5);
      const point = depthProject(orangeRest.x + orangeRest.cup.x,
        orangeRest.y + cupHeight * Math.cos(BILLBOARD_TILT), pose, width, height,
        terrainHeight(orangeRest.x, orangeRest.y) + 3 + cupHeight * Math.sin(BILLBOARD_TILT));
      const available = orangeSipAvailable(actor);
      const onScreen = point.x > 25 && point.x < width-25 && point.y > 55 && point.y < height-55;
      node.hidden = !active || !available || !onScreen;
      node.tabIndex = node.hidden ? -1 : 0;
      node.style.left = `${point.x}px`; node.style.top = `${point.y}px`;
      node.style.width = `${Math.max(44, orangeCupArt.width*point.scale)}px`;
      node.style.height = `${Math.max(50, orangeCupArt.height*point.scale)}px`;
      node.dataset.phase = rest.current.phase;
      node.dataset.orangeRest = JSON.stringify(inspectOrangeRest(rest.current));
      frame = requestAnimationFrame(place);
    };
    place(); return () => cancelAnimationFrame(frame);
  }, [active, width, height, motion, rest]);
  return <button ref={button} type="button" data-world-object className="orange-rest-target"
    aria-label="Take a sip of orange juice" hidden
    onClick={() => {
      const before = rest.current;
      rest.current = requestOrangeSip(before, motion.current.actor, reduced);
      if (rest.current !== before) onSip();
    }}><span aria-hidden="true" className="orange-rest-shimmer"/></button>;
}
