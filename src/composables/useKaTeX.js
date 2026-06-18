/**
 * useKaTeX — KaTeX auto-render integration
 *
 * Reproduces the KaTeX call in robot-learning-companion.html ~lines 2366–2376.
 * KaTeX's auto-render extension attaches renderMathInElement to window;
 * this composable guards against it being absent (e.g. in tests or SSR).
 *
 * Export: renderMath(el)
 */

/**
 * Renders math in the given element using KaTeX auto-render, if available.
 * Accepts the same delimiters as the original:
 *   - $$…$$  display mode
 *   - \(…\)  inline mode
 *
 * No-op if:
 *   - window.renderMathInElement is not a function (KaTeX not loaded)
 *   - KaTeX throws for any reason (errors are silently swallowed)
 *
 * @param {Element} el - the root element to render math within
 */
export function renderMath(el) {
  try {
    if (typeof window !== 'undefined' && typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }
  } catch (e) {
    // Silently swallow — mirrors the original's empty catch block
  }
}
