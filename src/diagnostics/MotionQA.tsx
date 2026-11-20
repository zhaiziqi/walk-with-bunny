import { useEffect, useState } from 'react';
import { beginMotionMeasurement, motionQAEnabled, readMotionMeasurement } from './motionMetrics';

/** A repeatable renderer check, never a substitute for physical trackpad testing. */
export function MotionQA({ onRun }: { onRun: () => void }) {
  const [result, setResult] = useState(readMotionMeasurement);
  useEffect(() => {
    if (!motionQAEnabled) return;
    const timer = window.setInterval(() => {
      setResult(previous => {
        const current = readMotionMeasurement();
        return previous.status === 'complete' && current.status === 'complete' ? previous : current;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, []);
  if (!motionQAEnabled) return null;
  return <aside data-no-journey aria-label="Movement diagnostics" style={{ position: 'absolute', zIndex: 100,
    left: 16, top: 142, width: 262, maxHeight: 'calc(100% - 160px)', overflow: 'auto', padding: 14,
    background: '#fffdf2ed', border: '1px solid #71847866', color: '#294b3f', borderRadius: 5 }}>
    <button type="button" disabled={result.status === 'running'} onClick={() => {
      beginMotionMeasurement(); onRun(); setResult(readMotionMeasurement());
    }} style={{ minHeight: 44, width: '100%', background: '#416653', color: '#fffaf1', padding: '8px 10px', fontSize: 12 }}>
      Run 8-second movement check
    </button>
    <p style={{ margin: '9px 0', fontSize: 11, lineHeight: 1.5 }}>90° turn · reverse · rest · resume<br/>Physical trackpad feel is a separate check.</p>
    <output aria-live="polite" aria-label="Movement check result" style={{ display: 'block' }}>
      <pre style={{ margin: 0, fontSize: 10, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
    </output>
  </aside>;
}
