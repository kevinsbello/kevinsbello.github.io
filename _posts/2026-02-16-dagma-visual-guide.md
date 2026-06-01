---
layout: single
author_profile: true
classes: wide
title: "DAGMA Visual Guide: From Intuition to Log-Det Optimization"
categories:
  - blog
tags:
  - dagma
  - causal-discovery
  - optimization
toc: true
toc_label: "On This Guide"
toc_icon: "book"
---

<div id="dagma-guide-root" class="dagma-guide">
  <section class="dg-hero dg-section" data-scrolly-section="hook">
    <div class="dg-kicker">Visual Guide + Interactive Lab</div>
    <h1>DAGMA, explained with a live optimizer.</h1>
    <p>
      This post walks from intuition to math to implementation details of DAGMA. The app below runs fully in your browser,
      so every optimization trajectory is computed locally on your machine.
    </p>
    <div class="dg-callout">
      Continuous optimization for DAG learning works because acyclicity can be represented by a smooth barrier.
      DAGMA uses a log-determinant barrier with path-following to reach sparse, acyclic graphs efficiently.
    </div>
  </section>

  <section class="dg-section" data-scrolly-section="problem">
    <h2>1. Why this problem is hard</h2>
    <div class="dg-problem-grid">
      <article class="dg-glass-card">
        <h3>Combinatorics</h3>
        <p>
          DAG structure search is discrete and super-exponential in the number of nodes. Brute force is impossible even for modest dimensions.
        </p>
      </article>
      <article class="dg-glass-card">
        <h3>Acyclicity</h3>
        <p>
          Enforcing no directed cycles is the key difficulty. If acyclicity is non-smooth or approximate, optimization can be unstable.
        </p>
      </article>
    </div>
  </section>

  <section class="dg-section dg-scrolly" data-scrolly-section="intuition">
    <div class="dg-text-panel">
      <h2>2. Intuition: a smooth acyclicity barrier</h2>
      <p>
        DAGMA uses a differentiable acyclicity function:
      </p>
      <div class="dg-math-block">
      $$
      h_s(W) = -\log \det(sI - W \circ W) + d\log s
      $$
      </div>
      <p>
        Inside its domain (M-matrix region), this quantity is nonnegative and equals zero exactly at DAGs.
        The optimizer can therefore follow gradients continuously while being pushed away from cyclic structures.
      </p>
      <p>
        Path-following is the second key idea: solve a sequence of unconstrained objectives with decreasing \(\mu\),
        warm-starting each stage from the previous solution.
      </p>
    </div>
    <div class="dg-sticky-panel">
      <div class="dg-graph-wrap" id="dagma-graph-canvas"></div>
      <div class="dg-status-panel" aria-live="polite">
        <p id="dagma-status-line">Ready to run linear DAGMA in your browser.</p>
        <p class="dg-status-secondary" id="dagma-stage-line"></p>
      </div>
      <div class="dg-caption">
        Edge thickness tracks \(|w_{ij}|\). Positive and negative weights use different colors.
      </div>
    </div>
  </section>

  <section class="dg-section" data-scrolly-section="math">
    <h2>3. Math in one place</h2>
    <p>For linear Gaussian score, DAGMA uses:</p>
    <div class="dg-math-block">
      $$
      \text{score}(W) = \frac{1}{2}\operatorname{tr}\left((I-W)^\top \Sigma (I-W)\right)
      $$
      $$
      \min_W \ \mu\Big(\text{score}(W) + \lambda_1\|W\|_1\Big) + h_s(W)
      $$
      $$
      h_s(W)= -\log\det(sI - W\circ W) + d\log s
      $$
    </div>
    <ul>
      <li>Score gradient: \(-\Sigma(I-W)\).</li>
      <li>Barrier gradient: \(\nabla h_s(W)=2W\circ(sI-W\circ W)^{-\top}\).</li>
      <li>Path-following: \(\mu_{t+1}=\mu_t \cdot \text{mu\_factor}\), with warm starts.</li>
    </ul>
  </section>

  <section class="dg-section" data-scrolly-section="geometry">
    <h2>4. Two-node geometry</h2>
    <p>
      In the two-node slice, each point is \((w_{12}, w_{21})\). The contour is the stage objective,
      and trajectories show how successive stages suppress 2-cycles.
    </p>
    <div class="dg-plot" id="dagma-two-node-plot" aria-label="Two node objective contour and optimization path"></div>
  </section>

  <section class="dg-section" data-scrolly-section="lab">
    <h2>5. Interactive DAGMA Lab</h2>
    <p>
      Configure the synthetic graph and run linear DAGMA directly in your browser worker thread.
      Default settings are tuned for a clear trajectory on small graphs.
    </p>

    <form id="dagma-controls" class="dg-controls" onsubmit="return false;">
      <div class="dg-controls-grid">
        <div class="dg-control">
          <label for="dagma-d">Nodes (d)</label>
          <input id="dagma-d" name="d" type="number" min="3" max="10" step="1" value="8" />
        </div>
        <div class="dg-control">
          <label for="dagma-expected-edges">Expected Edges</label>
          <input id="dagma-expected-edges" name="expectedEdges" type="number" min="1" max="28" step="1" value="10" />
        </div>
        <div class="dg-control">
          <label for="dagma-n">Samples (n)</label>
          <input id="dagma-n" name="n" type="number" min="100" step="50" value="500" />
        </div>
        <div class="dg-control">
          <label for="dagma-seed">Seed</label>
          <input id="dagma-seed" name="seed" type="number" step="1" value="11" />
        </div>
        <div class="dg-control">
          <label for="dagma-lambda1">lambda1</label>
          <input id="dagma-lambda1" name="lambda1" type="number" min="0" step="0.005" value="0.03" />
        </div>
        <div class="dg-control">
          <label for="dagma-t">Stages (T)</label>
          <input id="dagma-t" name="T" type="number" min="2" max="8" step="1" value="4" />
        </div>
        <div class="dg-control">
          <label for="dagma-mu-init">mu_init</label>
          <input id="dagma-mu-init" name="muInit" type="number" min="0.0001" step="0.05" value="1.0" />
        </div>
        <div class="dg-control">
          <label for="dagma-mu-factor">mu_factor</label>
          <input id="dagma-mu-factor" name="muFactor" type="number" min="0.01" max="0.99" step="0.01" value="0.2" />
        </div>
      </div>

      <details class="dg-advanced">
        <summary>Advanced Controls</summary>
        <div class="dg-controls-grid">
          <div class="dg-control">
            <label for="dagma-threshold">Display Threshold</label>
            <input id="dagma-threshold" name="threshold" type="number" min="0" step="0.01" value="0.3" />
          </div>
          <div class="dg-control">
            <label for="dagma-warm-iter">warm_iter</label>
            <input id="dagma-warm-iter" name="warmIter" type="number" min="50" step="50" value="900" />
          </div>
          <div class="dg-control">
            <label for="dagma-max-iter">max_iter</label>
            <input id="dagma-max-iter" name="maxIter" type="number" min="100" step="100" value="1800" />
          </div>
          <div class="dg-control">
            <label for="dagma-lr">Learning Rate</label>
            <input id="dagma-lr" name="lr" type="number" min="0.00001" step="0.0001" value="0.002" />
          </div>
          <div class="dg-control">
            <label for="dagma-checkpoint">checkpoint</label>
            <input id="dagma-checkpoint" name="checkpoint" type="number" min="1" step="1" value="40" />
          </div>
        </div>
      </details>

      <div class="dg-actions">
        <button id="dagma-run" class="dg-btn dg-btn-primary" type="button">Run</button>
        <button id="dagma-pause" class="dg-btn" type="button">Pause</button>
        <button id="dagma-reset" class="dg-btn" type="button">Reset</button>
        <button id="dagma-replay" class="dg-btn" type="button">Replay</button>

        <div class="dg-speed">
          <label for="dagma-speed">Animation Speed</label>
          <div class="dg-speed-row">
            <input id="dagma-speed" type="range" min="0.25" max="4" step="0.05" value="1" />
            <span id="dagma-speed-value">1.00x</span>
          </div>
        </div>
      </div>

      <div class="dg-playback-row">
        <input id="dagma-playback-slider" type="range" min="0" max="0" step="1" value="0" />
        <span id="dagma-playback-value">0/0</span>
      </div>
    </form>

    <div class="dg-plot" id="dagma-metrics-plot" aria-label="Optimization metrics over checkpoints"></div>
    <p class="dg-caption">
      Metrics panel tracks acyclicity residual \(h(W)\), score, full objective, and sparsity (nnz).
    </p>
  </section>

  <section class="dg-section" data-scrolly-section="tips">
    <h2>6. Reading the optimization</h2>
    <div class="dg-tip-box">
      <h3>Practical interpretation</h3>
      <ul>
        <li>If \(h(W)\) stalls high, reduce learning rate or increase stage count \(T\).</li>
        <li>If graph stays dense, increase \(\lambda_1\) or threshold slightly.</li>
        <li>If objective oscillates, increase checkpoint frequency and lower step size.</li>
        <li>For this small-node demo, \(d\in[6,10]\) gives the most informative visual trajectories.</li>
      </ul>
    </div>
  </section>

  <section class="dg-section" data-scrolly-section="limits">
    <h2>7. Limitations and next steps</h2>
    <div class="dg-limitations">
      <article class="dg-glass-card">
        <h3>Current scope</h3>
        <p>
          This app mirrors linear DAGMA with L2 score and path-following. It is intentionally constrained to \(d\le 10\)
          for responsive in-browser execution.
        </p>
      </article>
      <article class="dg-glass-card">
        <h3>Future extension</h3>
        <p>
          DAGMA also supports nonlinear structural equations (MLP). A natural extension is a side-by-side linear versus nonlinear explorer.
        </p>
      </article>
    </div>
    <p>
      <span class="dg-pill">Browser-only compute</span>
      <span class="dg-pill">No backend</span>
      <span class="dg-pill">Synthetic data in v1</span>
      <span class="dg-pill">Near-exact path-following</span>
    </p>
  </section>
</div>

<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script type="module" src="/assets/js/dagma/bootstrap.js"></script>
