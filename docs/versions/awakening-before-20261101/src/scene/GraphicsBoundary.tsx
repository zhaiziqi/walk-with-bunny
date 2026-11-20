import { Component } from 'react';
import type { ReactNode } from 'react';
/** Also catches a rejected lazy import before the Canvas module can mount. */
export class GraphicsBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}
