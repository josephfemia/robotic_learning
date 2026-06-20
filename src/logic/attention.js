/**
 * attention.js — pure numeric core for the attention heatmap widget (W: attn, L7).
 *
 * Ported VERBATIM from the attn IIFE in robot-learning-companion.html
 * lines 2924–2950.
 *
 * Key invariant: attention weights are determined by query–key match (affinity),
 * NOT by distance between positions. A late query can put full weight on an early
 * key. The only structural constraint is the causal mask (j <= i).
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Build the N×N table of pseudo-random query–key affinities used by the widget.
 *
 * Original:
 *   var aff=[]; for(var i=0;i<N;i++){ aff[i]=[]; for(var j=0;j<N;j++){
 *     var s=Math.sin((i+1)*1.7+(j+1)*0.9)+Math.cos((i+1)*0.6-(j+1)*1.3);
 *     aff[i][j]=s; }}
 *
 * Deterministic (no Math.random). Values in roughly [-2, 2].
 *
 * @param {number} N - grid size (default 12 in original)
 * @returns {number[][]} N×N affinity matrix
 */
export function buildAffinities(N) {
  var aff = [];
  for (var i = 0; i < N; i++) {
    aff[i] = [];
    for (var j = 0; j < N; j++) {
      var s = Math.sin((i + 1) * 1.7 + (j + 1) * 0.9) + Math.cos((i + 1) * 0.6 - (j + 1) * 1.3);
      aff[i][j] = s;
    }
  }
  return aff;
}

/**
 * Compute softmax attention weights for a single query row i, given the raw
 * affinity scores for that row, a temperature, and an optional causal mask.
 *
 * Original (per-row logic inside draw()):
 *   var logits=[], mx=-1e9;
 *   for(var j=0;j<N;j++){ var ok=causal?(j<=i):true; var v=ok?aff[i][j]/temp:-1e9;
 *     logits.push(v); if(v>mx)mx=v; }
 *   var ex=[],sum=0;
 *   for(var j=0;j<N;j++){ var e=logits[j]<=-1e8?0:Math.exp(logits[j]-mx);
 *     ex.push(e); sum+=e; }
 *   // weight = ex[j]/sum  (or 0 if masked)
 *
 * Uses numerically stable max-subtraction before exponentiation.
 * Masked positions (j > i when causal) get weight 0 by convention.
 *
 * @param {number[]} affinityRow - raw affinity scores aff[i][0..N-1]
 * @param {number}   queryIdx   - row index i (used for causal cutoff)
 * @param {number}   temp       - softmax temperature (>0; lower = sharper)
 * @param {boolean}  causal     - if true, zero out positions j > i
 * @returns {number[]} attention weights (length N, sum <= 1; sums to 1 over unmasked positions)
 */
export function softmaxRow(affinityRow, queryIdx, temp, causal) {
  var N = affinityRow.length;
  var logits = [];
  var mx = -1e9;
  for (var j = 0; j < N; j++) {
    var ok = causal ? (j <= queryIdx) : true;
    var v = ok ? affinityRow[j] / temp : -1e9;
    logits.push(v);
    if (v > mx) mx = v;
  }
  var ex = [];
  var sum = 0;
  for (var j = 0; j < N; j++) {
    var e = logits[j] <= -1e8 ? 0 : Math.exp(logits[j] - mx);
    ex.push(e);
    sum += e;
  }
  var weights = [];
  for (var j = 0; j < N; j++) {
    weights.push(sum > 0 ? ex[j] / sum : 0);
  }
  return weights;
}

/**
 * Compute the full N×N attention weight matrix.
 *
 * For each query row i, applies softmaxRow over aff[i] with the given
 * temperature and causal flag. Rows sum to 1 (or 0 for fully masked rows
 * — which cannot happen with causal masking since j==i is always unmasked).
 *
 * @param {number[][]} affinities - N×N affinity matrix from buildAffinities()
 * @param {number}     temp       - softmax temperature
 * @param {boolean}    causal     - whether to apply causal mask
 * @returns {number[][]} N×N weight matrix; weights[i][j] = attention weight from query i to key j
 */
export function computeAttentionWeights(affinities, temp, causal) {
  var N = affinities.length;
  var weights = [];
  for (var i = 0; i < N; i++) {
    weights.push(softmaxRow(affinities[i], i, temp, causal));
  }
  return weights;
}
