import '../styles/new-walk.css';

/** A separate walk is an ordinary link; it never clears the current save. */
export function NewWalkLink({ href }: { href: string }) {
  return <div className="new-walk" data-no-journey>
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Start a new walk in a new tab">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 9a7.5 7.5 0 1 1-.3 5M5 4v5h5"/>
      </svg>
      <span>Start a new walk</span><span className="new-walk-arrow" aria-hidden="true">↗</span>
    </a>
    <small>Opens in a new tab. This walk stays here.</small>
  </div>;
}
