import { useCallback, useEffect, useRef, useState } from 'react';
import { progressReducer } from './experience';
import type { Progress, ProgressAction } from './experience';
import { mergeProgress, sameProgress } from './mergeProgress';
import { loadProgress, loadSharedProgress, saveProgress, STORAGE_KEY } from '../lib/storage';
import type { StorageStatus } from '../lib/storage';
import { browserPreviewProgress } from '../lib/previewProgress';
import { browserWalkProgress } from '../lib/walkProgress';

/** Business state loads before navigation and remains usable if saving is unavailable. */
export function useProgress() {
  const [walk] = useState(browserWalkProgress);
  const [preview] = useState(() => walk ? null : browserPreviewProgress(import.meta.env?.DEV === true));
  const [initial] = useState(() => walk ? walk.load() : preview ? preview.load() : loadProgress());
  const [progress, setProgress] = useState(initial.progress);
  const current = useRef(initial.progress);
  const observed = useRef(initial.progress);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(initial.storageStatus);
  const reconcile = useCallback((stored: Progress) => {
    const next = mergeProgress(current.current, stored, observed.current);
    observed.current = stored;
    return next;
  }, []);
  // Rebase on storage before the command: an old tab cannot erase another tab's
  // answers, and a deliberate new draw still wins. Save before animation begins.
  const dispatch = useCallback((action: ProgressAction) => {
    const before = current.current;
    // A temporary playthrough owns a tab-local store and never rebases on the
    // saved game, even if another normal tab completes or unlocks something.
    if (preview) {
      const next = progressReducer(before, action);
      if (next !== before) {
        current.current = next;
        setStorageStatus(preview.save(next) ? 'saved' : 'memory');
        setProgress(next);
      }
      return;
    }
    const loaded = walk ? walk.loadShared() : loadSharedProgress();
    const base = loaded.progress ? reconcile(loaded.progress) : before;
    const next = progressReducer(base, action);
    current.current = next;
    const changed = next !== base;
    const repair = loaded.progress && !sameProgress(next, loaded.progress);
    if (changed || repair) {
      const saved = walk ? walk.save(next) : saveProgress(next);
      if (saved) observed.current = next;
      setStorageStatus(saved ? 'saved' : 'memory');
    } else if (loaded.storageStatus === 'memory') setStorageStatus('memory');
    if (next !== before) setProgress(next);
  }, [reconcile, preview, walk]);
  useEffect(() => {
    if (preview) {
      setStorageStatus(preview.save(current.current) ? 'saved' : 'memory');
      return;
    }
    // A late mount effect also rebases; another tab may have progressed since render.
    const loaded = walk ? walk.loadShared() : loadSharedProgress();
    const next = loaded.progress ? reconcile(loaded.progress) : current.current;
    current.current = next;
    setProgress(next);
    const saved = walk ? walk.save(next) : saveProgress(next);
    if (saved) observed.current = next;
    setStorageStatus(saved ? 'saved' : 'memory');

    const sync = (event: StorageEvent) => {
      if (event.key !== (walk?.key ?? STORAGE_KEY) || event.newValue === null) return;
      try { if (event.storageArea && event.storageArea !== window.localStorage) return; }
      catch { return; }
      // Read the latest value, not a queued event's potentially stale snapshot.
      const incoming = walk ? walk.loadShared() : loadSharedProgress();
      if (!incoming.progress) return;
      const merged = reconcile(incoming.progress);
      current.current = merged;
      setProgress(merged);
      // Repair only genuinely missing achievements; equal records never echo.
      if (!sameProgress(merged, incoming.progress)) {
        const persisted = walk ? walk.save(merged) : saveProgress(merged);
        if (persisted) observed.current = merged;
        setStorageStatus(persisted ? 'saved' : 'memory');
      } else setStorageStatus(incoming.storageStatus);
    };
    window.addEventListener?.('storage', sync);
    return () => window.removeEventListener?.('storage', sync);
  }, [reconcile, preview, walk]);
  return { progress, dispatch, storageStatus, previewMode: preview !== null, walkId: walk?.run ?? null };
}
