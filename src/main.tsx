import { render } from 'preact';
import './styles.css';
import { App } from './ui/App';

render(<App />, document.getElementById('app')!);

// Offline support for the installable version; the claude.ai copy doesn't use service workers.
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
