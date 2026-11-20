import type { MoonClearingRef } from './moonClearing';
import type { OrangeRestRef } from './orangeRest';
import { Component, memo } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { LoadedArt } from './useAssets';
import type { JourneyPose } from './journey';
import type { Place } from './world';
import type { MeadowPoint, MeadowGuidance } from './meadowMotion';
import { ExplorationScene } from './ExplorationScene';
import type { JourneyFrameRef } from './journeyFrame';
import type { PaperGuideRef } from './paperGuide';
import type { PondListeningRef } from './pondListening';
import type { MushroomListeningRef } from './mushroomListening';
import type { FloofAttentionRef } from './floofAttention';
import type { ChimeListeningRef } from './chimeListening';
import type { MistGreetingRef } from './mistGreeting';

export type GardenProps = { images: LoadedArt; pose: JourneyPose; bloom: number; lampOn: boolean; visible: boolean; reading: boolean; entered: boolean; actor: MeadowPoint; moving: boolean; heading: MeadowPoint; guidance?: MeadowGuidance; motion?: JourneyFrameRef; orangeRestRef?: OrangeRestRef; orangeRestVersion?: number; moonClearing?: MoonClearingRef; paperGuide?: PaperGuideRef; pondListening?: PondListeningRef; mushroomListening?: MushroomListeningRef; floofAttention?: FloofAttentionRef; mistGreeting?: MistGreetingRef; chimeListening?: ChimeListeningRef; onMotionFrame?: () => void; discovered: Place[]; trailEvents?: readonly string[]; atlasPulse?: { id: string; serial: number } | null; onWorldEvent?: (event: string) => void; onFail: () => void; onReady: () => void };
class CanvasBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function GardenCanvas(props: GardenProps) {
  return <CanvasBoundary onFail={props.onFail}>
    <Canvas camera={{ position: [0, -2400, 1350], near: 1, far: 18000, fov: 55 }} dpr={[1, 1.7]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} frameloop={props.visible ? 'always' : 'never'} fallback={null} aria-hidden="true">
      <ExplorationScene {...props}/>
    </Canvas>
  </CanvasBoundary>;
}

// Live position is consumed by useFrame; only content/lifecycle changes reconcile the scene.
export default memo(GardenCanvas, (previous, next) => {
  const transient = new Set(['pose', 'actor', 'heading', 'guidance', 'moving']);
  return (Object.keys(next) as (keyof GardenProps)[]).every(key =>
    (next.motion && transient.has(key)) || Object.is(previous[key], next[key]));
});
