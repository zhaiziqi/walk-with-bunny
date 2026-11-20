import type { MoonClearingRef } from './moonClearing';
import type { OrangeRestRef } from './orangeRest';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import type { Place } from './world';
import type { MeadowPoint } from './meadowMotion';
import { FloofStatic } from './FloofStatic';
import type { PaperGuideRef } from './paperGuide';
import type { PondListeningRef } from './pondListening';
import type { MushroomListeningRef } from './mushroomListening';
import type { FloofAttentionRef } from './floofAttention';
import type { ChimeListeningRef } from './chimeListening';
import type { MistGreetingRef } from './mistGreeting';

export type StaticGardenProps = {
  images: LoadedArt; pose: JourneyPose; width: number; height: number; bloom: number; lampOn: boolean;
  entered: boolean; actor: MeadowPoint; heading: MeadowPoint; discovered: Place[];
  reading?: boolean; trailEvents?: readonly string[]; orangeRestRef?: OrangeRestRef; orangeRestVersion?: number; moonClearing?: MoonClearingRef; paperGuide?: PaperGuideRef; pondListening?: PondListeningRef; mushroomListening?: MushroomListeningRef; floofAttention?: FloofAttentionRef; mistGreeting?: MistGreetingRef; chimeListening?: ChimeListeningRef;
};

/** A painted, non-WebGL view preserves the same world anchors and HTML interactions. */
export function StaticGarden(props: StaticGardenProps) {
  return <FloofStatic {...props}/>;
}
