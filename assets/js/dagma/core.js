import { generateSyntheticLinearData } from './data.js';

const EPS = 1e-12;
const ADAM_EPS = 1e-8;

export const DEFAULT_CONFIG = {
  d: 8,
  n: 500,
  expectedEdges: 10,
  edgeRate: null,
  seed: 11,
  lambda1: 0.03,
  T: 4,
  muInit: 1.0,
  muFactor: 0.2,
  sSchedule: [1.0, 0.95, 0.9, 0.9],
  warmIter: 900,
  maxIter: 1800,
  lr: 0.002,
  checkpoint: 40,
  beta1: 0.99,
  beta2: 0.999,
  tol: 1e-6,
  threshold: 0.3,
  snapshotThreshold: 1e-3,
};

function index(i, j, d) {
  return i * d + j;
}

function asFloatArray(values) {
  return values instanceof Float64Array ? values : Float64Array.from(values);
}

function clamp(value, lower, upper) {
  return Math.max(lower, Math.min(upper, value));
}

function normalizeConfig(raw = {}) {
  const config = { ...DEFAULT_CONFIG, ...(raw || {}) };
  const d = clamp(Math.floor(Number(config.d) || DEFAULT_CONFIG.d), 2, 10);
  const n = Math.max(100, Math.floor(Number(config.n) || DEFAULT_CONFIG.n));
  const maxEdges = (d * (d - 1)) / 2;

  let expectedEdges;
  if (Number.isFinite(Number(config.expectedEdges))) {
    expectedEdges = clamp(Number(config.expectedEdges), 1, maxEdges);
  } else if (Number.isFinite(Number(config.edgeRate))) {
    expectedEdges = clamp(Number(config.edgeRate) * maxEdges, 1, maxEdges);
  } else {
    expectedEdges = Math.max(d, Math.round(0.25 * maxEdges));
  }

  let sSchedule;
  if (Array.isArray(config.sSchedule)) {
    sSchedule = config.sSchedule.map((x) => Number(x));
  } else if (Number.isFinite(Number(config.sSchedule))) {
    sSchedule = Array.from({ length: Number(config.T) || DEFAULT_CONFIG.T }, () => Number(config.sSchedule));
  } else {
    sSchedule = [...DEFAULT_CONFIG.sSchedule];
  }

  const T = Math.max(2, Math.floor(Number(config.T) || DEFAULT_CONFIG.T));
  if (sSchedule.length < T) {
    const last = sSchedule.length > 0 ? sSchedule[sSchedule.length - 1] : 1.0;
    while (sSchedule.length < T) {
      sSchedule.push(last);
    }
  }

  return {
    d,
    n,
    expectedEdges,
    edgeRate: expectedEdges / maxEdges,
    seed: Math.floor(Number(config.seed) || DEFAULT_CONFIG.seed),
    lambda1: Number(config.lambda1) || DEFAULT_CONFIG.lambda1,
    T,
    muInit: Number(config.muInit) || DEFAULT_CONFIG.muInit,
    muFactor: Number(config.muFactor) || DEFAULT_CONFIG.muFactor,
    sSchedule,
    warmIter: Math.max(50, Math.floor(Number(config.warmIter) || DEFAULT_CONFIG.warmIter)),
    maxIter: Math.max(100, Math.floor(Number(config.maxIter) || DEFAULT_CONFIG.maxIter)),
    lr: Number(config.lr) || DEFAULT_CONFIG.lr,
    checkpoint: Math.max(1, Math.floor(Number(config.checkpoint) || DEFAULT_CONFIG.checkpoint)),
    beta1: Number(config.beta1) || DEFAULT_CONFIG.beta1,
    beta2: Number(config.beta2) || DEFAULT_CONFIG.beta2,
    tol: Number(config.tol) || DEFAULT_CONFIG.tol,
    threshold: Number(config.threshold) || DEFAULT_CONFIG.threshold,
    snapshotThreshold: Number(config.snapshotThreshold) || DEFAULT_CONFIG.snapshotThreshold,
    cov: config.cov ? asFloatArray(config.cov) : null,
  };
}

function zeros(size) {
  return new Float64Array(size);
}

function cloneMatrix(W) {
  return new Float64Array(W);
}

function forceZeroDiagonal(W, d) {
  for (let i = 0; i < d; i += 1) {
    W[index(i, i, d)] = 0;
  }
}

function signLike(x) {
  if (x > 0) {
    return 1;
  }
  if (x < 0) {
    return -1;
  }
  return 0;
}

function invertAndLogDet(matrix, d) {
  const A = cloneMatrix(matrix);
  const inv = zeros(d * d);
  for (let i = 0; i < d; i += 1) {
    inv[index(i, i, d)] = 1;
  }

  let sign = 1;
  let logAbsDet = 0;

  for (let col = 0; col < d; col += 1) {
    let pivotRow = col;
    let maxAbs = Math.abs(A[index(col, col, d)]);

    for (let row = col + 1; row < d; row += 1) {
      const value = Math.abs(A[index(row, col, d)]);
      if (value > maxAbs) {
        maxAbs = value;
        pivotRow = row;
      }
    }

    if (maxAbs < EPS || !Number.isFinite(maxAbs)) {
      return { valid: false, inverse: null, logdet: Number.NaN, sign: 0 };
    }

    if (pivotRow !== col) {
      for (let j = 0; j < d; j += 1) {
        const aIdx1 = index(col, j, d);
        const aIdx2 = index(pivotRow, j, d);
        const tmpA = A[aIdx1];
        A[aIdx1] = A[aIdx2];
        A[aIdx2] = tmpA;

        const invIdx1 = index(col, j, d);
        const invIdx2 = index(pivotRow, j, d);
        const tmpInv = inv[invIdx1];
        inv[invIdx1] = inv[invIdx2];
        inv[invIdx2] = tmpInv;
      }
      sign *= -1;
    }

    const pivot = A[index(col, col, d)];
    if (!Number.isFinite(pivot) || Math.abs(pivot) < EPS) {
      return { valid: false, inverse: null, logdet: Number.NaN, sign: 0 };
    }

    if (pivot < 0) {
      sign *= -1;
    }
    logAbsDet += Math.log(Math.abs(pivot));

    for (let j = 0; j < d; j += 1) {
      A[index(col, j, d)] /= pivot;
      inv[index(col, j, d)] /= pivot;
    }

    for (let row = 0; row < d; row += 1) {
      if (row === col) {
        continue;
      }
      const factor = A[index(row, col, d)];
      if (Math.abs(factor) < EPS) {
        continue;
      }
      for (let j = 0; j < d; j += 1) {
        A[index(row, j, d)] -= factor * A[index(col, j, d)];
        inv[index(row, j, d)] -= factor * inv[index(col, j, d)];
      }
    }
  }

  if (!Number.isFinite(logAbsDet)) {
    return { valid: false, inverse: null, logdet: Number.NaN, sign: 0 };
  }

  return { valid: true, inverse: inv, logdet: logAbsDet, sign };
}

function scoreAndGradient(cov, W, d) {
  const dif = zeros(d * d);
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      const k = index(i, j, d);
      dif[k] = i === j ? 1 - W[k] : -W[k];
    }
  }

  const rhs = zeros(d * d);
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      let sum = 0;
      for (let m = 0; m < d; m += 1) {
        sum += cov[index(i, m, d)] * dif[index(m, j, d)];
      }
      rhs[index(i, j, d)] = sum;
    }
  }

  let score = 0;
  for (let k = 0; k < dif.length; k += 1) {
    score += dif[k] * rhs[k];
  }
  score *= 0.5;

  const grad = zeros(d * d);
  for (let k = 0; k < rhs.length; k += 1) {
    grad[k] = -rhs[k];
  }

  return { score, grad };
}

function acyclicityAndGradient(W, d, s) {
  const M = zeros(d * d);
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      const k = index(i, j, d);
      if (i === j) {
        M[k] = s - (W[k] * W[k]);
      } else {
        M[k] = -(W[k] * W[k]);
      }
    }
  }

  const invResult = invertAndLogDet(M, d);
  if (!invResult.valid) {
    return {
      valid: false,
      h: Number.POSITIVE_INFINITY,
      grad: null,
      invM: null,
      hasNegativeInverseEntry: true,
    };
  }

  const h = -invResult.logdet + d * Math.log(s);
  const invM = invResult.inverse;
  let hasNegativeInverseEntry = false;
  for (let k = 0; k < invM.length; k += 1) {
    if (invM[k] < -1e-14) {
      hasNegativeInverseEntry = true;
      break;
    }
  }

  const grad = zeros(d * d);
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      const k = index(i, j, d);
      grad[k] = 2 * W[k] * invM[index(j, i, d)];
    }
  }

  return { valid: true, h, grad, invM, hasNegativeInverseEntry };
}

function l1Norm(W, d) {
  let norm = 0;
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      if (i === j) {
        continue;
      }
      norm += Math.abs(W[index(i, j, d)]);
    }
  }
  return norm;
}

function gradNorm(grad) {
  let value = 0;
  for (let i = 0; i < grad.length; i += 1) {
    value += grad[i] * grad[i];
  }
  return Math.sqrt(value);
}

function countNonZero(W, d, threshold = 1e-6) {
  let nnz = 0;
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      if (i === j) {
        continue;
      }
      if (Math.abs(W[index(i, j, d)]) > threshold) {
        nnz += 1;
      }
    }
  }
  return nnz;
}

async function cooperativePause(callbacks) {
  if (!callbacks.shouldPause || !callbacks.shouldPause()) {
    return false;
  }
  while (callbacks.shouldPause && callbacks.shouldPause()) {
    if (callbacks.isCancelled && callbacks.isCancelled()) {
      return true;
    }
    if (callbacks.waitWhilePaused) {
      await callbacks.waitWhilePaused();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
  return false;
}

async function maybeYield(callbacks) {
  if (callbacks.yieldControl) {
    await callbacks.yieldControl();
  }
}

function thresholdWeights(W, d, threshold) {
  const out = cloneMatrix(W);
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      const k = index(i, j, d);
      if (i === j || Math.abs(out[k]) < threshold) {
        out[k] = 0;
      }
    }
  }
  return out;
}

export function isDagFromWeights(W, d, epsilon = 1e-12) {
  const indegree = new Int32Array(d);
  const children = Array.from({ length: d }, () => []);

  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      if (i === j) {
        continue;
      }
      if (Math.abs(W[index(i, j, d)]) > epsilon) {
        indegree[j] += 1;
        children[i].push(j);
      }
    }
  }

  const queue = [];
  for (let i = 0; i < d; i += 1) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }

  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    visited += 1;
    const next = children[node];
    for (let i = 0; i < next.length; i += 1) {
      indegree[next[i]] -= 1;
      if (indegree[next[i]] === 0) {
        queue.push(next[i]);
      }
    }
  }

  return visited === d;
}

function metricsContainer() {
  return {
    iter: [],
    stage: [],
    mu: [],
    s: [],
    h: [],
    score: [],
    obj: [],
    nnz: [],
    gradNorm: [],
  };
}

async function minimizeStage({
  WInit,
  cov,
  d,
  mu,
  lambda1,
  maxIter,
  s,
  lr,
  checkpoint,
  beta1,
  beta2,
  tol,
  stage,
  globalIterOffset,
  threshold,
  callbacks,
  snapshots,
  metrics,
}) {
  const W = cloneMatrix(WInit);
  const size = d * d;
  const adamM = zeros(size);
  const adamV = zeros(size);
  let objPrev = 1e16;
  let lrCurrent = lr;
  let lastBaseW = null;
  let lastStepDirection = null;

  for (let iter = 1; iter <= maxIter; iter += 1) {
    if (callbacks.isCancelled && callbacks.isCancelled()) {
      return { cancelled: true, W, success: false, iterCompleted: iter - 1, lrCurrent, sCurrent: s };
    }
    const cancelledByPause = await cooperativePause(callbacks);
    if (cancelledByPause) {
      return { cancelled: true, W, success: false, iterCompleted: iter - 1, lrCurrent, sCurrent: s };
    }

    let hData = acyclicityAndGradient(W, d, s);
    let attempts = 0;

    while ((!(hData.valid) || hData.hasNegativeInverseEntry) && attempts < 20) {
      if (iter === 1 || s <= 0.9 || !lastBaseW || !lastStepDirection) {
        return { cancelled: false, W, success: false, iterCompleted: iter - 1, lrCurrent, sCurrent: s };
      }

      lrCurrent *= 0.5;
      if (lrCurrent <= 1e-16) {
        return { cancelled: false, W, success: true, iterCompleted: iter - 1, lrCurrent, sCurrent: s };
      }

      W.set(lastBaseW);
      for (let k = 0; k < size; k += 1) {
        W[k] -= lrCurrent * lastStepDirection[k];
      }
      forceZeroDiagonal(W, d);
      hData = acyclicityAndGradient(W, d, s);
      attempts += 1;
    }

    if (!hData.valid || hData.hasNegativeInverseEntry) {
      return { cancelled: false, W, success: false, iterCompleted: iter - 1, lrCurrent, sCurrent: s };
    }

    const scoreData = scoreAndGradient(cov, W, d);
    const gradObj = zeros(size);

    for (let k = 0; k < size; k += 1) {
      gradObj[k] =
        mu * scoreData.grad[k] +
        mu * lambda1 * signLike(W[k]) +
        hData.grad[k];
    }

    const stepDirection = zeros(size);
    const beta1Pow = 1 - (beta1 ** iter);
    const beta2Pow = 1 - (beta2 ** iter);
    for (let k = 0; k < size; k += 1) {
      adamM[k] = beta1 * adamM[k] + (1 - beta1) * gradObj[k];
      adamV[k] = beta2 * adamV[k] + (1 - beta2) * gradObj[k] * gradObj[k];
      const mHat = adamM[k] / (beta1Pow || EPS);
      const vHat = adamV[k] / (beta2Pow || EPS);
      stepDirection[k] = mHat / (Math.sqrt(vHat) + ADAM_EPS);
    }

    lastBaseW = cloneMatrix(W);
    lastStepDirection = stepDirection;

    for (let k = 0; k < size; k += 1) {
      W[k] -= lrCurrent * stepDirection[k];
    }
    forceZeroDiagonal(W, d);

    const shouldCheckpoint = iter % checkpoint === 0 || iter === maxIter;
    if (shouldCheckpoint) {
      const scoreNew = scoreAndGradient(cov, W, d).score;
      const hNew = acyclicityAndGradient(W, d, s).h;
      const objective = mu * (scoreNew + lambda1 * l1Norm(W, d)) + hNew;
      const currentGradNorm = gradNorm(gradObj);

      const snapshot = {
        iter: globalIterOffset + iter,
        stageIter: iter,
        stage,
        mu,
        s,
        lr: lrCurrent,
        d,
        h: hNew,
        score: scoreNew,
        obj: objective,
        nnz: countNonZero(W, d, threshold),
        gradNorm: currentGradNorm,
        W: Array.from(W),
      };

      snapshots.push(snapshot);
      metrics.iter.push(snapshot.iter);
      metrics.stage.push(snapshot.stage);
      metrics.mu.push(snapshot.mu);
      metrics.s.push(snapshot.s);
      metrics.h.push(snapshot.h);
      metrics.score.push(snapshot.score);
      metrics.obj.push(snapshot.obj);
      metrics.nnz.push(snapshot.nnz);
      metrics.gradNorm.push(snapshot.gradNorm);

      if (callbacks.onSnapshot) {
        await callbacks.onSnapshot(snapshot);
      }

      const relChange = Math.abs((objPrev - objective) / (Math.abs(objPrev) + EPS));
      objPrev = objective;
      if (relChange <= tol) {
        return {
          cancelled: false,
          W,
          success: true,
          iterCompleted: iter,
          lrCurrent,
          sCurrent: s,
        };
      }
    }

    if (iter % 25 === 0) {
      await maybeYield(callbacks);
    }
  }

  return {
    cancelled: false,
    W,
    success: true,
    iterCompleted: maxIter,
    lrCurrent,
    sCurrent: s,
  };
}

export async function runDagmaLinear(rawConfig = {}, callbacks = {}) {
  const config = normalizeConfig(rawConfig);
  const data = config.cov
    ? {
        cov: asFloatArray(config.cov),
        d: config.d,
        n: config.n,
        seed: config.seed,
        edgeRate: config.edgeRate,
        expectedEdges: config.expectedEdges,
        WTrue: null,
        BTrue: null,
      }
    : generateSyntheticLinearData(config);

  const d = config.d;
  const cov = data.cov;
  let W = zeros(d * d);
  forceZeroDiagonal(W, d);

  const snapshots = [];
  const metrics = metricsContainer();

  let mu = config.muInit;
  let globalIterOffset = 0;

  for (let stageIdx = 0; stageIdx < config.T; stageIdx += 1) {
    if (callbacks.isCancelled && callbacks.isCancelled()) {
      return {
        cancelled: true,
        WFinal: Array.from(W),
        snapshots,
        metrics,
        configUsed: config,
      };
    }

    const stage = stageIdx + 1;
    const maxIter = stageIdx === config.T - 1 ? config.maxIter : config.warmIter;
    let sCurrent = config.sSchedule[stageIdx];
    let lrCurrent = config.lr;
    let success = false;

    if (callbacks.onStageStart) {
      await callbacks.onStageStart({ stage, mu, s: sCurrent, maxIter, d });
    }

    while (!success) {
      const outcome = await minimizeStage({
        WInit: W,
        cov,
        d,
        mu,
        lambda1: config.lambda1,
        maxIter,
        s: sCurrent,
        lr: lrCurrent,
        checkpoint: config.checkpoint,
        beta1: config.beta1,
        beta2: config.beta2,
        tol: config.tol,
        stage,
        globalIterOffset,
        threshold: config.snapshotThreshold,
        callbacks,
        snapshots,
        metrics,
      });

      if (outcome.cancelled) {
        return {
          cancelled: true,
          WFinal: Array.from(thresholdWeights(outcome.W, d, config.threshold)),
          snapshots,
          metrics,
          configUsed: config,
        };
      }

      if (outcome.success) {
        W = outcome.W;
        globalIterOffset += outcome.iterCompleted;
        success = true;
      } else {
        lrCurrent *= 0.5;
        sCurrent += 0.1;
        if (lrCurrent <= 1e-10) {
          W = outcome.W;
          success = true;
        }
      }
    }

    mu *= config.muFactor;
  }

  const WFinal = thresholdWeights(W, d, config.threshold);
  const finalDag = isDagFromWeights(WFinal, d, 0);

  return {
    cancelled: false,
    WFinal: Array.from(WFinal),
    snapshots,
    metrics,
    configUsed: config,
    diagnostics: {
      cov: Array.from(cov),
      isDag: finalDag,
      WTrue: data.WTrue ? Array.from(data.WTrue) : null,
      BTrue: data.BTrue ? Array.from(data.BTrue) : null,
      expectedEdges: data.expectedEdges ?? config.expectedEdges,
      edgeRate: data.edgeRate ?? config.edgeRate,
    },
  };
}

export function twoNodeObjective({ w12, w21, cov2, mu, lambda1, s }) {
  const c00 = cov2[0][0];
  const c01 = cov2[0][1];
  const c10 = cov2[1][0];
  const c11 = cov2[1][1];

  const dif00 = 1;
  const dif01 = -w12;
  const dif10 = -w21;
  const dif11 = 1;

  const rhs00 = c00 * dif00 + c01 * dif10;
  const rhs01 = c00 * dif01 + c01 * dif11;
  const rhs10 = c10 * dif00 + c11 * dif10;
  const rhs11 = c10 * dif01 + c11 * dif11;

  const score = 0.5 * (
    dif00 * rhs00 +
    dif01 * rhs01 +
    dif10 * rhs10 +
    dif11 * rhs11
  );

  const det = (s * s) - ((w12 * w12) * (w21 * w21));
  if (!Number.isFinite(det) || det <= 1e-9) {
    return Number.POSITIVE_INFINITY;
  }

  const h = -Math.log(det) + 2 * Math.log(s);
  const l1 = Math.abs(w12) + Math.abs(w21);
  return mu * (score + lambda1 * l1) + h;
}

export function contourGrid({
  cov2,
  mu,
  lambda1,
  s,
  bound = 2,
  steps = 55,
}) {
  const x = [];
  const y = [];
  const z = [];
  const stepSize = (2 * bound) / (steps - 1);

  for (let i = 0; i < steps; i += 1) {
    x.push(-bound + i * stepSize);
    y.push(-bound + i * stepSize);
  }

  for (let row = 0; row < steps; row += 1) {
    const line = [];
    const w21 = y[row];
    for (let col = 0; col < steps; col += 1) {
      const w12 = x[col];
      const value = twoNodeObjective({ w12, w21, cov2, mu, lambda1, s });
      line.push(Number.isFinite(value) ? value : null);
    }
    z.push(line);
  }

  return { x, y, z };
}
