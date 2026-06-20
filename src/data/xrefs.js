// Single source of truth for cross-reference data used by useXref.js

/** Maps lecture number strings to their section ids */
export const idFor = {
  '1': 'l1', '2': 'l2', '3': 'l3', '4': 'l4',
  '5': 'l5', '6': 'l6', '7': 'l7', '8': 'l8',
  '9': 'l9', '10': 'l10', '11': 'l11', '12': 'l12',
};

/**
 * Returns a fresh RegExp (with global flag) matching:
 *   - "Lecture N" / "Lectures N–M"   → groups 1,2,3,4
 *   - bare "LN" followed by ) ] . , ; :  → group 5
 *   - "the Primer"                   → group 6
 *
 * Must be called fresh each time it is used because the global flag makes
 * regex objects stateful (lastIndex).
 *
 * Byte-identical to the original's:
 *   /(Lectures?\s+)(\d{1,2})(\s*[–-]\s*(\d{1,2}))?|\bL(\d{1,2})(?=[)\].,;:])|(the\s+Primer)\b/g
 */
export function makeXrefRe() {
  return /(Lectures?\s+)(\d{1,2})(\s*[–-]\s*(\d{1,2}))?|\bL(\d{1,2})(?=[)\].,;:])|(the\s+Primer)\b/g;
}
