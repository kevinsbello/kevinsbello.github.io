const DEFAULT_WEIGHT_RANGES = [
  [-2.0, -0.5],
  [0.5, 2.0],
];

function mulberry32(seed) {
  let t = (seed >>> 0) || 1;
  return function rng() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed = 1) {
  return mulberry32(seed);
}

export function shuffleInPlace(values, rng) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = values[i];
    values[i] = values[j];
    values[j] = tmp;
  }
  return values;
}

function index(i, j, d) {
  return i * d + j;
}

export function simulateDag(d, edgeRate, rng) {
  const order = Array.from({ length: d }, (_, i) => i);
  shuffleInPlace(order, rng);

  const B = new Float64Array(d * d);
  for (let i = 0; i < d; i += 1) {
    for (let j = i + 1; j < d; j += 1) {
      if (rng() < edgeRate) {
        const from = order[i];
        const to = order[j];
        B[index(from, to, d)] = 1;
      }
    }
  }
  return { B, order };
}

export function simulateParameter(B, d, rng, ranges = DEFAULT_WEIGHT_RANGES) {
  const W = new Float64Array(d * d);
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      const k = index(i, j, d);
      if (B[k] === 0) {
        continue;
      }
      const bucket = rng() < 0.5 ? 0 : 1;
      const [low, high] = ranges[bucket];
      W[k] = low + (high - low) * rng();
    }
  }
  return W;
}

function gaussianFactory(rng) {
  let hasSpare = false;
  let spare = 0;
  return function nextGaussian() {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }

    let u = 0;
    let v = 0;
    while (u === 0) {
      u = rng();
    }
    while (v === 0) {
      v = rng();
    }
    const mag = Math.sqrt(-2.0 * Math.log(u));
    const z0 = mag * Math.cos(2.0 * Math.PI * v);
    const z1 = mag * Math.sin(2.0 * Math.PI * v);
    spare = z1;
    hasSpare = true;
    return z0;
  };
}

export function topologicalOrderFromAdjacency(adj, d, epsilon = 1e-15) {
  const indegree = new Int32Array(d);
  const children = Array.from({ length: d }, () => []);

  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      if (i === j) {
        continue;
      }
      if (Math.abs(adj[index(i, j, d)]) > epsilon) {
        indegree[j] += 1;
        children[i].push(j);
      }
    }
  }

  const queue = [];
  for (let node = 0; node < d; node += 1) {
    if (indegree[node] === 0) {
      queue.push(node);
    }
  }

  const order = [];
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    const nodeChildren = children[node];
    for (let i = 0; i < nodeChildren.length; i += 1) {
      const child = nodeChildren[i];
      indegree[child] -= 1;
      if (indegree[child] === 0) {
        queue.push(child);
      }
    }
  }

  if (order.length !== d) {
    return null;
  }
  return order;
}

export function simulateLinearSem(W, d, n, rng, noiseScale = 1.0) {
  const X = new Float64Array(n * d);
  const order = topologicalOrderFromAdjacency(W, d);
  const topoOrder = order || Array.from({ length: d }, (_, i) => i);
  const gaussian = gaussianFactory(rng);

  const parents = Array.from({ length: d }, () => []);
  for (let i = 0; i < d; i += 1) {
    for (let j = 0; j < d; j += 1) {
      if (Math.abs(W[index(i, j, d)]) > 0) {
        parents[j].push(i);
      }
    }
  }

  for (let t = 0; t < n; t += 1) {
    for (let u = 0; u < topoOrder.length; u += 1) {
      const node = topoOrder[u];
      let value = gaussian() * noiseScale;
      const pa = parents[node];
      for (let p = 0; p < pa.length; p += 1) {
        const parent = pa[p];
        value += X[index(t, parent, d)] * W[index(parent, node, d)];
      }
      X[index(t, node, d)] = value;
    }
  }
  return X;
}

export function centeredCovariance(X, n, d) {
  const mean = new Float64Array(d);
  for (let t = 0; t < n; t += 1) {
    const rowOffset = t * d;
    for (let j = 0; j < d; j += 1) {
      mean[j] += X[rowOffset + j];
    }
  }
  for (let j = 0; j < d; j += 1) {
    mean[j] /= n;
  }

  const cov = new Float64Array(d * d);
  for (let t = 0; t < n; t += 1) {
    const rowOffset = t * d;
    for (let i = 0; i < d; i += 1) {
      const xi = X[rowOffset + i] - mean[i];
      for (let j = 0; j < d; j += 1) {
        cov[index(i, j, d)] += xi * (X[rowOffset + j] - mean[j]);
      }
    }
  }

  const scale = 1 / n;
  for (let k = 0; k < cov.length; k += 1) {
    cov[k] *= scale;
  }

  return { cov, mean };
}

export function expectedEdgesToRate(d, expectedEdges) {
  const maxEdges = (d * (d - 1)) / 2;
  if (maxEdges <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, expectedEdges / maxEdges));
}

export function generateSyntheticLinearData(config) {
  const d = Math.max(2, Math.min(10, Number(config.d) || 8));
  const n = Math.max(100, Number(config.n) || 500);
  const seed = Number.isFinite(Number(config.seed)) ? Number(config.seed) : 1;
  const expectedEdges = Number.isFinite(Number(config.expectedEdges))
    ? Number(config.expectedEdges)
    : Math.max(d, Math.round(0.25 * (d * (d - 1)) / 2));

  const edgeRate = expectedEdgesToRate(d, expectedEdges);
  const rng = createRng(seed);
  const { B, order } = simulateDag(d, edgeRate, rng);
  const WTrue = simulateParameter(B, d, rng);
  const X = simulateLinearSem(WTrue, d, n, rng, 1.0);
  const { cov } = centeredCovariance(X, n, d);

  return {
    d,
    n,
    seed,
    edgeRate,
    expectedEdges,
    BTrue: B,
    WTrue,
    X,
    cov,
    topoOrder: order,
  };
}
