/** Opt-in development instrumentation. No timers or samples run on the normal page. */
export const motionQAEnabled = import.meta.env.DEV && typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('qa') === 'motion';

type Point = { x: number; y: number };
type Measurement = {
  startedAt: number;
  durationMs: number;
  frames: number[];
  steps: number[];
  drawCalls: number[];
  commits: number;
  duplicates: number;
  duplicateRun: number;
  maxDuplicateRun: number;
  previous: Point | null;
  previouslyMoving: boolean;
};
const WARMUP_MS = 500;
let measurement: Measurement | null = null;
const now = () => performance.now();
const rounded = (value: number) => Math.round(value * 100) / 100;
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
function p95(values: number[]) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * .95) - 1)];
}

export function beginMotionMeasurement(durationMs = 8000) {
  if (!motionQAEnabled) return;
  measurement = {
    startedAt: now(), durationMs: Math.max(1000, Number.isFinite(durationMs) ? durationMs : 8000),
    frames: [], steps: [], drawCalls: [], commits: 0, duplicates: 0,
    duplicateRun: 0, maxDuplicateRun: 0, previous: null, previouslyMoving: false,
  };
}

/** Pass the raw renderer delta, before simulation safety clamps. */
export function recordMotionFrame(deltaSeconds: number, actor: Point, moving: boolean, drawCalls?: number) {
  if (!motionQAEnabled || !measurement) return;
  const sample = measurement, age = now() - sample.startedAt;
  if (age > sample.durationMs) return;
  if (age < WARMUP_MS) { sample.previous = null; sample.previouslyMoving = false; return; }
  if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) sample.frames.push(deltaSeconds * 1000);
  if (drawCalls !== undefined && Number.isFinite(drawCalls)) sample.drawCalls.push(drawCalls);
  if (Number.isFinite(actor.x) && Number.isFinite(actor.y)) {
    if (moving && sample.previouslyMoving && sample.previous) {
      const distance = Math.hypot(actor.x - sample.previous.x, actor.y - sample.previous.y);
      sample.steps.push(distance);
      if (distance < .0001) {
        sample.duplicates += 1;
        sample.duplicateRun += 1;
        sample.maxDuplicateRun = Math.max(sample.maxDuplicateRun, sample.duplicateRun);
      } else sample.duplicateRun = 0;
    } else sample.duplicateRun = 0;
    sample.previous = { ...actor };
    sample.previouslyMoving = moving;
  }
}

export function recordMotionCommit() {
  if (!motionQAEnabled || !measurement) return;
  const age = now() - measurement.startedAt;
  if (age >= WARMUP_MS && age <= measurement.durationMs) measurement.commits += 1;
}

export function readMotionMeasurement() {
  const sample = measurement;
  const age = sample ? now() - sample.startedAt : 0;
  return {
    status: !sample ? 'idle' : age < sample.durationMs ? 'running' : 'complete',
    elapsedMs: sample ? Math.round(Math.min(age, sample.durationMs)) : 0,
    durationMs: sample?.durationMs ?? 8000,
    warmupMs: WARMUP_MS,
    frames: sample?.frames.length ?? 0,
    meanFrameMs: rounded(mean(sample?.frames ?? [])),
    p95FrameMs: rounded(p95(sample?.frames ?? [])),
    maxFrameMs: rounded(sample?.frames.length ? Math.max(...sample.frames) : 0),
    framesOver25Ms: sample?.frames.filter(value => value > 25).length ?? 0,
    appCommits: sample?.commits ?? 0,
    movingSamples: sample?.steps.length ?? 0,
    duplicateMovingFrames: sample?.duplicates ?? 0,
    maxDuplicateRun: sample?.maxDuplicateRun ?? 0,
    meanStep: rounded(mean(sample?.steps ?? [])),
    p95Step: rounded(p95(sample?.steps ?? [])),
    maxStep: rounded(sample?.steps.length ? Math.max(...sample.steps) : 0),
    meanDrawCalls: rounded(mean(sample?.drawCalls ?? [])),
  };
}
