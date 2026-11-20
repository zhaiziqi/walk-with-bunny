import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, Dispatch } from 'react';
import { content } from '../config/content';
import { formatSongRequest } from '../lib/draw';
import type { StorageStatus } from '../lib/storage';
import type { Progress, ProgressAction } from '../state/experience';
import { useSongDraw } from '../motion/useSongDraw';
import '../styles/music.css';

type Props = {
  progress: Progress;
  dispatch: Dispatch<ProgressAction>;
  storageStatus: StorageStatus;
  reduced: boolean;
  onReturn: () => void;
  onGift: () => void;
};
// Stable positions follow a shallow curve. Drawing never rearranges or removes flowers.
const flowers = [
  { x: 8, bottom: 12, height: 65, tilt: -11 },
  { x: 18, bottom: 30, height: 74, tilt: 5 },
  { x: 29, bottom: 39, height: 62, tilt: -4 },
  { x: 40, bottom: 46, height: 78, tilt: 8 },
  { x: 51, bottom: 47, height: 67, tilt: -7 },
  { x: 62, bottom: 42, height: 80, tilt: 4 },
  { x: 73, bottom: 34, height: 62, tilt: -6 },
  { x: 84, bottom: 20, height: 77, tilt: 10 },
  { x: 94, bottom: 6, height: 64, tilt: -4 },
];

export function MusicGarden({ progress, dispatch, storageStatus, reduced, onReturn, onGift }: Props) {
  const { draw, busy, animating } = useSongDraw(dispatch, reduced);
  const selected = content.music.songs.find(song => song.id === progress.lastDraw?.songId);
  const chosenFlower = selected ? flowers[selected.id - 1] : null;
  const [greeted, setGreeted] = useState<{ id: number; serial: number } | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'manual'>('idle');
  const [manual, setManual] = useState(false);
  const [drawError, setDrawError] = useState('');
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const manualText = useRef<HTMLTextAreaElement>(null);
  const copyVersion = useRef(0);
  const previousBusy = useRef(false);
  const copyText = selected ? formatSongRequest(selected) : '';

  useEffect(() => {
    if (previousBusy.current && !busy) resultHeading.current?.focus({ preventScroll: true });
    previousBusy.current = busy;
  }, [busy]);
  useEffect(() => () => { copyVersion.current++; }, []);
  // Another open tab can choose a piece too. Feedback always belongs to the
  // current draw, even when an older clipboard request is still pending.
  useEffect(() => {
    copyVersion.current++;
    setCopyState('idle'); setManual(false); setDrawError('');
  }, [progress.lastDraw?.drawId]);

  const choose = () => {
    try {
      if (!draw()) return;
      copyVersion.current++;
      setCopyState('idle'); setManual(false); setDrawError('');
    } catch {
      setDrawError('The breeze missed this time. Please try again.');
    }
  };
  const showManual = () => {
    setManual(true);
    requestAnimationFrame(() => { manualText.current?.focus(); manualText.current?.select(); });
  };
  const copy = async () => {
    if (!copyText || copyState === 'copying') return;
    const version = ++copyVersion.current;
    setCopyState('copying');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(copyText);
      if (version === copyVersion.current) setCopyState('copied');
    } catch {
      if (version !== copyVersion.current) return;
      setCopyState('manual'); showManual();
    }
  };

  return <div className={`music-garden ${animating ? 'is-drawing' : ''}`} data-draw-id={progress.lastDraw?.drawId ?? ''} data-song-id={selected?.id ?? ''} data-draw-phase={animating ? 'drawing' : selected ? 'result' : 'ready'}>
    <p className="music-intro">Nine pieces. Let the garden choose one.</p>
    <div className="music-flower-bed" role="group" aria-label="Nine music flowers. Greeting a flower does not choose a song.">
      <span className="music-ground-wash" aria-hidden="true"/>
      {content.music.songs.map(song => {
        const flower = flowers[song.id - 1];
        const picked = selected?.id === song.id;
        const nod = greeted?.id === song.id;
        return <button key={song.id} type="button" className={`music-flower ${picked ? 'is-selected' : ''}`} aria-label={`Greet flower ${String(song.id).padStart(2, '0')}${picked ? ', the last chosen piece' : ''}`}
          style={{ left: `${flower.x}%`, bottom: flower.bottom * .78, '--flower-height': `${flower.height * .9}px`, '--flower-tilt': `${flower.tilt}deg` } as CSSProperties}
          onClick={() => setGreeted(previous => ({ id: song.id, serial: (previous?.serial ?? 0) + 1 }))}>
          <span className="music-flower-contact" aria-hidden="true"/>
          <span className="music-flower-sway"><span key={picked && animating ? progress.lastDraw!.drawId : nod ? greeted.serial : 0} className={picked && animating ? 'music-flower-opening' : nod ? 'music-flower-nod' : ''}>
            <img src="/assets/garden/quiet-flower.webp" alt="" draggable={false} onError={event => { event.currentTarget.hidden = true; }}/>
            <span className="music-flower-fallback" aria-hidden="true">✿</span>
          </span></span>
          <span className="music-flower-number">{String(song.id).padStart(2, '0')}</span>
        </button>;
      })}
      {animating && chosenFlower && <span key={progress.lastDraw!.drawId} className="music-seed" aria-hidden="true" style={{ '--seed-x': `${chosenFlower.x}%`, '--seed-y': `${135 - chosenFlower.bottom * .78 - 22 - chosenFlower.height * .9 * .75}px` } as CSSProperties}/>}
    </div>

    {animating ? <div className="music-reveal-wait" role="status">Following a little breeze…</div> : selected ? <article className="music-piece-card" aria-label={`Your piece: ${String(selected.id).padStart(2, '0')}`}>
      <div className="music-piece-heading"><span className="music-piece-number" aria-hidden="true">{String(selected.id).padStart(2, '0')}</span><div>
        <span className="music-small-label">A PIECE FOR YOU</span>
        <h2 ref={resultHeading} tabIndex={-1}>{selected.title}</h2>
      </div></div>
      {selected.reason.trim() && <p className="music-reason">{selected.reason}</p>}
      <p className="music-invitation">{content.music.invitationText}</p>
      <div className="music-copy-actions"><button type="button" className="music-copy-button" onClick={copy} disabled={copyState === 'copying'}>{copyState === 'copied' ? 'Copied ✓' : copyState === 'copying' ? 'Copying…' : content.music.copyLabel}</button>
        {!manual && <button type="button" className="music-text-button" onClick={showManual}>Select text instead</button>}</div>
      <p className="music-copy-feedback" role="status">{copyState === 'copied' ? 'Copied. Ready for you to send.' : copyState === 'manual' ? 'Copying was unavailable. Select the text below and copy it.' : ''}</p>
      {manual && <div className="music-manual-copy"><label htmlFor="song-request">Your song request</label><textarea id="song-request" ref={manualText} readOnly value={copyText} rows={3} onFocus={event => event.currentTarget.select()}/><small>Press ⌘C on Mac or Ctrl+C on Windows, then send it whenever you like.</small></div>}
    </article> : null}

    <button type="button" className="music-draw-button" disabled={busy} onClick={choose}>{animating ? 'A flower is opening…' : selected ? content.music.redrawLabel : content.music.drawLabel}<span aria-hidden="true">↗</span></button>
    <p className="music-rule">{content.music.ruleText}</p>
    {drawError && <p className="music-copy-feedback" role="alert">{drawError}</p>}
    <div className="music-footer"><button type="button" className="music-text-button" onClick={onReturn}>Return to the garden <span aria-hidden="true">↗</span></button><button type="button" className="music-text-button" onClick={onGift}>{progress.giftUnlocked ? 'See the gift again' : content.music.giftLabel} <span aria-hidden="true">→</span></button></div>
    {content.music.songs.some(song => song.placeholder) && <p className="music-footnote">Preview · Piece titles are still to be added.</p>}
    {storageStatus === 'memory' && <p className="music-storage" role="status">Your piece stays here while this page is open. This browser could not save it.</p>}
  </div>;
}
