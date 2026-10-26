import { Component, type PropsWithChildren } from 'react';
import { BookOpen } from 'lucide-react';

export default class ErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="loading-screen" role="alert">
        <span className="loading-logo">
          <BookOpen />
        </span>
        <h2>Pahamin Academy</h2>
        <p>Tampilan belum dapat dibuka. Muat ulang halaman untuk mencoba kembali.</p>
        <button className="primary" onClick={() => location.reload()}>
          Muat ulang
        </button>
      </main>
    );
  }
}
