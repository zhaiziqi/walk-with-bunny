import { createInitialProgress } from '../state/experience';
import type { Progress } from '../state/experience';
import { normalizeProgress } from './storage';
import type { LoadedProgress, ProgressStorage, SharedProgress } from './storage';

const WALK_PREFIX = 'birthday-garden:walk:v1:';
const validRun = /^[a-zA-Z0-9_-]{1,80}$/;
const isWalkId = (run: string) => run !== 'new' && validRun.test(run);

export type WalkRequest = { kind: 'none' } | { kind: 'fresh' } | { kind: 'resume'; run: string };

/** Any explicit but malformed walk request stays isolated from the normal save. */
export function parseWalk(search: string): WalkRequest {
  const values = new URLSearchParams(search).getAll('walk');
  if (values.length === 0) return { kind: 'none' };
  if (values.length !== 1 || !isWalkId(values[0])) return { kind: 'fresh' };
  return { kind: 'resume', run: values[0] };
}

/** A reusable entry link starts a new walk instead of sharing the current save. */
export function newWalkHref(href: string): string {
  const url = new URL(href);
  url.search = '?walk=new';
  url.hash = 'garden';
  return url.href;
}

function freshWalkId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type WalkProgressStore = {
  run: string;
  key: string;
  load: () => LoadedProgress;
  loadShared: () => SharedProgress;
  save: (progress: Progress) => boolean;
};

/** Owns exactly one key. Never reads a legacy save, another walk or session storage. */
export function createWalkProgressStore(requestedRun: string, storage: ProgressStorage | null): WalkProgressStore {
  const run = isWalkId(requestedRun) ? requestedRun : freshWalkId();
  const key = `${WALK_PREFIX}${run}`;
  let unreadable = false;
  const loadShared = (): SharedProgress => {
    if (!storage) return { progress: null, storageStatus: 'memory' };
    try {
      const raw = storage.getItem(key);
      if (raw === null) return { progress: null, storageStatus: unreadable ? 'memory' : 'saved' };
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      const progress = parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 2
        ? normalizeProgress(parsed) : null;
      return { progress, storageStatus: unreadable ? 'memory' : 'saved' };
    } catch {
      unreadable = true;
      return { progress: null, storageStatus: 'memory' };
    }
  };
  return {
    run, key, loadShared,
    load() {
      const loaded = loadShared();
      return { progress: loaded.progress ?? createInitialProgress(), storageStatus: loaded.storageStatus };
    },
    save(progress) {
      // A failed read may hide an existing walk. Keep changes in memory rather
      // than overwriting that unreadable record with a blank initial state.
      if (!storage || unreadable) return false;
      try { storage.setItem(key, JSON.stringify(normalizeProgress(progress))); return true; }
      catch { return false; }
    },
  };
}

export function browserWalkProgress(): WalkProgressStore | null {
  if (typeof window === 'undefined') return null;
  const request = parseWalk(window.location?.search ?? '');
  if (request.kind === 'none') return null;
  const run = request.kind === 'resume' ? request.run : freshWalkId();
  try {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('walk', run);
    if (request.kind === 'fresh' || !url.hash) url.hash = 'garden';
    if (url.href !== window.location.href) window.history.replaceState(null, '', url.href);
  } catch {
    // If this URL cannot retain its new ID, keep the walk isolated in memory.
    // Refresh can start again; it must never fall through to an older save.
    return createWalkProgressStore(run, null);
  }
  let storage: ProgressStorage | null;
  try { storage = window.localStorage; } catch { storage = null; }
  return createWalkProgressStore(run, storage);
}
