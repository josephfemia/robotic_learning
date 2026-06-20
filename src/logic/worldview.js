/**
 * worldview.js — pure functions for the worldview widget (W: three worldviews ternary map).
 *
 * These implement the math shown in the worldview IIFE
 * (reference/robot-learning-companion.html lines 3117–3147).
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Triangle vertex positions for the Sutton–LeCun–Brooks triangle.
 * Sutton is top-center, LeCun is bottom-left, Brooks is bottom-right.
 * Computed from the widget's W=560, H=430 canvas dimensions.
 */
export var VERTICES = {
  A: { x: 280, y: 46 },   // Sutton (top)
  B: { x: 70,  y: 360 },  // LeCun  (bottom-left)
  C: { x: 490, y: 360 },  // Brooks (bottom-right)
};

/**
 * Convert barycentric weights [Sutton, LeCun, Brooks] to SVG x/y coordinates.
 * Normalises the weights so they need not sum to 1.
 *
 * Ported verbatim from the `pt` function in the worldview IIFE:
 *   function pt(w){ var s=w[0]+w[1]+w[2]; var a=w[0]/s,b=w[1]/s,c=w[2]/s;
 *     return {x:a*A.x+b*B.x+c*C.x, y:a*A.y+b*B.y+c*C.y}; }
 *
 * @param {number[]} w   - [wSutton, wLeCun, wBrooks], any non-negative reals
 * @param {{ A, B, C }} verts - triangle vertices (default VERTICES)
 * @returns {{ x: number, y: number }}
 */
export function barycentricToXY(w, verts) {
  var V = verts || VERTICES;
  var s = w[0] + w[1] + w[2];
  var a = w[0] / s, b = w[1] / s, c = w[2] / s;
  return { x: a * V.A.x + b * V.B.x + c * V.C.x,
           y: a * V.A.y + b * V.B.y + c * V.C.y };
}
