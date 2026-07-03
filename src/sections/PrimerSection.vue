<template>
  <section class="lecture" id="primer" ref="rootEl">
    <div class="lecture-head">
      <span class="ltag">MODULE 00</span>
      <h2>The Primer: your missing background</h2>
      <p class="dek">Three parts: what a robot actually is (Part A), the decision-making skeleton all twelve lectures hang on (Part B), and a Rosetta stone from actuarial mathematics to reinforcement learning (Part C). Read this before Lecture 1; revisit it constantly.</p>
    </div>

    <div class="meta-strip">
      <span class="chip"><b>Prereqs</b> calculus · linear algebra · basic probability</span>
      <span class="chip"><b>Time</b> ~60 min</span>
      <span class="chip"><b>Labs</b> five interactives — arm, dynamics, Bellman, softmax, discount</span>
    </div>

    <h3><span class="knum">PART A</span>What a robot actually is</h3>
    <p>Strip away the science fiction. A robot is <strong>sensors + actuators + a computer, wired into a feedback loop with the physical world</strong>. The computer reads sensors, decides, commands actuators, and the world responds — many times per second, forever. Everything in this course is about what runs inside that loop.</p>

    <div class="figure"><pre>
              ┌──────────────────────────────┐
              │           WORLD              │
              │  (objects, physics, people)  │
              └───────┬──────────────▲───────┘
                      │              │
                 observations     actions
              (camera, joints,  (motor torques,
               force, touch)     target poses)
                      │              │
              ┌───────▼──────────────┴───────┐
              │      POLICY  π(a|o)          │
              │  the thing this course       │
              │  teaches you how to LEARN    │
              └──────────────────────────────┘</pre>
    <div class="figcap">FIG. P1 — The perception–action loop. Classical robotics fills the box with hand-derived models; robot learning fills it with a trained neural network.</div></div>

    <h4>State: where the robot is, in numbers</h4>
    <p>A robot arm with 7 motors ("joints") is described at any instant by its <strong>joint angles</strong> \(q \in \mathbb{R}^7\) and <strong>joint velocities</strong> \(\dot q \in \mathbb{R}^7\). The vector \(q\) lives in <strong>configuration space</strong> — the space of all possible poses. The full physical state is \(x = (q, \dot q)\): like in classical mechanics, position + velocity determines the future (given the inputs).</p>

    <h4>Kinematics: geometry without forces</h4>
    <p><strong>Forward kinematics</strong> is a known, fixed function from joint angles to where the hand (the "end-effector") is in 3D space: \(p_{\text{ee}} = f(q)\). It's just trigonometry chained along the arm's links — easy. <strong>Inverse kinematics</strong> asks the reverse: which \(q\) puts my hand at a desired \(p\)? That's solving a nonlinear system, often with many or no solutions. The derivative of forward kinematics is the <strong>Jacobian</strong> \(J(q) = \partial f / \partial q\), giving the velocity relation \(\dot p_{\text{ee}} = J(q)\,\dot q\) — the workhorse of classical arm control.</p>

    <h4>Feel configuration space: drive an arm by its joint angles</h4>
    <p>The abstract phrase "the policy outputs joint angles \(q\)" becomes obvious the moment you see it. Below is a 2-joint arm. You don't move the hand directly — you set the two <em>angles</em>, and forward kinematics decides where the hand lands. Sweep them and watch the reachable workspace fill in. Two things to notice: most hand positions are reachable by <em>two</em> different angle combinations (that's why inverse kinematics has multiple solutions), and a small change in angle near full extension moves the hand a lot (that's the Jacobian stretching). This is the space every learned policy is really acting in.</p>
    <ArmWidget />

    <p>Kinematics ignored forces; <strong>dynamics</strong> reintroduces them. Newton's law for an arm — mass &times; acceleration = forces — takes this matrix form:</p>
    <p>$$M(q)\,\ddot q + C(q,\dot q)\,\dot q + g(q) = \tau$$</p>
    <p>\(M\) is the configuration-dependent inertia matrix, \(C\) collects Coriolis/centrifugal terms, \(g\) is gravity, and \(\tau\) is the vector of motor torques you command. If you knew this model perfectly, control would be (almost) calculus. The catch: the moment the robot <em>touches anything</em> — a mug, the floor, a door handle — you add contact forces and friction, which are discontinuous, hard to measure, and brutally hard to model. <strong>Contact is the single biggest reason manipulation resists classical methods and motivates learning.</strong></p>

    <h4>Dynamics: three forces every motor must overcome</h4>
    <p>The arm widget shows where the hand ends up — but not why moving it is hard. Once joints are in motion, a robot must fight three torque demands at once: inertia from the mass it carries, Coriolis coupling between the joints, and the ever-present pull of gravity.</p>
    <DynamicsWidget />

    <h4>The control stack: two loops at two speeds</h4>
    <p>Real systems are layered. A <strong>low-level controller</strong> runs at 100–1000 Hz keeping motors at commanded targets — usually some flavor of <strong>PID</strong> (proportional–integral–derivative: push back proportionally to error, its integral, and its derivative). On top, the <strong>policy</strong> — the learned part — runs at 1–60 Hz, outputting either target joint positions, end-effector poses, or raw torques. When a paper says the policy outputs "actions," ask: <em>actions at which level of this stack?</em> It changes the difficulty of the learning problem enormously.</p>

    <h4>Sensors, simulation, and the gap</h4>
    <p>Typical observations: RGB camera images, depth images, <strong>proprioception</strong> (the robot's own joint angles/velocities — its sense of its body), sometimes force/torque or tactile sensing. Note what's missing: the robot never observes "the mug's pose" directly; it sees pixels. Much of robot learning is implicitly learning perception.</p>
    <p>Because real robots are slow, expensive, and breakable, the field leans hard on <strong>physics simulators</strong> — MuJoCo, Isaac Gym/Isaac Lab (GPU-parallelized, thousands of simultaneous robots), PyBullet. Simulation is cheap data; the price is the <strong>sim-to-real gap</strong>: simulated friction, contacts, latencies, and images never quite match reality, so policies that ace simulation can fail on hardware. Closing that gap (L5) is a discipline of its own.</p>

    <div class="callout"><span class="co-label">Moravec's paradox — the course's founding observation</span>
    Things hard for humans (chess, calculus, Go) turned out easy for computers; things trivial for a toddler (picking up a toy, walking on gravel) remain at the frontier of robotics. Evolution spent billions of years optimizing sensorimotor skill and a few millennia on symbolic reasoning — so our intuitions about what's "hard" are exactly backwards. Keep this in mind every time a task in this course looks mundane.</div>

    <h3><span class="knum">PART B</span>The decision-making skeleton</h3>
    <p>Part A left you with a loop that fires many times a second. Part B is the bookkeeping that loop needs: if the reward for an action arrives three hundred steps later, what number should the agent write next to that action today? Getting that ledger right — coherently, recursively, under uncertainty — is the entire formal content of Lectures 2–10. Here is the frame they all share.</p>
    <p>An <strong>agent</strong> interacts with an <strong>environment</strong> in discrete time steps. At step \(t\): the agent sees state \(s_t\), picks action \(a_t \sim \pi(\cdot|s_t)\), the environment returns reward \(r_t\) and next state \(s_{t+1} \sim P(\cdot|s_t,a_t)\). This repeats, producing a <strong>trajectory</strong> (or "rollout" / "episode") \(\tau = (s_0,a_0,r_0,s_1,a_1,r_1,\dots)\).</p>
    <p>The agent's objective is the expected <strong>return</strong> — discounted cumulative reward:</p>
    <p>$$G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \cdots = \sum_{k=0}^{\infty}\gamma^k r_{t+k}, \qquad \gamma \in [0,1)$$</p>
    <p>Two functions summarize "how good things are," and the entire field is built on them:</p>
    <p>$$V^\pi(s) = \mathbb{E}_\pi\!\left[G_t \mid s_t = s\right] \qquad\qquad Q^\pi(s,a) = \mathbb{E}_\pi\!\left[G_t \mid s_t = s,\, a_t = a\right]$$</p>
    <p>\(V^\pi\) is the expected return from state \(s\) if you follow policy \(\pi\); \(Q^\pi\) is the same but with the first action pinned to \(a\). Their relationship: \(V^\pi(s) = \mathbb{E}_{a\sim\pi}[Q^\pi(s,a)]\). The <strong>advantage</strong> \(A^\pi(s,a) = Q^\pi(s,a) - V^\pi(s)\) measures how much better action \(a\) is than \(\pi\)'s average behavior — it will star in Lecture 5.</p>

    <h4>Build the Bellman equation from scratch</h4>
    <p>Before I hand you the equation these definitions obey, earn it. Below is a tiny 4-state world: only the last state pays. Click a state to ask "given what I currently think my successors are worth, what am I worth?" — repeat until nothing changes. The update you are clicking is the most important equation in the course.</p>
    <BellmanDeriveWidget />

    <p>What you just built has a name. Because returns are recursive (\(G_t = r_t + \gamma G_{t+1}\)), value functions obey the <strong>Bellman equation</strong>:</p>
    <p>$$V^\pi(s) = \mathbb{E}_{a\sim\pi,\; s'\sim P}\big[\, r(s,a) + \gamma\, V^\pi(s') \,\big]$$</p>
    <p>Memorize the shape — <em>value now = expected immediate reward + discounted expected value next</em> — you just watched it stabilize. You will see it forty times in this course wearing different costumes.</p>

    <h4>The three families of solutions</h4>
    <ul>
      <li><strong>Value-based</strong> (L4): learn \(Q\), then act by \(\arg\max_a Q(s,a)\). The policy is implicit.</li>
      <li><strong>Policy-based</strong> (L5): parameterize \(\pi_\theta\) directly and do gradient ascent on expected return. Handles continuous actions natively — which is why robotics lives here.</li>
      <li><strong>Model-based</strong> (L8): learn the dynamics \(P(s'|s,a)\) itself, then plan or train inside the learned model.</li>
    </ul>
    <p>Two distinctions you must keep straight from day one. <strong>On-policy vs. off-policy</strong>: does the algorithm require fresh data from the <em>current</em> policy (PPO: yes), or can it learn from any data, including old or other-policy data (Q-learning, SAC: yes, via a replay buffer)? <strong>Exploration vs. exploitation</strong>: unlike supervised learning, the agent chooses its own training distribution — act greedily too early and you never see the data that would teach you better.</p>

    <h4>Action selection: softmax and the explore–exploit dial</h4>
    <p>Once an agent has scores for each action, it still needs a rule for turning them into a choice. Softmax with a temperature parameter is the simplest such rule — and the temperature knob exposes the explore-vs-exploit tension every RL method must navigate.</p>
    <SoftmaxWidget />

    <details class="dive"><summary>Going deeper: partial observability (POMDPs) — why robots don't quite live in MDPs</summary><div class="dive-body">
      <p>The MDP assumes the agent sees the true state \(s_t\). A camera-driven robot sees an <em>observation</em> \(o_t\) (pixels) that incompletely reflects state — occlusions, unseen object properties like mass or friction, things behind the robot. Formally this is a <strong>POMDP</strong>, where the optimal agent maintains a <em>belief</em> \(b_t = p(s_t \mid o_{1:t}, a_{1:t-1})\) — a posterior over states given history. Exact belief tracking is intractable, so in practice deep RL approximates it by feeding the policy a <em>history</em>: stacked recent frames, a recurrent network's hidden state, or a transformer's context window. When you reach Lecture 7 (sequence models) and Lecture 8 (world models with latent states), recognize them as learned, approximate belief states. The math of this course is written for MDPs; the engineering is forever managing the gap.</p>
    </div></details>

    <h4>Feel the discount before you trust it</h4>
    <p>Before moving on, build intuition for the one free parameter in all of RL. The return weights a reward \(k\) steps away by \(\gamma^k\). Drag \(\gamma\) below and watch two things at once: how fast the future fades, and the total weight \(\sum_k \gamma^k = 1/(1-\gamma)\) — which doubles as an <em>effective planning horizon</em>. At \(\gamma=0.99\) the agent effectively looks ~100 steps ahead; at \(\gamma=0.9\), only ~10. This single number silently sets how far-sighted every algorithm in the course is — and it's the same \(v = 1/(1+i)\) you discount cash flows with.</p>
    <DiscWidget />

    <h3><span class="knum">PART C</span>The actuarial Rosetta stone</h3>
    <p>Here's the part nobody will tell you in lecture: <strong>you have been doing dynamic programming on Markov processes with discounting your entire actuarial career.</strong> The vocabulary differs; the mathematics is the same. The clearest example — compare the actuarial recursion for a whole-life annuity-due with the Bellman equation:</p>
    <p>$$\ddot a_x = 1 + v\, p_x\, \ddot a_{x+1} \qquad\Longleftrightarrow\qquad V^\pi(s) = r(s) + \gamma \sum_{s'} P(s'|s)\, V^\pi(s')$$</p>
    <p>The right-hand form is the fixed-policy, state-reward special case of the Bellman equation — reward depends only on state and the policy is held fixed — chosen precisely because its structure mirrors the annuity recursion exactly. It differs from Part B's general form \(V^\pi(s)=\mathbb{E}[r(s,a)+\gamma V^\pi(s')]\), which takes an explicit expectation over actions drawn from \(\pi\); once the policy is fixed and rewards depend only on state, that expectation collapses to the deterministic sum here.</p>
    <p>Read the left side as an RL problem: the "state" is being alive at age \(x\); the "reward" is the payment of 1 each period; the "discount factor" is \(v = 1/(1+i)\); the "transition" is surviving to age \(x+1\) with probability \(p_x\); death is an absorbing terminal state with value 0. An annuity value <em>is</em> a value function. A reserve <em>is</em> a value function. You have computed \(V^\pi\) thousands of times.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · Actuarial science → Reinforcement learning</div>
      <div class="bridge-row"><div class="from"><b>Discount factor</b> \(v = 1/(1+i)\), time value of money</div><div class="arrow">→</div><div class="to"><b>\(\gamma\)</b> — same algebra; interpretation adds "prefer reward sooner" and "keep infinite sums finite"</div></div>
      <div class="bridge-row"><div class="from"><b>EPV of future cash flows</b>; reserves \({}_tV\)</div><div class="arrow">→</div><div class="to"><b>Value function \(V^\pi(s)\)</b> — expected discounted future reward from a state</div></div>
      <div class="bridge-row"><div class="from"><b>Multi-state models</b> (healthy/sick/dead), transition intensities</div><div class="arrow">→</div><div class="to"><b>MDP transition kernel \(P(s'|s,a)\)</b> — with one upgrade: <em>your actions change the transition probabilities</em></div></div>
      <div class="bridge-row"><div class="from"><b>Recursion relations</b> (Thiele, annuity/insurance recursions)</div><div class="arrow">→</div><div class="to"><b>Bellman equations</b> — identical backward-recursive structure</div></div>
      <div class="bridge-row"><div class="from"><b>Life table given</b>: compute EPVs from known \(q_x\)</div><div class="arrow">→</div><div class="to"><b>"Planning" / dynamic programming (L2)</b>: model known, solve exactly</div></div>
      <div class="bridge-row"><div class="from"><b>No table — only experience data</b>; experience studies, credibility updates</div><div class="arrow">→</div><div class="to"><b>Model-free RL (L4–L5)</b>: estimate values from sampled trajectories; TD learning ≈ continuously credibility-weighting your estimate toward new experience</div></div>
      <div class="bridge-row"><div class="from"><b>Credibility weight</b> \(Z\): blend prior estimate with observed experience</div><div class="arrow">→</div><div class="to"><b>Learning rate \(\alpha\)</b> in \(V \leftarrow (1-\alpha)V + \alpha\,[\text{new estimate}]\) — structurally the same blend</div></div>
      <div class="bridge-row"><div class="from"><b>Stochastic scenario projection</b>, model office runs</div><div class="arrow">→</div><div class="to"><b>Monte Carlo rollouts</b> — simulate trajectories, average discounted outcomes</div></div>
      <div class="bridge-row"><div class="from"><b>Choosing among policy designs</b> to optimize an EPV objective</div><div class="arrow">→</div><div class="to"><b>Control / policy optimization</b>: search over decision rules \(\pi\) to maximize \(V^\pi\) — the step actuarial work rarely takes, and RL's whole point</div></div>
    </div>

    <p>The one genuinely new ingredient RL adds: <strong>the feedback of choice</strong>. In actuarial models you evaluate a fixed stochastic process. In RL, the process depends on a decision rule that you are simultaneously optimizing — and when learning on a real system, the data you collect depends on the policy you're still improving. That self-reference is the source of nearly every difficulty (and every interesting theorem) ahead.</p>

    <div class="bridge">
      <div class="bridge-title">Bridge · Machine learning → Robot learning</div>
      <div class="bridge-row"><div class="from"><b>Supervised learning</b> on i.i.d. pairs \((x,y)\)</div><div class="arrow">→</div><div class="to"><b>Behavioral cloning (L3)</b> — same training, but at test time <em>your own predictions generate the next inputs</em>, breaking i.i.d.</div></div>
      <div class="bridge-row"><div class="from"><b>Covariate shift</b></div><div class="arrow">→</div><div class="to"><b>Compounding errors / distribution shift</b> — the central pathology of L3, induced by the agent itself</div></div>
      <div class="bridge-row"><div class="from"><b>Cross-entropy / MLE</b></div><div class="arrow">→</div><div class="to"><b>\(\max_\theta \sum \log \pi_\theta(a^{\text{expert}}|s)\)</b> — BC is MLE of expert actions; REINFORCE reuses the same \(\nabla \log \pi\) machinery</div></div>
      <div class="bridge-row"><div class="from"><b>VAEs, diffusion models</b> for images</div><div class="arrow">→</div><div class="to"><b>Generative policies (L6)</b> — same math, but you sample <em>actions</em> conditioned on observations</div></div>
      <div class="bridge-row"><div class="from"><b>Autoregressive LLMs</b>, next-token prediction</div><div class="arrow">→</div><div class="to"><b>L7 + L9</b>: trajectories as token sequences; VLAs are language models whose vocabulary includes motor commands</div></div>
      <div class="bridge-row"><div class="from"><b>Pretrain → finetune</b>, transfer learning</div><div class="arrow">→</div><div class="to"><b>Robot foundation models (L9–L10)</b>: pretrain on internet + cross-robot data, finetune/prompt for your robot and task</div></div>
    </div>

    <Quiz lecture="primer" />

    <CompleteBar id="primer" prev="start" next="l1" prevLabel="← START" nextLabel="NEXT: L01 →" @navigate="$emit('navigate', $event)" />
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import DiscWidget from '../widgets/DiscWidget.vue';
import ArmWidget from '../widgets/ArmWidget.vue';
import DynamicsWidget from '../widgets/DynamicsWidget.vue';
import SoftmaxWidget from '../widgets/SoftmaxWidget.vue';
import BellmanDeriveWidget from '../widgets/BellmanDeriveWidget.vue';
import Quiz from '../components/Quiz.vue';
import CompleteBar from '../components/CompleteBar.vue';
import { renderMath } from '../composables/useKaTeX.js';
import { applyXref } from '../composables/useXref.js';

defineEmits(['navigate']);

const rootEl = ref(null);

onMounted(async () => {
  await nextTick();
  if (rootEl.value) {
    renderMath(rootEl.value);
    applyXref(rootEl.value);
  }
});
</script>
