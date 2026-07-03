/**
 * quizzes.js — single source of truth for all 42 self-check questions.
 *
 * Each object shape:
 *   id       {string}  stable unique key (src + 1-based index within that lecture)
 *   src      {string}  lecture section id (e.g. 'primer', 'l1' … 'l12')
 *   correct  {string}  data-k of the correct option (e.g. 'b')
 *   question {string}  inner HTML of the <p class="q-text">, verbatim
 *   options  {Array<{k:string, html:string}>}  option body HTML (without the .ok letter span)
 *   expl     {string}  inner HTML of the <div class="expl">, verbatim
 *
 * SOURCE_LABELS (T map): lecture id → display label used in ReviewDeck
 * (verbatim from the utility IIFE ~line 3356 of the reference)
 */

export const SOURCE_LABELS = {
  primer: 'Primer',
  l1:  'L01 · Introduction',
  l2:  'L02 · Control & MDPs',
  l3:  'L03 · Imitation',
  l4:  'L04 · RL I',
  l5:  'L05 · RL II',
  l6:  'L06 · Generative Models',
  l7:  'L07 · Sequence Modeling',
  l8:  'L08 · World Models',
  l9:  'L09 · Generalist Policies',
  l10: 'L10 · Embodied Reasoning',
  l11: 'L11 · Frontier',
  l12: 'L12 · Guest Lectures',
};

/** Ordered list used to render grouped review deck */
export const REVIEW_ORDER = ['primer', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12'];

const quizzes = [

  // ── PRIMER (4 questions) ────────────────────────────────────────────────────

  {
    id: 'primer-1',
    src: 'primer',
    correct: 'b',
    question: `In the annuity-due recursion \\(\\ddot a_x = 1 + v\\,p_x\\,\\ddot a_{x+1}\\), which RL quantity plays the role of \\(p_x\\)?`,
    options: [
      { k: 'a', html: `The discount factor \\(\\gamma\\)` },
      { k: 'b', html: `The transition probability to the next (non-terminal) state` },
      { k: 'c', html: `The reward \\(r\\)` },
      { k: 'd', html: `The learning rate \\(\\alpha\\)` },
    ],
    expl: `<strong>B.</strong> Survival probability \\(p_x\\) is exactly \\(P(s'|s)\\) into the "alive at \\(x{+}1\\)" state, with death as an absorbing state of value zero. \\(v\\) plays \\(\\gamma\\), the payment of 1 plays \\(r\\), and the recursion itself is the Bellman equation for a fixed policy.`,
  },

  {
    id: 'primer-2',
    src: 'primer',
    correct: 'c',
    question: `A colleague says: "RL is just supervised learning with a different loss." What's the most important thing that answer misses?`,
    options: [
      { k: 'a', html: `RL uses neural networks; supervised learning doesn't have to` },
      { k: 'b', html: `RL requires discrete actions` },
      { k: 'c', html: `In RL the agent's own behavior determines the data distribution it trains and is evaluated on` },
      { k: 'd', html: `RL cannot use gradient descent` },
    ],
    expl: `<strong>C.</strong> The defining feature is closed-loop data: actions influence future states (and future training data), so the i.i.d. assumption fails, exploration matters, and credit must be assigned across time. Losses differ too, but that's downstream of this.`,
  },

  {
    id: 'primer-3',
    src: 'primer',
    correct: 'a',
    question: `Why does contact (touching objects, ground) specifically push robotics toward learning-based methods?`,
    options: [
      { k: 'a', html: `Contact dynamics are discontinuous and friction-dominated, making accurate first-principles models extremely hard` },
      { k: 'b', html: `Contact makes the robot's state space infinite-dimensional` },
      { k: 'c', html: `Sensors stop working during contact` },
      { k: 'd', html: `Contact violates the Markov property` },
    ],
    expl: `<strong>A.</strong> Free-space rigid-body motion follows clean equations \\(M\\ddot q + C\\dot q + g = \\tau\\). Contact adds stick/slip friction, impacts, and deformation — discontinuous, parameter-sensitive physics that's hard to identify. Learning sidesteps explicit modeling by training on experience of the real (or randomized simulated) thing.`,
  },

  {
    id: 'primer-4',
    src: 'primer',
    correct: 'b',
    question: `With \\(\\gamma = 0.99\\), roughly how far ahead does an agent effectively "see," and what quantity says so?`,
    options: [
      { k: 'a', html: `About 10 steps — \\(\\gamma^{10} \\approx 0.9\\) is where the future starts to fade` },
      { k: 'b', html: `About 100 steps — the total weight on the future, \\(\\sum_k \\gamma^k = 1/(1-\\gamma) = 100\\), acts as an effective planning horizon` },
      { k: 'c', html: `Exactly 99 steps, because \\(\\gamma^{99} = 0\\)` },
      { k: 'd', html: `Infinitely far — every future reward gets nonzero weight, so no horizon can be assigned` },
    ],
    expl: `<strong>B.</strong> Geometric weights never actually reach zero (so C is false and D is technically true but useless); the honest one-number summary is the total mass \\(\\sum_k \\gamma^k = 1/(1-\\gamma)\\), which behaves like a horizon: \\(\\gamma=0.99\\) → ~100 steps, \\(\\gamma=0.9\\) → ~10. This single free parameter silently sets how far-sighted every algorithm in the course is — and it's the same \\(v = 1/(1+i)\\) you discount cash flows with.`,
  },

  // ── L1 (3 questions) ────────────────────────────────────────────────────────

  {
    id: 'l1-1',
    src: 'l1',
    correct: 'c',
    question: `Which is the most fundamental reason robot learning can't simply reuse the vision/NLP playbook wholesale?`,
    options: [
      { k: 'a', html: `Robots need C++ instead of Python` },
      { k: 'b', html: `Neural networks can't output continuous values` },
      { k: 'c', html: `There's no web-scale corpus of robot action data, and collecting it requires acting in the physical world` },
      { k: 'd', html: `Robot tasks have no objective functions` },
    ],
    expl: `<strong>C.</strong> Vision/NLP scaled on free internet data. Robot experience must be generated — by teleoperators, simulators, or risky autonomous interaction. This scarcity shapes the entire field, from imitation learning's popularity to the VLA bet of importing internet knowledge.`,
  },

  {
    id: 'l1-2',
    src: 'l1',
    correct: 'b',
    question: `A factory robot places the same part on the same fixture 10,000×/day. A startup wants a robot to tidy arbitrary homes. Which statement best reflects the lecture's view?`,
    options: [
      { k: 'a', html: `Both need learning; classical control is obsolete` },
      { k: 'b', html: `The factory is well served classically; the home's diversity and contact-richness is where learning earns its keep` },
      { k: 'c', html: `The home robot just needs better cameras` },
      { k: 'd', html: `Neither needs learning if the dynamics equations are known` },
    ],
    expl: `<strong>B.</strong> Structured, repeatable, instrumented settings are exactly where model-based methods excel. Learning targets the long tail: unmodeled diversity, perception-in-clutter, and contact — the home, not the fixture.`,
  },

  {
    id: 'l1-3',
    src: 'l1',
    correct: 'd',
    question: `Moravec's paradox predicts which of these orderings of difficulty <em>for machines</em>?`,
    options: [
      { k: 'a', html: `Folding laundry &lt; proving theorems &lt; playing Go` },
      { k: 'b', html: `All sensorimotor and symbolic tasks are equally hard` },
      { k: 'c', html: `Playing Go &gt; folding laundry, because Go has more states` },
      { k: 'd', html: `Proving theorems and Go fell first; folding laundry remains frontier` },
    ],
    expl: `<strong>D.</strong> Abstract reasoning yielded to computation early; everyday sensorimotor skill — perception + dexterity under contact — remains hardest, because evolution optimized it for eons and our introspection hides its difficulty.`,
  },

  // ── L2 (3 questions) ────────────────────────────────────────────────────────

  {
    id: 'l2-1',
    src: 'l2',
    correct: 'b',
    question: `Policy evaluation for fixed \\(\\pi\\) reduces to \\(V^\\pi = (I - \\gamma P^\\pi)^{-1} r^\\pi\\). Why is the inverse guaranteed to exist?`,
    options: [
      { k: 'a', html: `\\(P^\\pi\\) is symmetric` },
      { k: 'b', html: `\\(P^\\pi\\) is a stochastic matrix (spectral radius 1), so \\(\\gamma P^\\pi\\) has spectral radius \\(\\gamma &lt; 1\\), making \\(I - \\gamma P^\\pi\\) invertible` },
      { k: 'c', html: `Rewards are bounded` },
      { k: 'd', html: `It isn't guaranteed; one must check case by case` },
    ],
    expl: `<strong>B.</strong> Eigenvalues of \\(\\gamma P^\\pi\\) sit inside the disk of radius \\(\\gamma\\), so 1 is never an eigenvalue and the Neumann series \\(\\sum_k (\\gamma P^\\pi)^k\\) converges to the inverse — the matrix form of "the discounted sum of a probability-weighted future is finite." Same reason your EPVs converge.`,
  },

  {
    id: 'l2-2',
    src: 'l2',
    correct: 'c',
    question: `What does LQR contribute conceptually to the RL story, beyond being a classical algorithm?`,
    options: [
      { k: 'a', html: `It shows feedback is unnecessary when models are known` },
      { k: 'b', html: `It proves all control problems have linear solutions` },
      { k: 'c', html: `It exhibits a value function (quadratic cost-to-go) computed by exact Bellman backward recursion — the template RL approximates when models are unknown` },
      { k: 'd', html: `It eliminates the need for a reward function` },
    ],
    expl: `<strong>C.</strong> LQR is the rare case where the Bellman recursion stays in closed form (quadratics in, quadratics out). RL = the same conceptual objects (value, greedy improvement) when \\(f\\) is unknown/nonlinear and you only get samples.`,
  },

  {
    id: 'l2-3',
    src: 'l2',
    correct: 'a',
    question: `Your shaped reward for "walk forward" includes a bonus proportional to forward velocity of the torso. The learned policy dives headfirst repeatedly. What happened?`,
    options: [
      { k: 'a', html: `Reward hacking: diving maximizes the written signal (brief high torso velocity) without achieving the intent (sustained locomotion)` },
      { k: 'b', html: `The discount factor was too low` },
      { k: 'c', html: `Value iteration failed to converge` },
      { k: 'd', html: `The Markov property was violated` },
    ],
    expl: `<strong>A.</strong> Classic specification gaming: the optimizer is faithful to your proxy, not your intent. Fixes include termination penalties, survival bonuses, better shaping — or, per L5's Eureka paper, letting an LLM iterate on the reward code against rollout feedback.`,
  },

  // ── L3 (3 questions) ────────────────────────────────────────────────────────

  {
    id: 'l3-1',
    src: 'l3',
    correct: 'c',
    question: `BC achieves 99% per-step accuracy on held-out expert states for a 500-step task, yet full rollouts almost always fail. The <em>most</em> likely explanation:`,
    options: [
      { k: 'a', html: `The network is underfitting` },
      { k: 'b', html: `The horizon is too short for errors to matter` },
      { k: 'c', html: `Early small errors push the robot off the demo distribution, where accuracy guarantees say nothing and errors compound` },
      { k: 'd', html: `The reward function is misspecified` },
    ],
    expl: `<strong>C.</strong> Held-out accuracy is measured on \\(d^{\\pi^*}\\); execution happens on \\(d^{\\pi_\\theta}\\). With 500 steps, even tiny drift probabilities compound — the \\(O(\\epsilon T^2)\\) mechanism. (D is a distractor: BC has no reward function.)`,
  },

  {
    id: 'l3-2',
    src: 'l3',
    correct: 'b',
    question: `What is the essential ingredient DAgger adds over BC, stated abstractly?`,
    options: [
      { k: 'a', html: `A bigger network trained longer` },
      { k: 'b', html: `Training data drawn from the <em>learner's</em> state distribution, labeled by the expert` },
      { k: 'c', html: `A learned reward replacing expert labels` },
      { k: 'd', html: `Lower variance gradients` },
    ],
    expl: `<strong>B.</strong> DAgger changes <em>whose</em> distribution generates training states — from expert's to learner's — eliminating the mismatch by construction and cutting worst-case regret from \\(O(\\epsilon T^2)\\) to \\(O(\\epsilon T)\\). Cost: an expert available for on-demand labeling.`,
  },

  {
    id: 'l3-3',
    src: 'l3',
    correct: 'd',
    question: `Demos avoid a pillar by going left 50% and right 50%. A deterministic MSE-trained policy will most likely:`,
    options: [
      { k: 'a', html: `Choose left or right at random each episode` },
      { k: 'b', html: `Pick whichever side was marginally more common` },
      { k: 'c', html: `Refuse to move` },
      { k: 'd', html: `Output the average of the two maneuvers and head toward the pillar` },
    ],
    expl: `<strong>D.</strong> MSE-optimal prediction is the conditional mean; the mean of "veer left" and "veer right" is "straight ahead." Multimodal action distributions need multimodal policy classes — mixtures, EBMs, or diffusion (L6).`,
  },

  // ── L4 (4 questions) ────────────────────────────────────────────────────────

  {
    id: 'l4-1',
    src: 'l4',
    correct: 'b',
    question: `Why can DQN use a replay buffer while basic policy-gradient methods (L5 preview) cannot, without correction?`,
    options: [
      { k: 'a', html: `Replay buffers only store images` },
      { k: 'b', html: `Q-learning's target is off-policy — valid for transitions from any behavior — whereas the vanilla policy gradient is an expectation under the <em>current</em> policy` },
      { k: 'c', html: `Policy gradients don't use neural networks` },
      { k: 'd', html: `They can; it's purely an engineering choice` },
    ],
    expl: `<strong>B.</strong> The Q-learning target \\(r + \\gamma\\max_{a'}Q(s',a')\\) is a statement about the transition itself, true regardless of who chose \\(a\\). The policy gradient theorem's expectation is over \\(d^{\\pi_\\theta}\\) — old data is the wrong distribution unless importance-weighted (which is exactly the thread PPO pulls in L5).`,
  },

  {
    id: 'l4-2',
    src: 'l4',
    correct: 'a',
    question: `TD(0) vs. Monte Carlo in one line:`,
    options: [
      { k: 'a', html: `TD trades variance for bias by bootstrapping off its own estimate; MC is unbiased but high-variance and episode-bound` },
      { k: 'b', html: `TD is unbiased; MC is biased` },
      { k: 'c', html: `They are identical when \\(\\gamma = 1\\)` },
      { k: 'd', html: `MC requires a model of \\(P(s'|s,a)\\)` },
    ],
    expl: `<strong>A.</strong> MC's target \\(G_t\\) is a true sample of the definition (unbiased, variance of a whole episode). TD's target \\(r + \\gamma V(s_{t+1})\\) contains the current estimate — one step of noise (low variance), but biased until \\(V\\) converges. \\(n\\)-step methods interpolate.`,
  },

  {
    id: 'l4-3',
    src: 'l4',
    correct: 'd',
    question: `Why does vanilla value-based control hit a wall on a 7-DoF arm specifically at the action space?`,
    options: [
      { k: 'a', html: `Seven dimensions exceed what neural networks can input` },
      { k: 'b', html: `Continuous actions make rewards undefined` },
      { k: 'c', html: `The replay buffer can't store real-valued actions` },
      { k: 'd', html: `Both acting and forming targets require \\(\\max_a Q(s,a)\\) — an inner nonconvex optimization over \\(\\mathbb R^7\\) at every step` },
    ],
    expl: `<strong>D.</strong> The max is the engine of Q-learning, and it's intractable over continuous high-dimensional actions (discretization explodes exponentially). Escapes: restructure actions (Zeng's pixel-wise Q-maps), or maintain an explicit actor — Lecture 5.`,
  },

  {
    id: 'l4-4',
    src: 'l4',
    correct: 'b',
    question: `DQN's target network addresses which instability, specifically?`,
    options: [
      { k: 'a', html: `Consecutive transitions are temporally correlated, breaking the i.i.d. assumption of SGD` },
      { k: 'b', html: `The regression target \\(r + \\gamma\\max_{a'}Q_\\phi(s',a')\\) moves every time \\(\\phi\\) updates — the network chases its own freshly-updated estimate` },
      { k: 'c', html: `The \\(\\max\\) over noisy Q-estimates systematically biases the target high` },
      { k: 'd', html: `\\(\\max_a Q(s,a)\\) is intractable over continuous action spaces` },
    ],
    expl: `<strong>B.</strong> Bootstrapped targets are built from the very parameters being trained, so this isn't gradient descent on any fixed objective — it's regression on a moving target. Freezing a copy \\(\\phi^-\\) and updating it only periodically turns that into a sequence of quasi-stationary regression problems. Each distractor names a <em>real</em> §4.4 problem with a <em>different</em> cure: correlation → the replay buffer (A), overestimation bias → Double DQN (C), continuous actions → the action-space wall that actor methods answer in L5 (D).`,
  },

  // ── L5 (4 questions) ────────────────────────────────────────────────────────

  {
    id: 'l5-1',
    src: 'l5',
    correct: 'c',
    question: `In the REINFORCE derivation, the environment dynamics \\(p(s_{t+1}|s_t,a_t)\\) vanish from the gradient because:`,
    options: [
      { k: 'a', html: `They are assumed deterministic` },
      { k: 'b', html: `The discount factor suppresses them` },
      { k: 'c', html: `\\(\\log P(\\tau)\\) splits into a sum, and the dynamics terms carry no \\(\\theta\\)-dependence, so \\(\\nabla_\\theta\\) kills them` },
      { k: 'd', html: `They cancel against the baseline` },
    ],
    expl: `<strong>C.</strong> \\(\\log P(\\tau;\\theta) = \\log p(s_0) + \\sum_t \\log \\pi_\\theta(a_t|s_t) + \\sum_t \\log p(s_{t+1}|s_t,a_t)\\); only the middle sum depends on \\(\\theta\\). The dynamics still shape <em>which trajectories get sampled</em> — they're in the expectation's distribution — but never need to be known or differentiated. That's the precise meaning of model-free policy search.`,
  },

  {
    id: 'l5-2',
    src: 'l5',
    correct: 'b',
    question: `Why does subtracting a state-dependent baseline \\(b(s_t)\\) leave the policy gradient unbiased?`,
    options: [
      { k: 'a', html: `Because \\(b\\) is small relative to returns` },
      { k: 'b', html: `Because \\(\\mathbb E_{a\\sim\\pi}[\\nabla_\\theta\\log\\pi_\\theta(a|s)] = \\nabla_\\theta\\!\\int\\!\\pi_\\theta\\,da = \\nabla_\\theta 1 = 0\\), so \\(b(s)\\) multiplies a zero-mean quantity` },
      { k: 'c', html: `Because the critic is trained to convergence first` },
      { k: 'd', html: `It doesn't — baselines trade bias for variance` },
    ],
    expl: `<strong>B.</strong> The expected score is identically zero (differentiate the normalization constraint), so any action-independent multiplier contributes zero in expectation while reshaping per-sample magnitudes — pure variance reduction, the RL incarnation of a control variate. Had \\(b\\) depended on \\(a_t\\), this would fail.`,
  },

  {
    id: 'l5-3',
    src: 'l5',
    correct: 'd',
    question: `PPO's clipped objective uses \\(\\min\\big(r_t\\hat A_t,\\ \\text{clip}(r_t,1\\pm\\epsilon)\\hat A_t\\big)\\). The clip's function is best described as:`,
    options: [
      { k: 'a', html: `Normalizing advantages to unit variance` },
      { k: 'b', html: `Preventing the critic from overfitting` },
      { k: 'c', html: `Bounding the reward magnitude` },
      { k: 'd', html: `Removing the incentive to move \\(\\pi_\\theta\\) more than ~\\(\\epsilon\\) away (per action probability ratio) from the policy that collected the data, enabling safe multi-epoch reuse of each batch` },
    ],
    expl: `<strong>D.</strong> Once \\(r_t\\) exits \\([1-\\epsilon, 1+\\epsilon]\\) in the advantage-favored direction, the objective's gradient w.r.t. further movement is zero — a soft trust region. The min keeps the pessimistic side live so corrective updates are never blocked. This is what lets PPO take many SGD epochs per rollout batch without the stale-gradient collapse of vanilla PG.`,
  },

  {
    id: 'l5-4',
    src: 'l5',
    correct: 'a',
    question: `You have one real robot arm, two hours of budget, a sparse task reward, and a handful of demos. Which setup does this lecture's logic point to?`,
    options: [
      { k: 'a', html: `Off-policy actor-critic (SAC-family) seeded with the demos in the replay buffer, plus human interventions — the HIL-SERL recipe` },
      { k: 'b', html: `PPO from scratch on the hardware` },
      { k: 'c', html: `Tabular Q-learning` },
      { k: 'd', html: `REINFORCE without a baseline` },
    ],
    expl: `<strong>A.</strong> Two hours of hardware time ≈ a few thousand transitions — on-policy methods (B, D) starve, and they'd discard the demos. Off-policy replay exploits every transition repeatedly, demos bootstrap exploration past the sparse-reward desert, and interventions keep it safe. This decision logic — match the algorithm class to the data economics — is the lecture's real takeaway.`,
  },

  // ── L6 (3 questions) ────────────────────────────────────────────────────────

  {
    id: 'l6-1',
    src: 'l6',
    correct: 'b',
    question: `Why does a diffusion policy handle "grasp by handle OR rim" where MSE regression fails?`,
    options: [
      { k: 'a', html: `It has more parameters` },
      { k: 'b', html: `It represents the full conditional action distribution; sampling commits to one mode per draw instead of averaging modes` },
      { k: 'c', html: `It uses a larger learning rate` },
      { k: 'd', html: `It observes more camera views` },
    ],
    expl: `<strong>B.</strong> MSE-optimal output is the conditional mean — between the modes, hitting neither handle nor rim. Diffusion's iterative denoising flows each noise seed into one basin of \\(p(a|o)\\): every sample is a <em>coherent</em> choice. Expressive likelihood, not capacity, is the difference.`,
  },

  {
    id: 'l6-2',
    src: 'l6',
    correct: 'c',
    question: `Why did π0 choose a flow-matching head over diffusion for 50 Hz control?`,
    options: [
      { k: 'a', html: `Flow matching is strictly more expressive than diffusion` },
      { k: 'b', html: `Flow matching needs no training data — the velocity field is known analytically` },
      { k: 'c', html: `Its learned noise→data paths are nearly straight, so sampling — integrating the ODE \\(\\dot x = v_\\theta(x,t)\\) — needs only a few network evaluations, fitting a real-time latency budget` },
      { k: 'd', html: `Flow matching guarantees the sampled action distribution is unimodal` },
    ],
    expl: `<strong>C.</strong> Training regresses the constant velocity \\(x_0 - \\varepsilon\\) along straight interpolation paths \\(x_t = (1-t)\\varepsilon + t\\,x_0\\), so the learned field can be integrated in a handful of big steps where diffusion's curved, noisy reverse chain needs many — and step count <em>is</em> the latency budget when a policy must emit ~50 action chunks per second. Both model the same lumpy \\(p(a|o)\\) (A is false; D is backwards — multimodality is the whole point), and the field is learned from demos like anything else (B). "Flow matching ≈ diffusion with straight roads."`,
  },

  {
    id: 'l6-3',
    src: 'l6',
    correct: 'a',
    question: `DSRL runs RL in a frozen diffusion policy's latent-noise space rather than directly on robot actions. The chief advantage:`,
    options: [
      { k: 'a', html: `The search space is demo-shaped: every point decodes to a plausible, demo-like action — safe, sample-efficient exploration` },
      { k: 'b', html: `It removes the need for a reward function` },
      { k: 'c', html: `Noise vectors are easier to store in replay buffers` },
      { k: 'd', html: `It guarantees convergence to the global optimum` },
    ],
    expl: `<strong>A.</strong> The frozen generative policy acts as a learned action manifold: RL explores <em>within the support of demonstrated behavior</em> instead of in raw torque space. Exploration risk and sample complexity collapse together — the recurring trick of putting RL on top of a generative prior.`,
  },

  // ── L7 (3 questions) ────────────────────────────────────────────────────────

  {
    id: 'l7-1',
    src: 'l7',
    correct: 'c',
    question: `Decision Transformer is best characterized as:`,
    options: [
      { k: 'a', html: `An on-policy policy-gradient method` },
      { k: 'b', html: `Model-based RL with a learned world model` },
      { k: 'c', html: `Outcome-conditioned imitation: supervised next-action prediction given desired return-to-go` },
      { k: 'd', html: `Q-learning with attention` },
    ],
    expl: `<strong>C.</strong> No Bellman backups, no gradient of expected return — just cross-entropy on offline sequences with return-to-go as conditioning context, and a hopeful prompt at test time. Hence its grace (stability, scalability) and its limit (weak trajectory stitching vs. dynamic programming).`,
  },

  {
    id: 'l7-2',
    src: 'l7',
    correct: 'a',
    question: `ACT predicts ~100-action chunks at 50 Hz. Connect this to Lecture 3's theory:`,
    options: [
      { k: 'a', html: `Chunking divides the number of sequential decisions by ~100, directly attacking the \\(O(\\epsilon T^2)\\) compounding-error bound` },
      { k: 'b', html: `Chunking increases \\(T\\), which increases accuracy` },
      { k: 'c', html: `Chunking removes covariate shift entirely` },
      { k: 'd', html: `Chunking only matters for discrete actions` },
    ],
    expl: `<strong>A.</strong> Compounding error scales with the number of times the policy re-decides from its own (possibly drifted) state distribution. 1,500 control ticks → ~15 chunk decisions shrinks effective \\(T\\) two orders of magnitude; temporal ensembling then restores smoothness. Same medicine as Diffusion Policy's chunks (L6).`,
  },

  {
    id: 'l7-3',
    src: 'l7',
    correct: 'd',
    question: `Why is modality-aligned masking (training with action tokens masked out) strategically important beyond one humanoid paper?`,
    options: [
      { k: 'a', html: `It speeds up attention computation` },
      { k: 'b', html: `It removes the need for proprioception` },
      { k: 'c', html: `It prevents overfitting on small datasets` },
      { k: 'd', html: `It lets one model train on action-free data — human video, mocap — partially converting the internet into robot training data` },
    ],
    expl: `<strong>D.</strong> The field's binding constraint is action-labeled data scarcity (L1). Masking makes "observations without actions" a first-class training signal, opening video-scale corpora. The same motivation drives world models (L8) and VLA pretraining (L9): import knowledge from data robots didn't collect.`,
  },

  // ── L8 (3 questions) ────────────────────────────────────────────────────────

  {
    id: 'l8-1',
    src: 'l8',
    correct: 'b',
    question: `Dreamer trains its actor-critic on imagined latent rollouts. The deepest reason this is more than a compute trick:`,
    options: [
      { k: 'a', html: `Latent rollouts have zero variance` },
      { k: 'b', html: `One real dataset funds unlimited, parallel, differentiable practice — decoupling behavior learning from real-world sample cost (and enabling gradients through dynamics)` },
      { k: 'c', html: `It removes the need for a reward signal` },
      { k: 'd', html: `Imagined data has no distribution shift` },
    ],
    expl: `<strong>B.</strong> The model converts experience (expensive, dangerous) into a renewable resource (imagination), and being differentiable, it offers a gradient pathway real environments never provide. The price — imagined data <em>does</em> shift from reality (D is false) — is paid via short horizons and continual re-grounding.`,
  },

  {
    id: 'l8-2',
    src: 'l8',
    correct: 'd',
    question: `UniPi needs an inverse dynamics model because:`,
    options: [
      { k: 'a', html: `Video models can't be conditioned on text` },
      { k: 'b', html: `The IDM generates the video frames` },
      { k: 'c', html: `It replaces the reward function` },
      { k: 'd', html: `Generated video specifies <em>what should happen</em> but contains no motor commands; the IDM translates consecutive frames into the actions that realize the transition` },
    ],
    expl: `<strong>D.</strong> The division of labor: the video model plans in observation space (where internet-scale priors live); the small, supervised IDM — trainable from modest robot data — handles the observation→action translation. Each component trains on the data that's actually abundant for it.`,
  },

  {
    id: 'l8-3',
    src: 'l8',
    correct: 'a',
    question: `"Model exploitation" in model-based RL is most analogous to which earlier phenomenon?`,
    options: [
      { k: 'a', html: `DDPG's actor climbing into the critic's value hallucinations / offline RL's extrapolation error — optimizing against a learned approximation seeks out its mistakes` },
      { k: 'b', html: `ε-greedy exploration` },
      { k: 'c', html: `Reward discounting` },
      { k: 'd', html: `Temporal ensembling in ACT` },
    ],
    expl: `<strong>A.</strong> One disease, three hosts: actor-vs-critic, policy-vs-offline-Q, planner-vs-world-model. The optimizer's pressure flows toward the approximator's errors. Recognizing this pattern — and its standard cures (pessimism, short horizons, fresh data) — is a genuine mark of fluency in this field.`,
  },

  // ── L9 (3 questions) ────────────────────────────────────────────────────────

  {
    id: 'l9-1',
    src: 'l9',
    correct: 'c',
    question: `RT-2's qualitative leap over RT-1 — handling "pick up the extinct animal" — came from:`,
    options: [
      { k: 'a', html: `10× more robot demonstrations` },
      { k: 'b', html: `A higher-resolution camera` },
      { k: 'c', html: `Building on a web-pretrained VLM (with co-training), so internet-scale semantics ground language the robot data never contained` },
      { k: 'd', html: `Switching from transformers to diffusion` },
    ],
    expl: `<strong>C.</strong> No robot dataset teaches what "extinct" means. The VLM backbone imports that knowledge; action-token fine-tuning connects it to motors; co-training on web data prevents catastrophic forgetting of it. This is the single most important idea of the lecture: robot data teaches <em>control</em>; the internet teaches <em>meaning</em>.`,
  },

  {
    id: 'l9-2',
    src: 'l9',
    correct: 'a',
    question: `Why is "learning from play" such an attractive data strategy compared to per-task demonstrations?`,
    options: [
      { k: 'a', html: `Play is cheap, diverse, and never off-distribution for itself; hindsight relabeling converts <em>all</em> of it into goal-conditioned supervision without task scripting` },
      { k: 'b', html: `Play data contains reward labels` },
      { k: 'c', html: `Play eliminates the need for teleoperation` },
      { k: 'd', html: `Play data is i.i.d.` },
    ],
    expl: `<strong>A.</strong> The collection bottleneck (L1) is cost per useful supervised example. Play has no script overhead, covers the state space broadly (helping the L3 distribution-shift problem), and hindsight makes every segment a labeled example of reaching its own endpoint — supervision density approaching 100%.`,
  },

  {
    id: 'l9-3',
    src: 'l9',
    correct: 'd',
    question: `π*0.6's significance, in the conceptual vocabulary of this course:`,
    options: [
      { k: 'a', html: `It proves world models are unnecessary` },
      { k: 'b', html: `It shows discrete action tokens beat flow matching` },
      { k: 'c', html: `It removes language conditioning from VLAs` },
      { k: 'd', html: `It breaks imitation's ceiling at foundation scale: value functions + advantage-conditioned updates let a deployed VLA improve from its own autonomous experience` },
    ],
    expl: `<strong>D.</strong> L3 established that pure imitation tops out at demonstrator quality; L5 established RL as the way past it; L7 supplied outcome-conditioning as a stable update mechanism. π*0.6 is those three lectures composed into a production system — and a statement about where the field is heading: experience, not just demonstrations, as the fuel.`,
  },

  // ── L10 (3 questions) ───────────────────────────────────────────────────────

  {
    id: 'l10-1',
    src: 'l10',
    correct: 'b',
    question: `In SayCan, what specifically prevents the robot from pursuing a semantically sensible but currently impossible step?`,
    options: [
      { k: 'a', html: `The LLM is fine-tuned on the robot's failures` },
      { k: 'b', html: `Each skill's learned value function scores its success probability from the current observation, multiplying (and vetoing) the LLM's semantic score` },
      { k: 'c', html: `A human approves each step` },
      { k: 'd', html: `The skill library only contains feasible skills` },
    ],
    expl: `<strong>B.</strong> Feasibility is state-dependent — no static library or fine-tune captures "is there a sponge <em>here, now</em>." The value function (L4–L5's object, repurposed) is the grounding term; the LLM never has to know the room.`,
  },

  {
    id: 'l10-2',
    src: 'l10',
    correct: 'd',
    question: `Voyager improves over time without any gradient updates. Where does the "learning" live?`,
    options: [
      { k: 'a', html: `In a replay buffer` },
      { k: 'b', html: `In slowly updated value networks` },
      { k: 'c', html: `It doesn't actually improve` },
      { k: 'd', html: `In an external, growing library of verified, executable skill code that future episodes retrieve and compose` },
    ],
    expl: `<strong>D.</strong> Competence accumulates as <em>software</em>: each environment-verified program is permanent, inspectable, and composable. It's a different substrate for learning than weights — with different strengths (no forgetting, perfect reuse) and limits (only as good as what code + primitives can express).`,
  },

  {
    id: 'l10-3',
    src: 'l10',
    correct: 'a',
    question: `The lecture's caution about test-time scaling in robotics centers on:`,
    options: [
      { k: 'a', html: `Verification: best-of-N needs a cheap, reliable judge of candidate actions, and judging physical success can be as hard as acting — plus thinking time fights control latency` },
      { k: 'b', html: `GPUs cannot run on robots` },
      { k: 'c', html: `Sampling multiple plans is mathematically unsound` },
      { k: 'd', html: `Test-time compute only helps discrete action spaces` },
    ],
    expl: `<strong>A.</strong> The generator-verifier gap is the whole game: language tasks often verify cheaply (run the unit test); physical outcomes may not (will the grasp hold?). Where learned value functions/verifiers are trustworthy, sample-and-select pays; where they aren't, extra inference compute buys confident mistakes — under a deadline.`,
  },

  // ── L11 (3 questions) ───────────────────────────────────────────────────────

  {
    id: 'l11-1',
    src: 'l11',
    correct: 'c',
    question: `The strongest <em>internal</em> tension in applying the Bitter Lesson to robotics is:`,
    options: [
      { k: 'a', html: `Robots cannot use transformers` },
      { k: 'b', html: `Search doesn't apply to continuous spaces` },
      { k: 'c', html: `The lesson's engine is converting cheap computation into experience/search — but physical experience doesn't get cheaper with Moore's law, so the conversion rate that powered chess/Go/vision is missing` },
      { k: 'd', html: `Human knowledge has never helped robotics` },
    ],
    expl: `<strong>C.</strong> Sutton's examples scaled because compute ↔ experience was nearly free (self-play, web data). Robot experience is gated by physics, hardware, and safety. Hence the field's actual strategies — sim, video, cross-embodiment pooling, world models — are all attempts to <em>restore</em> the cheap-experience premise rather than naive applications of the lesson.`,
  },

  {
    id: 'l11-2',
    src: 'l11',
    correct: 'a',
    question: `JEPA's "predict in representation space, not pixel space" is motivated chiefly by:`,
    options: [
      { k: 'a', html: `Not wasting model capacity on unpredictable, task-irrelevant detail — abstract the future before predicting it` },
      { k: 'b', html: `Pixels are too large to store` },
      { k: 'c', html: `Representation prediction is convex` },
      { k: 'd', html: `It enables larger batch sizes` },
    ],
    expl: `<strong>A.</strong> Exact future pixels (leaf flutter, sensor noise) are unpredictable and irrelevant; forcing their reconstruction (as classic world models do) spends capacity on noise. Predicting embeddings lets the model choose <em>what about the future is worth predicting</em> — with the known hazard (representation collapse) that JEPA training methods exist to prevent.`,
  },

  {
    id: 'l11-3',
    src: 'l11',
    correct: 'd',
    question: `A 2026 system uses an LLM to write plans executed by learned low-level skills. Brooks (1991) would most likely object that:`,
    options: [
      { k: 'a', html: `The LLM is too small` },
      { k: 'b', html: `The skills should be hand-coded` },
      { k: 'c', html: `Plans should be longer` },
      { k: 'd', html: `It rebuilds the sense→model→plan→act pipeline he attacked: slow symbolic deliberation atop the world, instead of intelligence grounded in tight perception-action coupling — and the world will outrun the plan` },
    ],
    expl: `<strong>D.</strong> Brooks's critique targets the architecture, not the implementation technology: deliberation over an internal (now linguistic) model, loosely coupled to real-time sensing, fails when reality changes mid-plan. Modern hierarchical answers (fast reactive layer + slow reasoner, L10) are, fittingly, a Brooks–LLM compromise.`,
  },

  // ── L12 (3 questions) ───────────────────────────────────────────────────────

  {
    id: 'l12-1',
    src: 'l12',
    correct: 'b',
    question: `Final synthesis check. Which single sentence best captures the course's recurring failure-and-fix pattern?`,
    options: [
      { k: 'a', html: `Bigger networks fail less; scale is the universal medicine` },
      { k: 'b', html: `Optimizing against a learned approximation drives the system toward the approximation's errors; the cures are pessimism, short horizons, structure, and fresh real data` },
      { k: 'c', html: `On-policy methods are always safer than off-policy methods` },
      { k: 'd', html: `Imitation and RL are incompatible paradigms` },
    ],
    expl: `<strong>B.</strong> The pattern spans BC's compounding errors, the deadly triad, critic exploitation, offline extrapolation, and world-model exploitation — and its cures echo from DAgger to CQL to Dreamer's short imaginations to π*0.6's grounded experience. If one idea from this course shapes how you read every future paper, make it this one.`,
  },

  {
    id: 'l12-2',
    src: 'l12',
    correct: 'a',
    question: `Abbeel's apprenticeship-learning work with Ng is the intellectual grandparent of which course thread?`,
    options: [
      { k: 'a', html: `Lecture 3's imitation learning — extracting behavior from expert demonstrations` },
      { k: 'b', html: `Lecture 8's world models` },
      { k: 'c', html: `Lecture 5's PPO` },
      { k: 'd', html: `Lecture 10's SayCan-style LLM planning` },
    ],
    expl: `<strong>A.</strong> Apprenticeship/inverse RL with Ng — autonomous helicopter aerobatics learned from demonstration — established "watch an expert, recover the behavior (or the reward behind it)" as a research program: L3's intellectual grandparent. C is the tempting near-miss: Abbeel's <em>later</em> Berkeley years produced TRPO and the policy-gradient lineage behind PPO, but that's a different (and descendant) branch of his arc. His career then runs the rest of the course in order — deep RL, then Covariant's robot foundation models — which is exactly why he's a guest worth hearing.`,
  },

  {
    id: 'l12-3',
    src: 'l12',
    correct: 'c',
    question: `Fox's <em>Probabilistic Robotics</em> lineage — Bayesian filtering, belief tracking — most directly anticipates which modern component?`,
    options: [
      { k: 'a', html: `PPO's clipped objective` },
      { k: 'b', html: `Action chunking in ACT and Diffusion Policy` },
      { k: 'c', html: `The RSSM's learned latent belief state at the heart of Dreamer (L8)` },
      { k: 'd', html: `Reward shaping` },
    ],
    expl: `<strong>C.</strong> <em>Probabilistic Robotics</em> cast the robot as an uncertainty-tracking machine: maintain a belief over state, update it as observations arrive. The RSSM is that idea reborn as learning — a learned nonlinear Kalman filter whose deterministic path propagates state and whose stochastic latent carries posterior uncertainty, trained by ELBO instead of derived. That's the question to bring to his lecture: are world models filtering reborn? His hands built the original. (A, B, D belong to entirely different threads — policy optimization, imitation architecture, reward design.)`,
  },

];

export default quizzes;
