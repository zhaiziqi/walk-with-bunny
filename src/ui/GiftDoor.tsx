import { useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent } from 'react';
import { content } from '../config/content';
import { getGiftNote } from '../lib/giftNote';
import { useGiftUnlock } from '../motion/useGiftUnlock';
import type { Progress, ProgressAction } from '../state/experience';
import type { StorageStatus } from '../lib/storage';
import { GiftKeepsake, GiftParcel } from './GiftObjects';
import '../styles/gift.css';
import '../styles/finale-card.css';

type Props = {
  progress: Progress;
  dispatch: Dispatch<ProgressAction>;
  storageStatus: StorageStatus;
  reduced: boolean;
  onReveal: () => void;
  onClue: () => void;
  onReturn: () => void;
};

export function GiftDoor({ progress, dispatch, storageStatus, reduced, onReveal, onClue, onReturn }: Props) {
  const { opening, unlock } = useGiftUnlock(dispatch, reduced, onReveal);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const note = getGiftNote(progress);
  const revisit = progress.giftUnlocked && !opening && !replaying;
  useEffect(() => { if (replaying) codeInput.current?.focus(); }, [replaying]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = unlock(code);
      if (result === 'busy') return;
      setError(result === 'invalid'
        ? note ? 'Not quite. Check the four digits on your note.' : 'Not quite. There is a clue at the puzzle desk.'
        : '');
    } catch { setError('Please try opening it again.'); }
  };
  return <div className={`gift-door ${opening ? 'is-opening' : ''}`} data-gift-phase={opening ? 'opening' : revisit ? 'unlocked' : 'locked'}>
    <p className="gift-intro">{revisit ? 'You opened this gift earlier.' : replaying ? 'Try the four digits again.' : note ? content.gift.lockHintWithKey : content.gift.lockHintWithoutKey}</p>
    <div className="gift-lock-layout">
      <div className="gift-keepsakes">
        <GiftParcel opening={opening} reduced={reduced}/>
        {note && <div className={`gift-envelope ${noteOpen ? 'is-open' : ''}`}>
          <button type="button" className="gift-envelope-toggle" aria-expanded={noteOpen} aria-controls="gift-note" onClick={() => setNoteOpen(value => !value)}>
            <svg viewBox="0 0 36 25" width="30" height="22" fill="none" aria-hidden="true"><path d="M2 3h32v20H2z" fill="#f5ecda" stroke="#b9ad91"/><path d="m2 3 16 12L34 3M2 23l11-10m21 10L23 13" stroke="#b9ad91"/></svg>
            <span>{noteOpen ? 'Put the note away' : note.packed ? 'Open my envelope' : 'Read my note'}</span><span aria-hidden="true">{noteOpen ? '−' : '+'}</span>
          </button>
          {noteOpen && <div id="gift-note" className="gift-note" role="group" aria-label="Your collected digits">
            <span className="gift-note-caption">YOUR NOTE</span>
            <ol>{note.digits.map((digit, index) => <li key={index} aria-label={`Digit ${index + 1}: ${digit}`}><span aria-hidden="true">{digit}</span></li>)}</ol>
          </div>}
        </div>}
      </div>
      <div className="gift-lock-controls">
        {revisit ? <div className="gift-revisit"><span className="gift-open-mark">Already opened</span><button type="button" className="gift-primary" onClick={onReveal}>Open again <span aria-hidden="true">↗</span></button><button type="button" className="gift-replay" onClick={() => { setCode(''); setError(''); setReplaying(true); }}>Try the code again</button></div> : <form onSubmit={submit} noValidate className="gift-code-form">
          <label htmlFor="gift-code">Four-digit code</label>
          <input ref={codeInput} id="gift-code" name="gift-code" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={32} value={code} placeholder="· · · ·" readOnly={opening} aria-invalid={!!error} aria-describedby={`gift-code-help${error ? ' gift-code-error' : ''}`} onChange={event => { setCode(event.target.value); setError(''); }}/>
          <p id="gift-code-help" className="gift-input-help">Enter all four digits, in the order on your note.</p>
          {error && <p id="gift-code-error" role="alert" className="gift-error">{error}</p>}
          <button type="submit" className="gift-primary" disabled={opening}>{opening ? 'Unwrapping…' : content.gift.openLabel}<span aria-hidden="true">↗</span></button>
          <span className="sr-only" role="status">{opening ? 'The code fits. Opening your parcel.' : ''}</span>
        </form>}
      </div>
    </div>
    <div className="gift-footer"><button type="button" onClick={onReturn}>Return to the garden <span aria-hidden="true">↗</span></button>{!note && <button type="button" onClick={onClue}>Visit the puzzle desk <span aria-hidden="true">→</span></button>}</div>
    {storageStatus === 'memory' && <p className="gift-storage" role="status">This browser cannot save progress. You can still open the gift during this visit.</p>}
  </div>;
}

export function GiftReveal({ storageStatus, onMusic, onReturn }: { storageStatus: StorageStatus; onMusic: () => void; onReturn: () => void }) {
  const gift = content.gift;
  return <div className="gift-reveal" data-gift-phase="revealed">
    {content.people.recipientName.trim() && <p className="gift-recipient">For {content.people.recipientName}</p>}
    <div className="finale-card-scene">
      <div className="finale-paper-trail" aria-hidden="true">
        <svg viewBox="0 0 240 100" fill="none" focusable="false"><path d="M4 69c39 19 85 6 109-15s46-34 78-25" stroke="currentColor" strokeWidth=".8" strokeDasharray="2 6"/><path d="m183 16 37 9-26 15 1-12-12-12Z" fill="#d6ded7"/><path d="m195 28 25-3-30-4m5 7-1 12" stroke="#879f95" strokeWidth=".8" strokeLinejoin="round"/></svg>
      </div>
      <GiftKeepsake kind="passport-holder" imageSrc="/art/gifts/passport-bunny-v2.png" foldedTag/>
    </div>
    {gift.reason.trim() && <p className="gift-reason">{gift.reason}</p>}
    {content.people.senderName.trim() && <p className="gift-signature">— {content.people.senderName}</p>}
    <div className="gift-ending"><button type="button" className="gift-return" onClick={onReturn}>Back to the garden <span aria-hidden="true">↗</span></button><button type="button" className="gift-music-return" onClick={onMusic}>Music garden <span aria-hidden="true">↗</span></button></div>
    {gift.placeholder && <p className="gift-placeholder-note">Preview · Gift details are still to be added.</p>}
    {storageStatus === 'memory' && <p className="gift-storage" role="status">The gift is open for this visit. This browser could not save it for next time.</p>}
  </div>;
}
