import '../styles/bunny-walk-preview.css';

/** Local study controls are outside the visitor interface and never unlock content. */
export function BunnyWalkPreviewTools({ onEntrance, onMushrooms }: { onEntrance: () => void; onMushrooms: () => void }) {
  return <aside className="bunny-walk-tools" aria-label="Bunny walking preview" data-no-journey>
    <span>Walking study</span>
    <div>
      <button onClick={onEntrance}>Entrance</button>
      <button onClick={onMushrooms}>By the mushrooms</button>
      <a href="/docs/design/finale-preview-20261118/index.html" target="_blank" rel="noreferrer">Finale study</a>
    </div>
    <small>Local preview · Your saved garden is separate</small>
  </aside>;
}
