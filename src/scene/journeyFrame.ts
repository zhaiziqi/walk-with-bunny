import type { JourneyPose } from './journey';
import type { MeadowGuidance, MeadowPoint } from './meadowMotion';

/** Authoritative motion sample shared by the controller and the drawing frame. */
export type JourneyFrame = {
  pose: JourneyPose;
  actor: MeadowPoint;
  heading: MeadowPoint;
  guidance: MeadowGuidance;
  moving: boolean;
  speed: number;
};
export type JourneyFrameRef = { current: JourneyFrame };
