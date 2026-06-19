/**
 * saycan.js — pure functions for the SayCan widget.
 *
 * Ported VERBATIM from reference/robot-learning-companion.html lines 3036–3074.
 * The core idea: score(skill) = pLLM(skill) × affordance(skill).
 * A high LLM score cannot rescue an infeasible skill (low affordance → low product).
 * A feasible but irrelevant skill stays low because the LLM score is low.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * Returns the full skill table for the instruction "wipe up the spill".
 * Affordance for skills that require the sponge depends on whether a sponge
 * is present in the room.
 *
 * @param {boolean} sponge - whether a sponge is currently in the room
 * @returns {{ n: string, llm: number, aff: number }[]}
 */
export function skillTable(sponge) {
  return [
    { n: 'pick up the sponge', llm: 0.95, aff: sponge ? 0.90 : 0.04 },
    { n: 'wipe the spill',     llm: 0.92, aff: sponge ? 0.80 : 0.10 },
    { n: 'pick up the towel',  llm: 0.70, aff: 0.85 },
    { n: 'find a cleaning tool', llm: 0.55, aff: 0.88 },
    { n: 'go to the table',    llm: 0.30, aff: 0.95 },
    { n: 'pour a drink',       llm: 0.05, aff: 0.60 },
  ];
}

/**
 * Compute the SayCan score for a single skill.
 * score = pLLM × affordance
 *
 * @param {{ llm: number, aff: number }} skill
 * @returns {number}
 */
export function score(skill) {
  return skill.llm * skill.aff;
}

/**
 * Returns the scored skill table, each entry augmented with a `score` field.
 * Skills are NOT sorted — order matches the original skills() array.
 *
 * @param {boolean} sponge - whether a sponge is currently in the room
 * @returns {{ n: string, llm: number, aff: number, score: number }[]}
 */
export function scoredSkills(sponge) {
  var S = skillTable(sponge);
  for (var i = 0; i < S.length; i++) S[i].score = score(S[i]);
  return S;
}
