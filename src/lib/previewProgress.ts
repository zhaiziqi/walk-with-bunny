import { createInitialProgress } from '../state/experience';
import type { Progress } from '../state/experience';
import { normalizeProgress } from './storage';
import type { LoadedProgress, ProgressStorage } from './storage';

/** A preview key can never be the normal progress key, including malformed URLs. */
const PREVIEW_PREFIX = 'birthday-garden:temporary-playthrough:v1:';
const validRun = /^[a-zA-Z0-9_-]{1,80}$/;

export function previewRun(search: string, development: boolean): string | null {
  if (!development) return null;
  const params = new URLSearchParams(search);
  if (params.get('preview') !== 'fresh') return null;
  const run = params.get('run') ?? '';
  // A tab-local fallback keeps refresh usable without ever falling into saved mode.
  return validRun.test(run) ? run : 'default';
}

export type PreviewProgressStore = {
  run: string;
  key: string;
  load: () => LoadedProgress;
  save: (progress: Progress) => boolean;
};

/** Storage is supplied explicitly: there is deliberately no localStorage fallback. */
export function createPreviewProgressStore(run: string, storage: ProgressStorage | null): PreviewProgressStore {
  const key = `${PREVIEW_PREFIX}${validRun.test(run) ? run : 'default'}`;
  let unreadable = false;
  return {
    run, key,
    load() {
      const empty = () => ({ progress: createInitialProgress(), storageStatus: 'memory' as const });
      if (!storage) return empty();
      try {
        const raw = storage.getItem(key);
        if (raw === null) return { progress: createInitialProgress(), storageStatus: 'saved' };
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
        const progress = parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 2
          ? normalizeProgress(parsed) : createInitialProgress();
        return { progress, storageStatus: 'saved' };
      } catch { unreadable = true; return empty(); }
    },
    save(progress) {
      // If loading failed, do not overwrite an unreadable previous run with the
      // blank in-memory fallback. A later page load can retry the session store.
      if (!storage || unreadable) return false;
      try { storage.setItem(key, JSON.stringify(normalizeProgress(progress))); return true; }
      catch { return false; }
    },
  };
}

export function browserPreviewProgress(development: boolean): PreviewProgressStore | null {
  if (!development || typeof window === 'undefined') return null;
  const run = previewRun(window.location.search, development);
  if (run === null) return null;
  let storage: ProgressStorage | null;
  try { storage = window.sessionStorage; } catch { storage = null; }
  return createPreviewProgressStore(run, storage);
}
