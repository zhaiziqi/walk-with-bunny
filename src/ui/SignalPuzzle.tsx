import { useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent } from 'react';
import { content } from '../config/content';
import { acceptAnswer, activeQuestionIndex } from '../lib/puzzle';
import type { Progress, ProgressAction } from '../state/experience';
import '../styles/puzzle.css';

type Props = {
  progress: Progress;
  dispatch: Dispatch<ProgressAction>;
  storageStatus: 'saved' | 'memory';
  reduced: boolean;
  onReturn: () => void;
  onMusic: () => void;
};

/** The paper keeps each answer; the envelope is only a saved presentation step. */
export function SignalPuzzle({ progress, dispatch, storageStatus, reduced, onReturn, onMusic }: Props) {
  const [shownQuestion, setShownQuestion] = useState(() => activeQuestionIndex(progress));
  const [hintOpen, setHintOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [packing, setPacking] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const answerInput = useRef<HTMLInputElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const envelopeTitle = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const packingLock = useRef(false);
  const active = activeQuestionIndex(progress);
  // A question can remain on the desk after being answered, until Next is chosen.
  const index = Math.min(shownQuestion, active);
  const question = content.puzzle.questions[index];
  const answer = progress.questions[index];
  const showQuestion = !progress.envelopeStored && !!question;
  const answered = !!answer && answer.digit !== null;
  const focusStep = `${index}:${answered}:${progress.envelopeStored}:${packing}`;

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (progress.envelopeStored) {
      if (!packing) envelopeTitle.current?.focus({ preventScroll: true });
    } else if (answered) nextButton.current?.focus({ preventScroll: true });
    else answerInput.current?.focus({ preventScroll: true });
  }, [focusStep, progress.envelopeStored, answered, packing]);

  useEffect(() => {
    if (!packing) return;
    const finish = () => { setPacking(false); packingLock.current = false; };
    // The stored note does not depend on an animationend event or an active tab.
    const timer = window.setTimeout(finish, reduced ? 0 : 880);
    const onVisibility = () => { if (document.hidden) finish(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [packing, reduced]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!answer || answered) return;
    if (acceptAnswer(index, answer.input) === null) {
      setFeedback(/^[0-9]$/.test(answer.input.trim())
        ? 'Not quite. Try again, or take a hint.' : 'Enter one digit, from 0 to 9.');
      answerInput.current?.focus({ preventScroll: true });
      return;
    }
    dispatch({ type: 'submit-answer', index });
    setFeedback(''); setHintOpen(false);
  };
  const next = () => {
    setShownQuestion(active); setFeedback(''); setHintOpen(false);
  };
  const keepNote = () => {
    if (!progress.puzzleSolved || progress.envelopeStored || packingLock.current) return;
    packingLock.current = true;
    // Commit first. Closing or refreshing during the fold still keeps the note.
    try { dispatch({ type: 'store-envelope' }); }
    catch { packingLock.current = false; setFeedback('The note needs another moment. Please try again.'); return; }
    setShownQuestion(4); setNoteOpen(false); setFeedback('');
    if (!reduced && !document.hidden) setPacking(true);
    else packingLock.current = false;
  };

  return <div className={`signal-puzzle ${reduced ? 'puzzle-is-quiet' : ''} ${showQuestion && progress.puzzleSolved ? 'awaiting-envelope' : ''}`} data-puzzle-question={showQuestion ? index + 1 : 'complete'} data-puzzle-stage={progress.envelopeStored ? 'envelope' : progress.puzzleSolved ? 'complete' : answered ? 'answered' : 'question'}>
    {!progress.puzzleSolved && <p className="puzzle-intro">{content.puzzle.intro}</p>}

    <div className={`puzzle-keepsake ${progress.puzzleSolved ? 'is-complete' : ''} ${progress.envelopeStored ? 'is-stored' : ''} ${packing ? 'is-packing' : ''} ${noteOpen ? 'is-open' : ''}`}>
      <div className="puzzle-paper-envelope" aria-hidden="true">
        <span className="envelope-back"/>
        <span className="envelope-flap"/>
        <span className="envelope-pocket"/>
        <span className="envelope-lettering">{content.puzzle.envelopeLabel}</span>
      </div>
      <div className="puzzle-note-strip" role="group" aria-label="Your collected digits" aria-hidden={progress.envelopeStored && !noteOpen}>
        <span className="puzzle-note-caption">KEEP THIS</span>
        <ol className="puzzle-digits">
          {progress.questions.map((item, position) => <li key={position} className={item.digit !== null ? 'has-digit' : ''} aria-label={`Digit ${position + 1}: ${item.digit ?? 'not found yet'}`}>
            <span className="puzzle-note-index" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span>
            <span className="puzzle-note-digit" key={item.digit ?? 'empty'} aria-hidden="true">{item.digit ?? '·'}</span>
          </li>)}
        </ol>
      </div>
    </div>

    {showQuestion ? <section className="puzzle-question-paper" aria-label={`Question ${index + 1} of 4`}>
      <div className="puzzle-question-topline"><span>{String(index + 1).padStart(2, '0')} / 04</span><span>{question.topic}</span></div>
      <h2>{question.prompt}</h2>
      {answered ? <div className="puzzle-answer-kept">
        <p className="puzzle-answer-status" role="status">{answer.digit} added to your note.</p>
        <p className="puzzle-explanation">{question.explanation}</p>
        <button ref={nextButton} type="button" className="puzzle-primary" onClick={progress.puzzleSolved ? keepNote : next}>
          {progress.puzzleSolved ? content.puzzle.keepLabel : 'Next question'}<span aria-hidden="true">↗</span>
        </button>
      </div> : <>
        <form onSubmit={submit} noValidate>
          <div className="puzzle-answer-row">
            <label htmlFor={`question-answer-${index}`}><span>One digit</span><span className="puzzle-sr-only"> · Answer for question {index + 1}</span></label>
            <input ref={answerInput} id={`question-answer-${index}`} aria-label={`Answer for question ${index + 1}`} aria-invalid={!!feedback} aria-describedby={`question-feedback-${index}`}
              type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={8} value={answer.input}
              onChange={event => { dispatch({ type: 'set-answer', index, value: event.target.value }); setFeedback(''); }}/>
            <button className="puzzle-primary" type="submit">Keep this digit <span aria-hidden="true">↗</span></button>
          </div>
          <p id={`question-feedback-${index}`} className={`puzzle-feedback ${feedback ? 'has-message' : ''}`} role="status">{feedback || '\u00a0'}</p>
        </form>
        <button type="button" className="puzzle-text-button puzzle-hint-toggle" aria-expanded={hintOpen} aria-controls={`question-hint-${index}`} onClick={() => setHintOpen(value => !value)}>
          {hintOpen ? 'Close hint' : 'A hint'}<span aria-hidden="true">{hintOpen ? '−' : '+'}</span>
        </button>
        {hintOpen && <p id={`question-hint-${index}`} className="puzzle-hint">{question.hint}</p>}
      </>}
    </section> : <section className="puzzle-envelope-result" aria-label="Your note">
      <h2 ref={envelopeTitle} tabIndex={-1}>{progress.envelopeStored ? 'For later.' : 'Four digits, in order.'}</h2>
      <p className="puzzle-explanation">You’ll use these four digits at the gift lock.</p>
      {progress.envelopeStored ? <button type="button" className="puzzle-text-button puzzle-read-note" disabled={packing} aria-expanded={noteOpen} onClick={() => setNoteOpen(value => !value)}>
        {packing ? 'Tucking it away…' : noteOpen ? 'Close note' : 'Read note'}<span aria-hidden="true">{noteOpen ? '−' : '+'}</span>
      </button> : <button ref={nextButton} type="button" className="puzzle-primary" onClick={keepNote}>{content.puzzle.keepLabel}<span aria-hidden="true">↗</span></button>}
      <span className="puzzle-sr-only" role="status">{progress.envelopeStored ? 'Your four digits are saved in the envelope.' : ''}</span>
      {feedback && <p className="puzzle-feedback has-message" role="alert">{feedback}</p>}
    </section>}

    <footer className="puzzle-footer">
      <button type="button" className="puzzle-text-button" onClick={onReturn}>Return to the garden <span aria-hidden="true">↗</span></button>
      {progress.envelopeStored && <button type="button" className="puzzle-text-button" onClick={onMusic}>Visit the music garden <span aria-hidden="true">→</span></button>}
      {storageStatus === 'memory' && <p className="puzzle-storage" role="status">This browser cannot save progress. Your note will stay while this page is open.</p>}
    </footer>
  </div>;
}
