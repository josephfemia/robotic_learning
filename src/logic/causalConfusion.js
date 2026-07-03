/**
 * causalConfusion.js — pure numeric core for the brake-light trap widget (W: causal, L3).
 *
 * Originally ported from the causal IIFE in reference/robot-learning-companion.html
 * lines 2670–2688 (two bars lerping between four constants). Phase-3 (F1) extends
 * the core so the widget can *enact* the mechanism instead of asserting it:
 *
 *   - CUES / availableCues / learnedCue — which observable feature the cloned
 *     policy attaches to: the argmax-correlation feature among those it can see.
 *     The brake-light is an *effect* of the expert's action, so its correlation
 *     with the action is perfect (1.00) and it wins whenever it is observable.
 *   - deployStep / deployTimeline — a deterministic closed-loop rollout: with no
 *     expert in the loop nothing ever lights the lamp, so a light-reading policy
 *     never brakes and every pedestrian step is a crash; a pedestrian-reading
 *     policy brakes exactly when it matters.
 *
 * The original four constants survive: trainingAccuracy is now *derived* from
 * the learned cue's correlation (1.0 with the shortcut, 0.92 without — identical
 * values to the original `incl ? 1.0 : 0.92`), and deploymentSuccess keeps the
 * original aggregate rates (`incl ? 0.06 : 0.86`) as the readout receipts.
 *
 * No DOM dependencies — pure ES module.
 */

/**
 * The two candidate observable cues the policy could attach to, with their
 * correlation to the expert's braking action in the logged demos.
 *
 * brakeLight: 1.00 — it is an effect of the very action being predicted, so in
 * logged data it co-occurs with braking perfectly (target leakage with motors).
 * pedestrian: 0.92 — the true cause, but noisier to read from pixels.
 */
export const CUES = {
  pedestrian: { corr: 0.92 },
  brakeLight: { corr: 1.0 },
};

/**
 * Which cues the policy can see, given the observation design.
 *
 * @param {boolean} includesBrakeLight - whether the observation includes the brake-light feature
 * @returns {string[]} keys into CUES
 */
export function availableCues(includesBrakeLight) {
  return includesBrakeLight ? ['pedestrian', 'brakeLight'] : ['pedestrian'];
}

/**
 * The cue the cloned policy attaches to: the argmax-correlation available cue.
 * Cloning maximises likelihood of p(a|o); it has no notion of intervention, so
 * the strongest correlate wins even when it is downstream of the action.
 *
 * @param {boolean} includesBrakeLight
 * @returns {'pedestrian'|'brakeLight'}
 */
export function learnedCue(includesBrakeLight) {
  const cues = availableCues(includesBrakeLight);
  return cues.reduce((best, c) => (CUES[c].corr > CUES[best].corr ? c : best), cues[0]);
}

/**
 * Training accuracy on logged demos = the correlation of the cue the policy
 * learned. Numerically identical to the original `incl ? 1.0 : 0.92`.
 *
 * @param {boolean} includesBrakeLight
 * @returns {number} training accuracy in [0, 1]
 */
export function trainingAccuracy(includesBrakeLight) {
  return CUES[learnedCue(includesBrakeLight)].corr;
}

/**
 * Closed-loop (deployment) success rate — aggregate over many varied scenarios,
 * kept verbatim from the original (`incl ? 0.06 : 0.86`). The light-reading
 * policy almost never initiates braking (6%); forced onto the real cause it
 * mostly succeeds (86%). The deterministic strip below is one illustrative
 * rollout; these are the aggregate receipts.
 *
 * @param {boolean} includesBrakeLight
 * @returns {number} deployment success rate in [0, 1]
 */
export function deploymentSuccess(includesBrakeLight) {
  return includesBrakeLight ? 0.06 : 0.86;
}

/**
 * The deploy strip's pedestrian schedule: 8 timesteps, pedestrians at t3 and t6.
 * Fixed and deterministic so the widget replays identically every toggle.
 */
export const DEPLOY_SCHEDULE = [false, false, true, false, false, true, false, false];

/**
 * One closed-loop deployment step. There is no expert in the loop, so the
 * brake-light is never lit at decision time — the policy itself would have to
 * brake first for the lamp to come on, and a light-reading policy is waiting
 * for exactly that signal (the deadlock at the heart of causal confusion).
 *
 * @param {'pedestrian'|'brakeLight'} cue - what the policy reads
 * @param {boolean} pedestrianPresent
 * @returns {{pedestrian: boolean, lightOn: boolean, brakes: boolean, outcome: 'cruise'|'braked'|'crash'}}
 */
export function deployStep(cue, pedestrianPresent) {
  const lightOn = false; // nobody is braking, so nothing lights the lamp
  const brakes = cue === 'brakeLight' ? lightOn : pedestrianPresent;
  const outcome = pedestrianPresent ? (brakes ? 'braked' : 'crash') : 'cruise';
  return { pedestrian: pedestrianPresent, lightOn, brakes, outcome };
}

/**
 * Full deterministic deploy rollout for the given observation design.
 *
 * @param {boolean} includesBrakeLight
 * @param {boolean[]} [schedule=DEPLOY_SCHEDULE] - pedestrian appearance per step
 * @returns {Array<ReturnType<typeof deployStep>>}
 */
export function deployTimeline(includesBrakeLight, schedule = DEPLOY_SCHEDULE) {
  const cue = learnedCue(includesBrakeLight);
  return schedule.map((p) => deployStep(cue, p));
}
