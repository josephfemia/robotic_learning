/**
 * domainRandomization.js — pure numeric core for the domain-randomization widget (W: domrand, L5).
 *
 * Ported VERBATIM from the domrand IIFE in reference/robot-learning-companion.html
 * lines 2717–2745. Models deployment success as a function of real-world parameter
 * (friction), comparing a fragile nominal policy vs a domain-randomized robust policy.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Deployment success of a policy trained ONLY at the nominal parameter.
 *
 * Original (line 2721):
 *   function noDR(f){ return Math.exp(-Math.pow(f-nom,2)/(2*0.012)); }
 * where nom=1.0.
 *
 * A tight Gaussian spike at f=nom: high performance at nominal, collapses quickly.
 *
 * @param {number} f   - real-world friction at deployment
 * @param {number} nom - nominal (training) friction (default 1.0)
 * @returns {number} success in (0, 1]
 */
export function noDR(f, nom) {
  if (nom === undefined) nom = 1.0;
  return Math.exp(-Math.pow(f - nom, 2) / (2 * 0.012));
}

/**
 * Deployment success of a domain-randomized policy.
 *
 * Original (lines 2722–2723):
 *   function withDR(f){
 *     var lo=nom-wdt, hi=nom+wdt, edge=0.045;
 *     if(f>=lo&&f<=hi) return 0.9;
 *     var d = f<lo ? lo-f : f-hi;
 *     return 0.9*Math.exp(-d*d/(2*edge*edge));
 *   }
 * where nom=1.0, wdt=0.25.
 *
 * A flat plateau of 0.9 over the randomization band [nom-wdt, nom+wdt],
 * then a Gaussian rolloff beyond the band.
 *
 * @param {number} f   - real-world friction at deployment
 * @param {number} nom - nominal friction (default 1.0)
 * @param {number} wdt - randomization half-width (default 0.25)
 * @returns {number} success in (0, 0.9]
 */
export function withDR(f, nom, wdt) {
  if (nom === undefined) nom = 1.0;
  if (wdt === undefined) wdt = 0.25;
  var lo = nom - wdt, hi = nom + wdt, edge = 0.045;
  if (f >= lo && f <= hi) return 0.9;
  var d = f < lo ? lo - f : f - hi;
  return 0.9 * Math.exp(-d * d / (2 * edge * edge));
}
