import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  visible: boolean;
  reading: boolean;
  moving: boolean;
  worldEvents: readonly string[];
};
type SoundGraph = {
  context: AudioContext;
  master: GainNode;
  wind: GainNode;
  noise: AudioBufferSourceNode;
  breeze: OscillatorNode;
  nodes: AudioNode[];
  voices: Set<OscillatorNode>;
};
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const chimes: Record<string, number> = {
  'trail-butterfly-met': 784,
  'trail-flower-open': 659.25,
  'trail-lantern-awake': 523.25,
  'trail-returned': 392,
};

// This graph is made only after the visitor explicitly enables sound.
// The noise and isolated tones are procedural ambience, never song content.
function createSoundGraph(): SoundGraph {
  const Audio = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Audio) throw new Error('Web Audio is unavailable');
  const context = new Audio({ latencyHint: 'interactive' });
  try {
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const wind = context.createGain();
    wind.gain.value = .12;
    wind.connect(master);

    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 4), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 1729;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = seed / 2147483648 - 1;
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = context.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = 420; band.Q.value = .38;
    const soft = context.createBiquadFilter();
    soft.type = 'lowpass'; soft.frequency.value = 1050; soft.Q.value = .4;
    noise.connect(band); band.connect(soft); soft.connect(wind);

    const breeze = context.createOscillator();
    breeze.type = 'sine'; breeze.frequency.value = .075;
    const breath = context.createGain();
    breath.gain.value = .024;
    breeze.connect(breath); breath.connect(wind.gain);
    noise.start(); breeze.start();
    return { context, master, wind, noise, breeze, nodes: [noise, band, soft, wind, breeze, breath, master], voices: new Set() };
  } catch (error) {
    void context.close().catch(() => undefined);
    throw error;
  }
}

function setLevel(parameter: AudioParam, value: number, at: number, fade = .18) {
  parameter.cancelScheduledValues(at);
  parameter.setTargetAtTime(value, at, fade);
}

function soundDiscovery(graph: SoundGraph, frequency: number) {
  const { context, master } = graph;
  if (context.state !== 'running') return;
  // Two quiet, quickly fading partials make a single soft glass-like response.
  for (const [ratio, gain, duration] of [[1, .10, 1.65], [2.01, .018, .9]]) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    const at = context.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.value = frequency * ratio;
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(gain, at + .035);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope); envelope.connect(master);
    graph.voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); graph.voices.delete(oscillator); };
    oscillator.start(at); oscillator.stop(at + duration + .03);
  }
}

/** Optional ambience. A hidden tab suspends sound; resuming requires another explicit click. */
export function useGardenSound(options: Options) {
  const [soundOn, setSoundOn] = useState(false);
  const graph = useRef<SoundGraph | null>(null);
  const enabled = useRef(false), alive = useRef(true), operation = useRef(0);
  const current = useRef(options); current.current = options;
  const heard = useRef(new Set(options.worldEvents));
  const suspendTimer = useRef<number | undefined>(undefined);

  const hush = useCallback(() => {
    operation.current++;
    enabled.current = false;
    setSoundOn(false);
    window.clearTimeout(suspendTimer.current);
    const audio = graph.current;
    if (!audio || audio.context.state === 'closed') return;
    setLevel(audio.master.gain, 0, audio.context.currentTime, .035);
    suspendTimer.current = window.setTimeout(() => {
      if (!enabled.current && graph.current === audio && audio.context.state !== 'closed') {
        void audio.context.suspend().catch(() => undefined);
      }
    }, 160);
  }, []);

  const toggleSound = useCallback(() => {
    if (enabled.current) { hush(); return; }
    if (!current.current.visible) return;
    window.clearTimeout(suspendTimer.current);
    const ticket = ++operation.current;
    enabled.current = true;
    // Do not replay discoveries that happened while muted.
    heard.current = new Set(current.current.worldEvents);
    try {
      const audio = graph.current ?? createSoundGraph();
      graph.current = audio;
      // Called directly within the user's button handler, including Safari's resume requirement.
      void audio.context.resume().then(() => {
        if (!alive.current || ticket !== operation.current || !enabled.current) return;
        setLevel(audio.master.gain, current.current.reading ? .025 : .12, audio.context.currentTime, .45);
        setSoundOn(true);
      }).catch(() => { if (alive.current && ticket === operation.current) hush(); });
    } catch {
      if (alive.current && ticket === operation.current) hush();
    }
  }, [hush]);

  useEffect(() => {
    if (!options.visible) hush();
  }, [options.visible, hush]);

  useEffect(() => {
    const audio = graph.current;
    if (!soundOn || !audio || audio.context.state !== 'running') return;
    const at = audio.context.currentTime;
    setLevel(audio.master.gain, options.reading ? .025 : .12, at, .3);
    setLevel(audio.wind.gain, options.moving ? .15 : .12, at, .65);
  }, [soundOn, options.reading, options.moving]);

  useEffect(() => {
    const newEvents = options.worldEvents.filter(event => !heard.current.has(event));
    for (const event of options.worldEvents) heard.current.add(event);
    const audio = graph.current;
    if (!soundOn || !options.visible || options.reading || !audio) return;
    // At most one response per update prevents overlapping bells after restoration.
    const event = newEvents.find(name => chimes[name] || /^chime-note-\d+$/.test(name));
    if (event) soundDiscovery(audio, chimes[event] ?? 880);
  }, [soundOn, options.worldEvents, options.visible, options.reading]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false; operation.current++; enabled.current = false;
      window.clearTimeout(suspendTimer.current);
      const audio = graph.current; graph.current = null;
      if (!audio) return;
      audio.noise.stop(); audio.breeze.stop();
      for (const voice of audio.voices) { voice.onended = null; voice.stop(); }
      for (const node of audio.nodes) node.disconnect();
      void audio.context.close().catch(() => undefined);
    };
  }, []);

  return { soundOn, toggleSound };
}
