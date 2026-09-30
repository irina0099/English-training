import { render } from 'preact';
import './styles.css';
import { App } from './ui/App';

if (import.meta.env.MODE === 'artifact') document.documentElement.classList.add('in-artifact');

render(<App />, document.getElementById('app')!);

// iPhone can leave the whole page shifted up after the on-screen keyboard closes.
// The window itself never needs to scroll here (only the content area does), so put it back.
const resetWindowScroll = () => {
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
};
window.addEventListener('focusout', () => setTimeout(resetWindowScroll, 150));
window.visualViewport?.addEventListener('resize', () => {
  const vv = window.visualViewport;
  if (vv && vv.height >= window.innerHeight - 1) setTimeout(resetWindowScroll, 150);
});

// Offline support for the installable version; the claude.ai copy doesn't use service workers.
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
