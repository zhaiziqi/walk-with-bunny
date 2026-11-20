import { useState } from 'react';

const enabled = import.meta.env.DEV && typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('qa') === 'loading';

/** Read browser timing only on an explicit development-only inspection. */
export function LoadingQA({ ready, renderer }: { ready: boolean; renderer: string }) {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  if (!enabled) return null;
  return <aside data-no-journey aria-label="Loading diagnostics" style={{ position: 'absolute', zIndex: 100,
    left: 16, top: 142, width: 300, maxHeight: 'calc(100% - 160px)', overflow: 'auto', padding: 14,
    background: '#fffdf2ed', border: '1px solid #71847866', color: '#294b3f', borderRadius: 5 }}>
    <button type="button" onClick={() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const fcp = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint');
      const round = (value: number | undefined) => value === undefined ? null : Math.round(value * 100) / 100;
      setReport({ recordedAt: new Date().toISOString(), renderer, sharedAssetsSettled: ready,
        domContentLoadedMs: round(navigation?.domContentLoadedEventEnd), loadEventMs: round(navigation?.loadEventEnd),
        firstContentfulPaintMs: round(fcp?.startTime), resourceCount: resources.length,
        transferredBytes: resources.reduce((total, entry) => total + entry.transferSize, 0),
        decodedBytes: resources.reduce((total, entry) => total + entry.decodedBodySize, 0),
        slowestResources: [...resources].sort((a, b) => b.duration - a.duration).slice(0, 5).map(entry => ({
          path: new URL(entry.name).pathname, durationMs: round(entry.duration), transferBytes: entry.transferSize,
        })),
        externalResourceOrigins: [...new Set(resources.map(entry => new URL(entry.name).origin).filter(origin => origin !== location.origin))],
      });
    }} style={{ minHeight: 44, background: '#416653', color: '#fffaf1', padding: '8px 10px', width: '100%' }}>Capture loading report</button>
    <p style={{ fontSize: 11 }}>Local development load; cache and browser state affect these timings.</p>
    <output aria-label="Loading check result"><pre style={{ fontSize: 10, whiteSpace: 'pre-wrap', margin: 0 }}>{report ? JSON.stringify(report, null, 2) : 'Ready to inspect.'}</pre></output>
  </aside>;
}
