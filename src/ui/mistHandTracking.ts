// The model sees the camera's original frame. Mirroring and cover cropping belong
// only to the final mapping from a landmark to a point on the garden.
type Landmark = { x: number; y: number };
export type MistHandSample = { x: number; y: number; radius: number; source?: 'index' | 'palm' };
export type MistHandError = 'permission' | 'unavailable' | 'tracking' | 'busy';
type Bounds = { width: number; height: number };
type Detector = {
  detectForVideo: (video: HTMLVideoElement | HTMLCanvasElement, timestampMs: number) => { landmarks: Landmark[][] };
  close: () => void;
};
type Vision = {
  FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
  HandLandmarker: {
    createFromOptions: (files: unknown, options: {
      baseOptions: { delegate: 'CPU' | 'GPU'; modelAssetBuffer: Uint8Array };
      runningMode: 'VIDEO'; numHands: number;
      minHandDetectionConfidence: number; minTrackingConfidence: number; minHandPresenceConfidence: number;
    }) => Promise<Detector>;
  };
};

const minimumFrameInterval = 1000 / 24;

// Compiling the GPU graph under a software GL driver can stall the whole
// entrance for several seconds. Use the CPU model straight away in that case.
function preferredDelegate(): 'CPU' | 'GPU' {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  if (!gl) return 'CPU';
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|lavapipe|software|basic render driver/i.test(renderer) ? 'CPU' : 'GPU';
  } finally { gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}

export function projectMistHand(points: readonly Landmark[], camera: Bounds, surface: Bounds): MistHandSample | null {
  if (![camera.width, camera.height, surface.width, surface.height].every(size => Number.isFinite(size) && size > 0)) return null;
  const scale = Math.max(surface.width / camera.width, surface.height / camera.height);
  const width = camera.width * scale, height = camera.height * scale;
  const left = points[5], right = points[17];
  if (!left || !right) return null;
  const palm = Math.hypot((left.x - right.x) * width, (left.y - right.y) * height);
  if (!Number.isFinite(palm) || palm <= 0) return null;
  const radius = Math.max(26, Math.min(140, palm * .55));
  // The index tip can leave the visible cover crop even while much of the
  // hand is in view. The base of the middle finger is a stable second nib.
  const candidates = [{ point: points[8], source: 'index' }, { point: points[9], source: 'palm' }] as const;
  for (const { point, source } of candidates) {
    if (!point) continue;
    const x = surface.width / 2 + (.5 - point.x) * width;
    const y = surface.height / 2 + (point.y - .5) * height;
    if (x >= 0 && x <= surface.width && y >= 0 && y <= surface.height) return { x, y, radius, source };
  }
  return null;
}

function cameraError(error: unknown): MistHandError {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'unavailable';
}

type Options = {
  video: HTMLVideoElement;
  signal: AbortSignal;
  bounds: () => Bounds;
  onReady: () => void;
  onSample: (sample: MistHandSample | null) => void;
  onError: (error: MistHandError) => void;
};

/** Start only on an explicit camera choice. Aborting always stops the tracks,
 * even when the browser permission prompt returns after the invitation closed. */
export async function startMistHandTracking({ video, signal, bounds, onReady, onSample, onError }: Options): Promise<void> {
  if (signal.aborted) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { onError('unavailable'); return; }

  let stopped = false;
  let stream: MediaStream | undefined;
  let detector: Detector | undefined;
  let frame: number | undefined;
  let raf: number | undefined;
  let watchdog: number | undefined;
  let nextInference = 0;
  let lastVideoTime = -1;
  let lastFrameCount = -1;
  let readyAnnounced = false;
  const loading = new AbortController();

  function closeDetector() {
    const old = detector;
    detector = undefined;
    // A partially failed graphics graph may throw during teardown.
    try { old?.close(); } catch { /* Its camera and callbacks must still be released. */ }
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    loading.abort();
    if (frame !== undefined) video.cancelVideoFrameCallback(frame);
    if (raf !== undefined) cancelAnimationFrame(raf);
    window.clearTimeout(watchdog);
    if (stream) {
      for (const track of stream.getTracks()) {
        track.removeEventListener('ended', cameraEnded);
        track.stop();
      }
      if (video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    }
    closeDetector();
    signal.removeEventListener('abort', stop);
    window.removeEventListener('pagehide', stop);
  }
  function fail(reason: MistHandError) {
    if (stopped) return;
    stop();
    onError(reason);
  }
  function cameraEnded() { fail('unavailable'); }
  signal.addEventListener('abort', stop, { once: true });
  window.addEventListener('pagehide', stop, { once: true });

  try {
    const acquired = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
    });
    if (stopped) { acquired.getTracks().forEach(track => track.stop()); return; }
    stream = acquired;
    const cameraTrack = stream.getVideoTracks()[0];
    if (!cameraTrack || cameraTrack.readyState === 'ended') { fail('unavailable'); return; }
    cameraTrack.addEventListener('ended', cameraEnded, { once: true });
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
  } catch (error) { fail(cameraError(error)); return; }

  if (stopped) return;
  try {
    // A full same-origin URL keeps the vendored ESM byte-for-byte intact in Vite dev as well.
    const assets = import.meta.env.BASE_URL + 'gesture/';
    const runtime = assets + 'vision-0.10.32';
    const js = new URL(runtime + '/vision_bundle.mjs', document.baseURI).href;
    const [vision, model] = await Promise.all([
      import(/* @vite-ignore */ js) as Promise<Vision>,
      fetch(assets + 'hand_landmarker-v1.task', { signal: loading.signal }).then(async response => {
        if (!response.ok) throw new Error('Hand model unavailable');
        return new Uint8Array(await response.arrayBuffer());
      }),
    ]);
    if (stopped) return;
    const files = await vision.FilesetResolver.forVisionTasks(runtime + '/wasm');
    if (stopped) return;
    let delegate = preferredDelegate();
    async function prepare() {
      const ready = await vision.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetBuffer: model, delegate }, runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: .45, minHandPresenceConfidence: .45, minTrackingConfidence: .45,
      });
      if (stopped) { ready.close(); return; }
      detector = ready;
    }
    try { await prepare(); }
    catch (error) {
      if (stopped) return;
      if (delegate === 'CPU') throw error;
      delegate = 'CPU';
      await prepare();
    }
    if (stopped) return;

    // Some drivers report a usable GPU until the graph sees its first frame.
    async function recoverCpu() {
      closeDetector();
      delegate = 'CPU';
      onSample(null);
      try { await prepare(); if (!stopped) schedule(); }
      catch { fail('tracking'); }
    }
    // Only the tracker uses the smaller frame. The visible mirror continues to
    // display the original camera stream directly at its negotiated resolution.
    const input = document.createElement('canvas');
    const shorterFrame = input.getContext('2d', { alpha: false });
    function inferenceFrame() {
      const longestEdge = Math.max(video.videoWidth, video.videoHeight);
      if (!shorterFrame || longestEdge <= 640) return video;
      const width = Math.max(1, Math.round(video.videoWidth * 640 / longestEdge));
      const height = Math.max(1, Math.round(video.videoHeight * 640 / longestEdge));
      if (input.width !== width || input.height !== height) {
        input.width = width;
        input.height = height;
      }
      shorterFrame.drawImage(video, 0, 0, width, height);
      return input;
    }
    function read(time: number, mediaTime: number, polling = false) {
      if (stopped) return;
      const frameCount = video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0;
      const fresh = polling && frameCount > 0 ? frameCount !== lastFrameCount : mediaTime !== lastVideoTime;
      if (detector && video.readyState >= 2 && fresh && time >= nextInference) {
        lastVideoTime = mediaTime;
        lastFrameCount = frameCount;
        nextInference = Math.max(nextInference + minimumFrameInterval, time + 1);
        let hands: Landmark[][];
        try { hands = detector.detectForVideo(inferenceFrame(), time).landmarks; }
        catch {
          if (delegate === 'GPU') void recoverCpu();
          else fail('tracking');
          return;
        }
        if (!readyAnnounced) {
          readyAnnounced = true;
          onReady();
          if (stopped) return;
        }
        onSample(projectMistHand(hands[0] ?? [], { width: video.videoWidth, height: video.videoHeight }, bounds()));
      }
      schedule();
    }
    function schedule() {
      if (stopped) return;
      if (typeof video.requestVideoFrameCallback === 'function') {
        const timeoutMs = watchdogPolling ? minimumFrameInterval : 220;
        frame = video.requestVideoFrameCallback((time, metadata) => {
          window.clearTimeout(watchdog);
          watchdogPolling = false;
          frame = undefined;
          read(time, metadata.mediaTime);
        });
        // Some compositors stop presenting a fully covered video element.
        // When the actual camera is still decoding, keep tracking its new frames.
        watchdog = window.setTimeout(() => {
          if (frame !== undefined) video.cancelVideoFrameCallback(frame);
          watchdogPolling = true;
          frame = undefined;
          read(performance.now(), video.currentTime, true);
        }, timeoutMs);
      } else {
        raf = requestAnimationFrame(time => read(time, video.currentTime, true));
      }
    }
    let watchdogPolling = false;
    schedule();
  } catch { fail('tracking'); }
}
