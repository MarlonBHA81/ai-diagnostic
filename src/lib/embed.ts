import { useEffect } from 'react';

/**
 * postMessage height auto-resize for iframe embeds. When the app is framed
 * (e.g. in a WordPress/Divi page), it reports its document height to the parent
 * on load, resize, and DOM mutations. The embed snippet in the README listens
 * for `{ type: 'sa-diagnostic:height', height }` and sets the iframe height.
 */
export function useEmbedHeight() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage({ type: 'sa-diagnostic:height', height }, '*');
    };

    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    const mo = new MutationObserver(post);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true });
    window.addEventListener('load', post);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('load', post);
    };
  }, []);
}
