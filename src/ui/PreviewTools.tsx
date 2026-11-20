import { useState } from 'react';
import '../styles/preview.css';

/** Development-only entry points. A fresh run always opens separately. */
export function PreviewTools({ temporary, storageStatus, inPanel = false }: { temporary: boolean; storageStatus: 'saved' | 'memory'; inPanel?: boolean }) {
  const [freshHref] = useState(() => {
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('preview', 'fresh');
    url.searchParams.set('run', crypto.randomUUID());
    url.hash = 'garden';
    return url.href;
  });
  return <aside className={`preview-tools${inPanel ? ' in-panel' : ''}`} aria-label="Development preview" data-no-journey>
    <span className="preview-tools-status">Preview only · {temporary ? 'Temporary playthrough' : 'Saved progress'}</span>
    <div className="preview-tools-links">
      <a href={freshHref} target="_blank" rel="noopener noreferrer" aria-label="Start a fresh playthrough in a new tab">Start fresh <span aria-hidden="true">↗</span></a>
      {temporary && <a href={`${location.pathname}#garden`}>Return to saved garden</a>}
    </div>
    <small>{temporary ? (storageStatus === 'saved' ? 'Kept in this tab. Your saved garden is separate.' : 'This visit only; refreshing starts over. Your saved garden is separate.') : 'A fresh playthrough opens separately. Your progress stays.'}</small>
  </aside>;
}
