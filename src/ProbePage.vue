<template>
  <!-- Temporary probe page for visual verification of ported styles. Remove when real section components exist. -->
  <div class="content" style="padding-top:40px">

    <!-- lecture-head -->
    <div class="lecture-head">
      <span class="ltag">LECTURE 01</span>
      <h2>Introduction to Robot Learning</h2>
      <p class="dek">From imitation to reinforcement — a tour of the modern landscape.</p>
    </div>

    <!-- meta-strip -->
    <div class="meta-strip">
      <span class="chip"><b>prereq</b> linear algebra</span>
      <span class="chip"><b>prereq</b> probability</span>
      <span class="chip"><b>level</b> introductory</span>
      <span class="chip"><b>duration</b> 90 min</span>
    </div>

    <!-- bridge -->
    <div class="bridge">
      <div class="bridge-title">Prior Knowledge Bridge</div>
      <div class="bridge-row">
        <div class="from"><b>Supervised learning</b> — you give labelled examples</div>
        <div class="arrow">→</div>
        <div class="to"><b>Imitation learning</b> — you give expert demonstrations</div>
      </div>
      <div class="bridge-row">
        <div class="from"><b>Gradient descent</b> — optimise a fixed loss</div>
        <div class="arrow">→</div>
        <div class="to"><b>Policy gradient</b> — optimise expected return</div>
      </div>
    </div>

    <!-- callout (default) -->
    <div class="callout">
      <span class="co-label">Key Concept</span>
      A <strong>policy</strong> is a mapping from observations to actions. The goal of robot learning is to find a policy that maximises cumulative reward.
    </div>

    <!-- callout.miscon -->
    <div class="callout miscon">
      <span class="co-label">Common Misconception</span>
      <ul>
        <li>Reinforcement learning does not require a reward at every step — sparse rewards are common.</li>
        <li>Imitation learning is not the same as supervised learning on states.</li>
      </ul>
    </div>

    <!-- dive (details/summary) -->
    <details class="dive">
      <summary>Deeper dive — Markov Decision Processes</summary>
      <div class="dive-body">
        <p>An MDP is defined by a tuple <code>(S, A, T, R, γ)</code> where <em>S</em> is the state space, <em>A</em> the action space, <em>T</em> the transition model, <em>R</em> the reward function, and <em>γ</em> the discount factor.</p>
        <p>The Bellman equation expresses the value of a state recursively: <code>V(s) = max_a [R(s,a) + γ·V(s')]</code>.</p>
      </div>
    </details>

    <!-- recap / recap-box -->
    <span class="recap">A policy maps observations to actions and is trained to maximise expected cumulative reward.</span>
    <div class="recap-box"><b>tldr</b> policy = observation → action; goal = maximise return</div>

    <h3><span class="knum">1.1</span>Quiz</h3>

    <!-- quiz -->
    <div class="quiz">
      <div class="q answered">
        <div class="q-text">Which of the following best describes a policy in robot learning?</div>
        <button class="opt wrong"><span class="ok">✗</span> A dataset of expert trajectories</button>
        <button class="opt right"><span class="ok">✓</span> A function from observations to actions</button>
        <button class="opt"><span class="ok">·</span> A reward signal from the environment</button>
        <div class="expl">A policy is a function π(a|s) that maps states (or observations) to actions. It is the core object optimised in reinforcement and imitation learning.</div>
      </div>
    </div>

    <!-- toolbox -->
    <div class="toolbox"><b>Notation:</b> π — policy · s — state · a — action · r — reward · γ — discount · V — value function · Q — action-value function</div>

    <!-- gloss -->
    <dl class="gloss">
      <dt>policy</dt>
      <dd>A function mapping observations to actions (or distributions over actions).</dd>
      <dt>return</dt>
      <dd>Cumulative discounted reward: G_t = Σ γ^k · r_{t+k}.</dd>
    </dl>

    <h3><span class="knum">1.2</span>Lab</h3>

    <!-- lab -->
    <div class="lab">
      <div class="lab-cap">
        <span class="lab-kicker">INTERACTIVE</span>
        Policy Visualiser
      </div>
      <div class="lab-stage" style="min-height:80px;display:flex;align-items:center;justify-content:center;color:#C8CFDA;font-family:var(--mono);font-size:13px;">
        [ canvas / svg goes here ]
      </div>
      <div class="lab-controls">
        <div class="ctrl">
          <label>Learning rate <span class="val">0.01</span></label>
          <input type="range" min="1" max="100" value="1">
        </div>
        <div class="ctrl">
          <label>Episodes <span class="val">100</span></label>
          <input type="range" min="10" max="1000" value="100">
        </div>
        <button class="lab-btn">Reset</button>
        <button class="lab-btn primary">Run</button>
      </div>
      <p class="lab-note">Adjust the sliders and click <strong>Run</strong> to train a simple policy on the grid world. The heatmap shows estimated value per state.</p>
    </div>

    <h3><span class="knum">1.3</span>Comparison Table</h3>

    <!-- cmp table -->
    <div class="cmp-scroll">
      <table class="cmp">
        <thead>
          <tr>
            <th>Approach</th>
            <th>Data source</th>
            <th>Reward needed?</th>
            <th>Sample efficiency</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Behavioural Cloning</td>
            <td>Expert demos</td>
            <td>No</td>
            <td>High</td>
          </tr>
          <tr>
            <td>GAIL</td>
            <td>Expert demos</td>
            <td>Implicit</td>
            <td>Medium</td>
          </tr>
          <tr>
            <td>PPO</td>
            <td>Environment rollouts</td>
            <td>Yes</td>
            <td>Low</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3><span class="knum">1.4</span>Overview Cards</h3>

    <!-- hero-grid -->
    <div class="hero-grid">
      <div class="hero-card">
        <div class="hc-num">01</div>
        <h4>Imitation Learning</h4>
        <p>Learn a policy directly from expert demonstrations without an explicit reward.</p>
      </div>
      <div class="hero-card">
        <div class="hc-num">02</div>
        <h4>Reinforcement Learning</h4>
        <p>Optimise cumulative reward via trial-and-error interaction with an environment.</p>
      </div>
      <div class="hero-card">
        <div class="hc-num">03</div>
        <h4>Foundation Models</h4>
        <p>Large pre-trained models adapted to robotic manipulation and navigation tasks.</p>
      </div>
    </div>

    <h3><span class="knum">1.5</span>Key Papers</h3>

    <!-- papers -->
    <div class="papers">
      <div class="paper">
        <div class="ptitle"><a href="#">DAgger: A Reduction of Imitation Learning to No-Regret Online Learning</a></div>
        <div class="pmeta">Ross, Gordon, Bagnell · 2011 · AISTATS</div>
        <p class="pwhy">Foundational algorithm for interactive imitation learning that addresses covariate shift.</p>
      </div>
      <div class="paper">
        <div class="ptitle"><a href="#">Proximal Policy Optimization Algorithms</a></div>
        <div class="pmeta">Schulman et al. · 2017 · OpenAI</div>
        <p class="pwhy">De-facto RL baseline combining simplicity with strong empirical performance.</p>
      </div>
    </div>

    <!-- resources -->
    <div class="resources">
      <div class="res-head">Further Reading</div>
      <ul>
        <li><span class="rtag">TEXTBOOK</span><a href="#">Sutton &amp; Barto — Reinforcement Learning (2nd ed.)</a></li>
        <li><span class="rtag">LECTURE</span><a href="#">CS 285 Deep RL (UC Berkeley)</a></li>
        <li><span class="rtag">VIDEO</span><a href="#">David Silver's RL Course (DeepMind)</a></li>
      </ul>
    </div>

    <!-- xref / notice -->
    <p><span class="xref">→ Lecture 02: Policy Gradient Methods</span> builds directly on this foundation.</p>
    <p class="notice">This probe page is temporary scaffolding for visual verification and will be removed once real section components are wired in.</p>

    <!-- review section probe -->
    <div id="review">
      <div class="review-src">From Lecture 01</div>
      <div class="q">
        <div class="review-tag">imitation learning</div>
        <div class="q-text">What is behavioural cloning?</div>
        <button class="opt"><span class="ok">A</span> Training a policy via trial and error</button>
        <button class="opt"><span class="ok">B</span> Supervised learning on (state, action) pairs from demonstrations</button>
      </div>
    </div>

    <!-- complete-bar / pager -->
    <div class="complete-bar">
      <button class="complete-btn">Mark complete</button>
      <div class="pager">
        <button disabled>← Previous</button>
        <button>Next →</button>
      </div>
    </div>

  </div>
</template>

<script setup>
// Temporary probe page — remove once real section components exist (Task N).
</script>
