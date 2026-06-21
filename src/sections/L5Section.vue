<template>
  <section class="lecture" id="l5" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">LECTURE 05 · MAR 16</span>
      <h2>Reinforcement Learning II</h2>
      <p class="dek">Policy gradients from first principles to PPO and SAC — the algorithms that actually train robots — plus the practical machinery (reward design, sim-to-real, offline RL) that turns the math into walking, grasping hardware. This is the load-bearing lecture of the course.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> L4 · calculus (gradients of expectations)</span>
      <span class="chip"><b>Time</b> ~70 min — the big one</span>
      <span class="chip"><b>Watch first</b> REINFORCE, baseline &amp; PPO-clip labs</span>
      <span class="chip"><b>Tools</b> Gymnasium / Isaac Lab · read CleanRL or SB3 PPO/SAC</span>
    </div>
    <div class="callout miscon"><span class="co-label">Watch out for</span>
      <ul>
        <li>PPO's clip does <em>not</em> guarantee a KL bound — real implementations add KL early-stopping, advantage normalization, and value clipping (§5.6).</li>
        <li>A baseline does not bias the gradient; it only reduces variance.</li>
        <li>On-policy isn't "better" — it's about which data is statistically valid to learn from.</li>
        <li>Advantage is <em>relative</em> ("better than this state's average"), not absolute reward.</li>
      </ul>
    </div>

    <h3><span class="knum">5.1</span>Why optimize the policy directly</h3>
    <p>Lecture 4 ended on a cliff: value-based control needs \(\max_a Q(s,a)\), intractable over \(\mathbb R^7\). The policy-gradient family takes the direct route: parameterize the decision rule itself, \(\pi_\theta(a|s)\) — e.g. a network outputting the mean and standard deviation of a Gaussian over joint targets — and do gradient <em>ascent</em> on the actual objective:</p>
    <p>$$J(\theta) = \mathbb E_{\tau \sim \pi_\theta}\big[R(\tau)\big], \qquad R(\tau) = \sum_{t=0}^{T}\gamma^t r_t$$</p>
    <p>Continuous actions are native (sampling a Gaussian is trivial; no inner max). Stochasticity is native (smooth exploration, and useful in partially observed settings). The price: we must differentiate an expectation taken over a distribution that <em>depends on \(\theta\)</em> — trajectories are sampled by running the very policy we're tuning. Solving that cleanly is the lecture's first act.</p>

    <h3><span class="knum">5.2</span>The policy gradient theorem (full derivation)</h3>
    <p>Write the objective as an integral over trajectories, \(J(\theta) = \int P(\tau;\theta)\,R(\tau)\,d\tau\), and differentiate:</p>
    <p>$$\nabla_\theta J = \int \nabla_\theta P(\tau;\theta)\, R(\tau)\, d\tau$$</p>
    <p>This isn't yet an expectation, so we can't sample it. The <strong>log-derivative trick</strong> — multiply and divide by \(P(\tau;\theta)\), then use \(\nabla \log f = \nabla f / f\):</p>
    <p>$$\nabla_\theta P(\tau;\theta) = P(\tau;\theta)\,\nabla_\theta \log P(\tau;\theta)$$</p>
    <p>Concretely, \(\int \nabla_\theta P(\tau;\theta)\,R\,d\tau = \int P(\tau;\theta)\,\frac{\nabla_\theta P(\tau;\theta)}{P(\tau;\theta)}\,R\,d\tau = \int P(\tau;\theta)\,\nabla_\theta \log P(\tau;\theta)\,R\,d\tau\) — and an integral of \(P(\tau;\theta)\times(\cdots)\) is exactly an expectation over \(\tau\sim\pi_\theta\).</p>
    <p>$$\Rightarrow\quad \nabla_\theta J = \mathbb E_{\tau\sim\pi_\theta}\big[\nabla_\theta \log P(\tau;\theta)\; R(\tau)\big]$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;that one trick converted "the gradient of an integral" (can't sample) into "the average of a gradient × return" (just run the policy and average). Everything after is figuring out what \(\nabla\log P\) simplifies to.</p>
    <p>Now expand the trajectory probability — it factorizes by the Markov chain structure:</p>
    <p>$$P(\tau;\theta) = p(s_0)\prod_{t} \pi_\theta(a_t|s_t)\; p(s_{t+1}|s_t,a_t)$$</p>
    <p>Take the log (products → sums) and then \(\nabla_\theta\). The initial distribution and the dynamics <strong>do not depend on \(\theta\)</strong> — their terms vanish:</p>
    <p>$$\nabla_\theta \log P(\tau;\theta) = \sum_t \nabla_\theta \log \pi_\theta(a_t|s_t)$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;the physics terms had no \(\theta\) in them, so their gradient is zero — they vanish. What's left depends only on the policy. That's the mechanical reason RL can learn without a model.</p>
    <p>$$\boxed{\;\nabla_\theta J(\theta) = \mathbb E_{\tau\sim\pi_\theta}\Big[\Big(\sum_t \nabla_\theta \log \pi_\theta(a_t|s_t)\Big)\, R(\tau)\Big]\;}$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;run the policy, then make the actions taken in good trajectories more likely and the rest less likely — each action's log-probability weighted by the return that followed. The dynamics never appear, only sampled returns.</p>
    <p>This is <strong>REINFORCE</strong>. Read it as weighted maximum likelihood: each trajectory's actions get their log-probabilities pushed up in proportion to how well the whole trajectory scored. The dynamics dropping out is the miracle — <em>the gradient of performance requires zero knowledge of physics</em>, only the ability to act and observe returns. That's what "model-free" means, mechanically.</p>

    <details class="dive"><summary>Going deeper: the score-function estimator is older than RL — and you may already know it</summary><div class="dive-body">
      <p>The identity \(\nabla_\theta \mathbb E_{x\sim p_\theta}[f(x)] = \mathbb E_{x\sim p_\theta}[f(x)\nabla_\theta \log p_\theta(x)]\) is the <strong>likelihood-ratio / score-function estimator</strong>, used for decades in simulation sensitivity analysis (how does expected portfolio loss change with a distribution parameter?) and in the EM/Fisher-score literature. REINFORCE is this estimator with \(x = \) a trajectory and \(f = \) return. Two properties to remember: it needs only the ability to <em>evaluate</em> \(f\) (not differentiate it — rewards can be black-box, discontinuous, sparse), and its variance can be enormous, because \(f(x)\) multiplies the score wholesale. The other classic way to differentiate an expectation — the <strong>reparameterization trick</strong> you know from VAEs — has far lower variance but requires \(f\) differentiable in \(x\) and a reparameterizable \(p_\theta\). Keep both in your pocket: SAC (§5.7) is built on reparameterization; REINFORCE on the score function. Much of deep learning is choosing between these two estimators.</p>
    </div></details>

    <details class="dive"><summary>Going deeper: REINFORCE in ~25 lines — watch the absence of a model</summary><div class="dive-body">
      <p>The boxed equation, as runnable-shaped pseudocode (PyTorch-flavored). The exercise: find the environment dynamics in this code. You can't — that's the theorem, made physical.</p>
<pre><code>policy = MLP(obs_dim, out=2*act_dim)        # outputs mean and log_std of a Gaussian

for iteration in range(1000):
    # 1) collect one trajectory with the CURRENT policy (on-policy!)
    logps, rewards = [], []
    s, done = env.reset(), False
    while not done:
        mu, log_std = policy(s)
        dist = Normal(mu, log_std.exp())
        a = dist.sample()                   # stochastic action = built-in exploration
        logps.append(dist.log_prob(a).sum())
        s, r, done = env.step(a)            # world is a black box: act, observe
        rewards.append(r)

    # 2) reward-to-go: credit each action only with what FOLLOWED it  (sec 5.3)
    G = discounted_cumsum(rewards, gamma)   # G[t] = r[t] + gamma*r[t+1] + ...
    G = (G - G.mean()) / (G.std() + 1e-8)   # crude baseline: center and scale (sec 5.4)

    # 3) the policy gradient = weighted maximum likelihood
    loss = -(stack(logps) * G).sum()        # ascend E[ log pi(a|s) * G ]
    loss.backward(); opt.step(); opt.zero_grad()</code></pre>
      <p>Three things to notice, slowly. <strong>One:</strong> the loss line <em>is</em> the boxed equation — autograd computes \(\nabla_\theta \log \pi_\theta\) for you, so "implementing REINFORCE" is just remembering to multiply log-probs by returns before summing. <strong>Two:</strong> <code>env.step()</code> is called, never differentiated, never modeled — the dynamics dropped out of the math, so they drop out of the code. <strong>Three:</strong> the normalize-G line is doing enormous work; delete it and watch training destabilize. That fragility, experienced firsthand, is the honest motivation for everything after §5.4 — baselines, critics, GAE, PPO are increasingly sophisticated replacements for that one crude line. (HW4 has you build exactly this and measure it.)</p>
    </div></details>

    <h4>Trace the derivation: from objective to update rule</h4>
    <p>Let's trace how the objective becomes the update rule. Every line below is an exact rewrite — no approximation until we sample. Step through to see where the log comes from.</p>
    <PgTransformWidget />

    <h4>Watch a policy learn from reward alone</h4>
    <p>The boxed gradient says: push up the log-probability of actions that led to high return, push down the rest. That's abstract — so let's make it move. Below, the cyan curve is a Gaussian policy \(\pi(a)=\mathcal{N}(\mu,\sigma)\); the orange curve is a reward landscape it cannot see and has never been told. Each press samples a handful of actions, scores them by the reward they receive, and takes one policy-gradient step. Green dots did better than the batch average and get their probability pushed up; red dots did worse and get pushed down — that "compared to average" is the baseline from §5.4, included here because without it the policy barely learns. Watch the distribution crawl uphill and tighten around the best action. This is REINFORCE, made visible.</p>
    <PgWidget />

    <h3><span class="knum">5.3</span>Variance reduction I: causality and reward-to-go</h3>
    <p>Raw REINFORCE multiplies <em>every</em> action's score by the <em>whole</em> trajectory's return — including rewards earned <em>before</em> the action was taken. An action cannot cause the past. Formally, for \(t' &lt; t\), \(\mathbb E[\nabla_\theta \log\pi_\theta(a_t|s_t)\, r_{t'}] = 0\) (condition on everything up to \(t\): \(r_{t'}\) is then a constant, and the expected score is zero — see the lemma in §5.4). Deleting those terms changes nothing in expectation and strictly removes noise, giving the <strong>reward-to-go</strong> form:</p>
    <p>$$\nabla_\theta J = \mathbb E\Big[\sum_t \nabla_\theta \log\pi_\theta(a_t|s_t)\; \hat Q_t\Big], \qquad \hat Q_t = \sum_{t'\ge t}\gamma^{t'-t}\, r_{t'}$$</p>
    <p>Each action is now credited only with what followed it. Notice \(\hat Q_t\) is a single-sample Monte-Carlo estimate of \(Q^{\pi}(s_t,a_t)\) — value functions are sneaking back in through the side door.</p>

    <h3><span class="knum">5.4</span>Variance reduction II: baselines — subtract before you judge</h3>
    <p>Suppose every trajectory in your task scores between 980 and 1000. REINFORCE pushes up the probability of <em>all</em> of them — the signal ("was this better than usual?") is buried in the offset. Subtract a state-dependent <strong>baseline</strong> \(b(s_t)\):</p>
    <p>$$\nabla_\theta J = \mathbb E\Big[\sum_t \nabla_\theta \log\pi_\theta(a_t|s_t)\,\big(\hat Q_t - b(s_t)\big)\Big]$$</p>
    <p>This is still <em>unbiased</em>, by a three-line lemma. For any function \(b\) of the state only:</p>
    <p>$$\mathbb E_{a\sim\pi_\theta(\cdot|s)}\big[\nabla_\theta \log \pi_\theta(a|s)\, b(s)\big] = b(s)\,\nabla_\theta \underbrace{\int \pi_\theta(a|s)\,da}_{=\,1} = b(s)\cdot \nabla_\theta 1 = 0$$</p>
    <p class="recap-box"><b>IN WORDS</b> &nbsp;subtracting any baseline that doesn't depend on the action adds <em>nothing</em> to the gradient on average — it integrates to zero. So you're free to subtract \(V(s)\) to shrink the variance without ever biasing the answer. A free lunch, and the reason every modern method uses advantages.</p>
    <p>(Differentiating "probabilities sum to one" — the expected score is always zero.) The variance, however, drops dramatically when \(b(s)\approx\) the average return from \(s\) — i.e. when \(b = V^\pi\). Then the weight on each score becomes the <strong>advantage</strong>:</p>
    <p>$$A^\pi(s_t,a_t) = Q^\pi(s_t,a_t) - V^\pi(s_t)$$</p>
    <p>"How much better was this action than what the policy typically achieves here?" Positive → reinforce; negative → suppress. <em>Grading on a curve, per state.</em> Every modern policy-gradient method is, at heart, \(\mathbb E[\nabla\log\pi \cdot \hat A]\) with a different recipe for \(\hat A\).</p>

    <h4>Why subtracting a number kills the noise but not the signal</h4>
    <p>The claim of §5.4 sounds too good: subtract a baseline and the gradient's <em>average</em> is unchanged (still unbiased), while its <em>variance</em> can plummet. See it directly. Below are ten sampled actions; each contributes a gradient term \(g_i=(R_i-b)\,\text{score}_i\). With \(b=0\), every return is positive, so every action is shoved upward with large, similar magnitude — the useful <em>differences</em> between actions are drowned out. Slide \(b\) toward the mean return and watch the bars split into push-up and push-down of <em>small</em> magnitude: same average gradient, far less spread.</p>
    <BaseWidget />

    <h3><span class="knum">5.5</span>Actor-critic and GAE: manufacturing good advantage estimates</h3>
    <p>To use \(b = V^\pi\) we must estimate it: train a second network, the <strong>critic</strong> \(V_\phi\), by TD regression (Lecture 4's machinery), while the <strong>actor</strong> \(\pi_\theta\) ascends the policy gradient. The two run in a loop: rollout → fit \(V_\phi\) → compute advantages → step \(\theta\). For the advantage itself there's a spectrum. Define the <strong>TD error</strong> \(\delta_t = r_t + \gamma V_\phi(s_{t+1}) - V_\phi(s_t)\) — note \(\delta_t\) is itself an unbiased estimate of \(A^\pi(s_t,a_t)\) <em>if</em> \(V_\phi = V^\pi\). Then:</p>
    <ul>
      <li>\(\hat A_t = \delta_t\): one-step — lowest variance, most bias (leans fully on the critic).</li>
      <li>\(\hat A_t = \sum_{l=0}^{k-1}\gamma^l \delta_{t+l}\): \(k\)-step (telescopes to \(r_t + \dots + \gamma^k V(s_{t+k}) - V(s_t)\)).</li>
      <li>\(\hat A_t = \hat Q_t - V_\phi(s_t)\): full Monte-Carlo — unbiased, noisiest.</li>
    </ul>
    <p><strong>Generalized Advantage Estimation</strong> blends them all with an exponential dial \(\lambda\in[0,1]\):</p>
    <p>$$\hat A_t^{\text{GAE}(\gamma,\lambda)} = \sum_{l=0}^{\infty} (\gamma\lambda)^l\, \delta_{t+l}$$</p>
    <p>\(\lambda = 0\) recovers the one-step TD advantage; \(\lambda = 1\) telescopes to Monte-Carlo-minus-baseline. In practice \(\lambda \approx 0.95\): mostly trusting real rewards, lightly smoothed by the critic. It is exactly Lecture 4's MC↔TD bias–variance dial, applied to advantages — same idea, one level up.</p>

    <details class="dive"><summary>Going deeper: the actor-critic loop in ~20 lines — what "train a critic" actually means</summary><div class="dive-body">
      <p>"Train a second network by TD regression" is terse if you haven't done it. Here is the whole loop; the critic is just a value-predictor fit by regression, and its only job is to make the advantages less noisy.</p>
<pre><code>actor  = MLP(obs_dim, out=2*act_dim)   # policy: mean + log_std
critic = MLP(obs_dim, out=1)           # V(s): one number per state

for iteration in range(N):
    # 1) collect a batch of transitions with the CURRENT actor (on-policy)
    obs, acts, rews, logps, dones = rollout(actor)

    # 2) critic targets = bootstrapped returns; GAE advantages from TD errors
    with torch.no_grad():
        V  = critic(obs)
        adv = gae(rews, V, dones, gamma, lam)   # sec 5.5: sum of (gamma*lam)^l * delta
        ret = adv + V                           # what the critic should have predicted

    # 3) critic step: regress V(s) toward the bootstrapped return  (this IS "TD regression")
    critic_loss = ((critic(obs) - ret)**2).mean()

    # 4) actor step: policy gradient weighted by the advantage  (sec 5.4)
    adv = (adv - adv.mean()) / (adv.std() + 1e-8)
    actor_loss = -(logps * adv).mean()

    (actor_loss + critic_loss).backward(); opt.step(); opt.zero_grad()</code></pre>
      <p>Two things to internalize. <strong>The critic never chooses an action</strong> — it only outputs \(V(s)\), used to compute advantages; the actor does the acting. <strong>Steps 3 and 4 are the same machinery you already know</strong>: a regression loss and a weighted log-likelihood loss, summed. Swap the advantage estimator and add the clip from §5.6 and this loop <em>is</em> PPO.</p>
    </div></details>

    <h4>One knob from TD to Monte Carlo</h4>
    <p>GAE looks like a third thing to learn, but it's really just the bias–variance ruler from Lecture 4 with a smooth handle. The advantage estimate is a weighted blend of every \(n\)-step advantage, with weight \((1-\lambda)\lambda^{n-1}\) on the \(n\)-step term (for \(n=1,2,\ldots\), so the weights sum to one). Slide \(\lambda\): at \(0\), all weight sits on the one-step TD estimate — lean entirely on the critic, low variance but biased; at \(1\), the weight spreads across the whole trajectory — pure Monte Carlo, unbiased but high variance. The usual choice \(\lambda=0.95\) trusts real rewards while letting the critic quietly soak up variance.</p>
    <GaeWidget />

    <h3><span class="knum">5.6</span>The step-size problem and PPO</h3>
    <p>One more failure mode and we reach the workhorse. The policy gradient is valid <em>at</em> the current \(\theta\); the data was sampled by the current policy. Take too large a step and three things break at once: the gradient estimate is stale, the new policy visits different states, and — uniquely to RL — <em>a bad policy collects bad data</em>, so collapse can be unrecoverable. We want each update to improve the policy <em>without moving it too far from the policy that generated the data</em>.</p>
    <p>TRPO formalizes this as maximizing a surrogate subject to a KL-divergence trust region — principled, but heavy (second-order). <strong>PPO</strong> (Proximal Policy Optimization) gets the same effect with a clipped first-order objective. Define the probability ratio against the data-collecting policy:</p>
    <p>$$r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{\text{old}}}(a_t|s_t)}$$</p>
    <p>$$L^{\text{CLIP}}(\theta) = \mathbb E_t\Big[\min\big(\, r_t(\theta)\,\hat A_t,\;\; \text{clip}(r_t(\theta),\, 1-\epsilon,\, 1+\epsilon)\,\hat A_t \big)\Big], \qquad \epsilon \approx 0.2$$</p>
    <p>Read the clip's logic case by case. If \(\hat A_t &gt; 0\) (good action): the objective rewards raising \(r_t\), but the clip flattens all incentive beyond \(1+\epsilon\) — you may like this action, but not more than 20% more per update. If \(\hat A_t &lt; 0\): pushing \(r_t\) below \(1-\epsilon\) earns nothing further. The <em>min</em> makes the bound one-sided pessimistic: the clip never blocks an update that would <em>undo</em> a change, only ones that overcommit. Result: you can safely take <em>multiple</em> gradient epochs on each batch of rollouts (squeezing more learning from expensive samples) before collecting fresh data.</p>
    <p><strong>Why robotics loves PPO:</strong> it's simple, first-order, stable across seeds, and pairs perfectly with GPU-parallel simulators (Isaac Gym/Lab) running 4,096+ environments at once — on-policy sample hunger stops mattering when samples are this cheap. Essentially every learned locomotion controller you've seen on quadrupeds and humanoids is PPO or a close descendant. It was also the original engine of RLHF for LLMs — though that corner of the field has since largely shifted to preference-optimization methods that drop the learned value function and often the on-policy loop entirely (DPO) or use group-relative advantages without a critic (GRPO).</p>
    <p class="notice"><strong>Honest caveat the clip's fans skip:</strong> clipping does <em>not</em> actually guarantee a bounded KL between old and new policy — the ratio can leave \([1-\epsilon,1+\epsilon]\) across multiple epochs, and the surrogate is a heuristic. Working PPO leans on a stack of "code-level" details (KL early-stopping, advantage normalization, value-function clipping, reward/observation scaling, learning-rate annealing) that matter as much as the clip itself (cf. Engstrom et al., <em>Implementation Matters</em>; Andrychowicz et al., <em>What Matters in On-Policy RL</em>). Treat the lab below as the <em>intuition</em>, not a proof of safety.</p>

    <h4>Why not just take small steps? — and what the clip really does</h4>
    <p>A natural objection: if large policy-gradient steps are dangerous, why not just take tiny ones? Because not all parameter changes are equal — a step that barely moves the weights can violently move the <em>action distribution</em>, and it's distance in <em>distribution</em> space, not weight space, that decides whether the data you just collected is still relevant. TRPO makes this precise by constraining the KL divergence between old and new policy (a trust region); the natural gradient is the same instinct — rescale the step by how much the distribution actually moves. PPO achieves nearly the same safety with a trick you can read off a single graph. Below is the clipped objective as a function of the probability ratio \(r=\pi_\text{new}/\pi_\text{old}\). Toggle the sign of the advantage and slide \(\epsilon\).</p>
    <ClipWidget />

    <h3><span class="knum">5.7</span>Off-policy continuous control: DDPG → TD3 → SAC</h3>
    <p>On real hardware, samples are precious, and on-policy methods discard data after each update. The off-policy family keeps Lecture 4's replay buffer and makes the actor solve Q-learning's intractable max. <strong>DDPG</strong>: train \(Q_\phi\) by TD as in DQN, but replace \(\max_{a'} Q(s',a')\) with \(Q_\phi(s', \mu_\theta(s'))\), where the deterministic actor \(\mu_\theta\) is trained to <em>be</em> the argmax by ascending straight up the critic:</p>
    <p>$$\nabla_\theta J \approx \mathbb E_{s\sim\mathcal D}\big[\nabla_a Q_\phi(s,a)\big|_{a=\mu_\theta(s)}\; \nabla_\theta \mu_\theta(s)\big]$$</p>
    <p>Note this is <em>not</em> the score-function estimator — it backpropagates through the critic into the actor. Because \(a = \mu_\theta(s)\) is deterministic, \(Q\) is a differentiable function of \(\theta\) via the chain rule — there's no expectation over sampled actions to differentiate, so no score-function trick is needed; this is the deterministic extreme of §5.2's two-estimator fork. Powerful and notoriously brittle: the actor exploits errors in \(Q_\phi\) (it climbs to wherever the critic hallucinates value). <strong>TD3</strong> patches the three worst leaks: <em>twin critics</em> (take the min of two Q-networks in targets — pessimism against overestimation), <em>target policy smoothing</em> (add noise to target actions so Q can't exploit narrow spikes), <em>delayed actor updates</em> (let the critic settle).</p>
    <p><strong>SAC</strong> (Soft Actor-Critic) — the modern default for real-robot RL — changes the objective itself, adding an entropy bonus:</p>
    <p>$$J(\pi) = \sum_t \mathbb E\big[\, r_t + \alpha\, \mathcal H\big(\pi(\cdot|s_t)\big)\big]$$</p>
    <p>Maximize reward <em>while staying as random as possible</em>. Effects: exploration is built into the objective (no external noise schedules), the policy hedges across all good actions instead of collapsing onto one (robustness), and the temperature \(\alpha\) is auto-tuned against a target entropy. The critic learns a "soft" Q with an entropy-augmented Bellman target, and the stochastic actor is trained by minimizing \(\mathbb E_{s}\big[\mathbb E_{a\sim\pi_\theta}[\alpha\log\pi_\theta(a|s) - Q_\phi(s,a)]\big]\) using the <strong>reparameterization trick</strong>: \(a = \tanh(\mu_\theta(s) + \sigma_\theta(s)\odot\varepsilon),\ \varepsilon\sim\mathcal N(0,I)\) — exactly the VAE move, giving low-variance gradients through the critic. One notorious implementation wrinkle: because the action is squashed through \(\tanh\), the log-probability needs a change-of-variables correction \(\log\pi(a|s) = \log\mathcal N(u) - \sum_i \log\!\big(1-\tanh^2(u_i)\big)\) (with \(u=\mu+\sigma\odot\varepsilon\)) — omit that Jacobian term and the entropy bonus is silently wrong. HIL-SERL (Lecture 4's paper) and most sample-efficient hardware RL sit on this foundation.</p>

    <div class="callout"><span class="co-label">The decision chart, honestly</span>
    <strong>Cheap massively-parallel sim?</strong> PPO. Robust, scales, who cares about sample efficiency. <strong>Learning on real hardware, minutes matter?</strong> SAC-family + replay + demos (the HIL-SERL recipe). <strong>Fixed dataset, no environment access at all?</strong> Offline RL (§5.9). This one chart organizes 80% of applied robot-RL papers.</div>

    <h4>Two ways to differentiate an expectation — and why it matters</h4>
    <p>SAC's reparameterized actor and REINFORCE's score-function gradient are the two canonical ways to estimate \(\nabla_\theta \mathbb{E}_{a\sim\pi_\theta}[f(a)]\), and the choice is not cosmetic — one is dramatically noisier than the other. The lab below has both estimate the <em>same</em> gradient of the same objective from the same number of samples. The score-function estimator (orange) weights a black-box reward by the score; the reparameterized estimator (cyan) pushes the sample through a differentiable map and reads the gradient directly. Both are unbiased — both clouds center on the true gradient — but watch the spread, and watch it explode for the score function as you widen the policy.</p>
    <ReparamWidget />

    <h3><span class="knum">5.8</span>Making it work on robots: rewards and the reality gap</h3>
    <p><strong>Reward design</strong> is where theory meets craft. Locomotion rewards are weighted cocktails — velocity tracking + survival + torque/jerk/slip penalties — each weight a knob someone tuned for weeks. The Eureka paper (below) automates the craft: a coding LLM writes candidate reward functions for a GPU simulator, an evolutionary outer loop keeps the best against rollout statistics, and the resulting rewards beat human-engineered ones on most tasks, including training a five-finger hand to spin a pen — reward code no human had managed to write.</p>
    <p><strong>Sim-to-real</strong> is the other pillar. Train in simulation (free, fast, safe), deploy on hardware whose friction, masses, latencies, and lighting differ. The standard arsenal: <em>domain randomization</em> — randomize those parameters during training so the policy must be robust to a <em>family</em> of worlds, hoping reality lands inside it; <em>asymmetric actor-critic</em> — the critic (training-only) sees privileged sim state (true contacts, friction coefficients), while the actor sees only deployable observations; the critic's job is variance reduction, so feeding it ground truth is free accuracy. And <em>teacher–student distillation</em> — train a teacher policy with privileged state via RL, then distill it (by DAgger-style imitation, Lecture 3's tool!) into a student that runs from realistic sensors. This is the actual pipeline behind most legged-robot results you've seen.</p>

    <h4>Domain randomization, in one picture</h4>
    <p>The sim-to-real intuition is easy to state and easier to feel. A policy trained only at the simulator's nominal physics is a sharp spike: superb at exactly those parameters, fragile the moment reality's friction or mass differs. Randomize those parameters during training and you trade a little peak performance for a broad plateau — robust across a whole <em>family</em> of worlds, in the hope that reality lands somewhere inside it. Slide the real-world friction and watch the un-randomized policy fall off a cliff while the randomized one holds.</p>
    <DomrandWidget />

    <h3><span class="knum">5.9</span>Offline RL: when the robot can't practice</h3>
    <p>Given only a <em>fixed</em> dataset of trajectories (logs, demos, other robots' experience) — no further interaction — can we still find a better policy than the one that collected it? Naive Q-learning fails specifically: the target's \(\max_{a'}\) queries actions <em>absent from the data</em>, where \(Q_\phi\) is unconstrained fantasy; errors feed targets, targets feed errors, values explode. This is <strong>extrapolation error</strong> — Lecture 3's distribution-shift demon, reborn inside the Bellman backup. All offline-RL methods are flavors of one principle, <em>pessimism toward the unknown</em>: constrain the policy near the data's actions, or train \(Q\) with a conservatism term that actively pushes down values of out-of-distribution actions (CQL), so the optimizer has no mirage to climb. The TACO-RL paper below shows the robotics payoff: from uncurated teleoperated "play" data, learn a latent space of <em>plans</em>, run offline RL over plans rather than raw torques — long-horizon kitchen behavior from a fixed dataset, no reward engineering during collection, no risky exploration.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · From your background</div>
      <div class="bridge-row"><div class="from"><b>Sensitivity analysis in simulation</b>; likelihood-ratio methods</div><div class="arrow">→</div><div class="to"><b>REINFORCE</b> — the same score-function estimator, estimating \(\partial(\text{expected return})/\partial\theta\) from rollouts</div></div>
      <div class="bridge-row"><div class="from"><b>Control variates</b> (variance reduction in Monte Carlo pricing)</div><div class="arrow">→</div><div class="to"><b>Baselines</b> — \(b(s)\) is a control variate; unbiased by the zero-mean-score lemma, chosen (≈ \(V^\pi\)) to kill variance</div></div>
      <div class="bridge-row"><div class="from"><b>Credibility / smoothing dials</b> between noisy data and a model</div><div class="arrow">→</div><div class="to"><b>GAE's \(\lambda\)</b> — exponentially blending sampled rewards (data) with critic bootstraps (model)</div></div>
      <div class="bridge-row"><div class="from"><b>Reparameterization trick</b> (VAEs)</div><div class="arrow">→</div><div class="to"><b>SAC's actor update</b> — identical move; contrast with REINFORCE's score function: the two canonical ways to differentiate an expectation</div></div>
      <div class="bridge-row"><div class="from"><b>Importance sampling / change of measure</b></div><div class="arrow">→</div><div class="to"><b>PPO's ratio \(r_t(\theta)\)</b> — reweighting old-policy samples to evaluate a new policy, with clipping as the guardrail where the measure change gets unreliable</div></div>
      <div class="bridge-row"><div class="from"><b>Model risk discipline</b>: don't trust a fitted model outside its data</div><div class="arrow">→</div><div class="to"><b>Offline RL's pessimism</b> — CQL et al. are that discipline made into a loss term</div></div>
    </div>

    <h3><span class="knum">5.10</span>The papers, decoded</h3>
    <div class="papers">
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/1504.00702" target="_blank" rel="noopener">End-to-End Training of Deep Visuomotor Policies</a></div><div class="pmeta">Levine, Finn, Darrell &amp; Abbeel · 2015 (GPS)</div><p class="pwhy">The proof-of-concept that started modern robot learning: pixels → joint torques in one network, trained by Guided Policy Search — local trajectory optimizers (LQR-flavored, Lecture 2!) solve task instances, a neural policy is trained to imitate them, alternating. Historically the bridge between optimal control and deep RL; conceptually the ancestor of every "end-to-end visuomotor" claim you'll read in L6–L9.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/abs/2310.12931" target="_blank" rel="noopener">Eureka: Human-Level Reward Design via Coding LLMs</a></div><div class="pmeta">Ma et al. · 2023</div><p class="pwhy">GPT-4 writes executable reward functions from the env source code; evolutionary search over candidates, scored by actual PPO training runs in Isaac Gym; reflection on rollout statistics refines the code. Outperforms expert-written rewards on 83% of tasks. Reward engineering — RL's most human-intensive step — becomes a search problem with an LLM prior. Also your first taste of L10's theme: LLMs as components inside robot-learning systems.</p></div>
      <div class="paper"><div class="ptitle"><a href="https://arxiv.org/pdf/2209.08959" target="_blank" rel="noopener">Latent Plans for Task-Agnostic Offline Reinforcement Learning</a></div><div class="pmeta">Rosete-Beas, Mees, Kalweit, Boedecker &amp; Burgard · 2022 (TACO-RL)</div><p class="pwhy">Mees's own line of work. From unstructured teleoperated play, learn a latent plan space (a CVAE over trajectory segments); do offline RL at the plan level, with a low-level policy decoding plans to actions. Hierarchy tames horizon; offline RL tames data reuse; play data tames collection cost. Foreshadows L9's language-conditioned play-data thread directly.</p></div>
    </div>

    <h3><span class="knum">5.11</span>Self-check</h3>
    <Quiz lecture="l5" />

    <div class="resources">
      <div class="res-head">Lecture 5 resources</div>
      <ul>
        <li><span class="rtag">Slides</span><a href="https://cvg.ethz.ch/lectures/Robot-Learning/lectures/lecture5_rl_II.pdf" target="_blank" rel="noopener">lecture5_rl_II.pdf</a></li>
        <li><span class="rtag">Recording</span><a href="https://www.youtube.com/watch?v=AdTGz8YnnlE" target="_blank" rel="noopener">YouTube recording — Lecture 5</a></li>
        <li><span class="rtag">Guest</span><a href="https://youtu.be/CPmTpXA5azw" target="_blank" rel="noopener">Andrew Wagenmaker (UC Berkeley) — guest spotlight</a></li>
        <li><span class="rtag">Homework</span><a href="https://github.com/mees-robot-learning-course/ethz-course-2026/tree/main/hw4_reinforcement_learning" target="_blank" rel="noopener">HW4: Reinforcement Learning</a> — implement the gradient estimator with and without baseline and <em>plot the variance</em>; it's the whole lecture in one figure</li>
      </ul>
    </div>

    <CompleteBar id="l5" prev="l4" next="l6" prevLabel="← L04" nextLabel="NEXT: L06 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Quiz from '../components/Quiz.vue';
import CompleteBar from '../components/CompleteBar.vue';
import PgWidget from '../widgets/PgWidget.vue';
import PgTransformWidget from '../widgets/PgTransformWidget.vue';
import BaseWidget from '../widgets/BaseWidget.vue';
import ClipWidget from '../widgets/ClipWidget.vue';
import GaeWidget from '../widgets/GaeWidget.vue';
import ReparamWidget from '../widgets/ReparamWidget.vue';
import DomrandWidget from '../widgets/DomrandWidget.vue';
import { renderMath } from '../composables/useKaTeX.js';
import { applyXref } from '../composables/useXref.js';

defineEmits(['navigate']);

const rootEl = ref(null);

onMounted(async () => {
  await nextTick();
  renderMath(rootEl.value);
  applyXref(rootEl.value);
});
</script>
