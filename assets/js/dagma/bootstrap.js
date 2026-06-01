import { DEFAULT_CONFIG } from './core.js';
import { DagmaGraphViz } from './viz-graph.js';
import { DagmaPlots } from './viz-plots.js';
import { initScrolly } from './scrolly.js';

function toNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function matrixFromArray(values) {
  return Float64Array.from(values);
}

function maxEdgesForD(d) {
  return (d * (d - 1)) / 2;
}

function statusText(stage) {
  if (!stage) {
    return '';
  }
  return `stage ${stage.stage}/${stage.totalStages} | mu=${stage.mu.toExponential(2)} | s=${stage.s.toFixed(2)}`;
}

export function mountDagmaExplorer(rootElementId, initialConfig = {}) {
  const root = document.getElementById(rootElementId);
  if (!root) {
    return null;
  }

  const form = root.querySelector('#dagma-controls');
  const runButton = root.querySelector('#dagma-run');
  const pauseButton = root.querySelector('#dagma-pause');
  const resetButton = root.querySelector('#dagma-reset');
  const replayButton = root.querySelector('#dagma-replay');
  const statusLine = root.querySelector('#dagma-status-line');
  const stageLine = root.querySelector('#dagma-stage-line');
  const speedInput = root.querySelector('#dagma-speed');
  const speedValue = root.querySelector('#dagma-speed-value');
  const playbackSlider = root.querySelector('#dagma-playback-slider');
  const playbackValue = root.querySelector('#dagma-playback-value');

  const graphCanvas = root.querySelector('#dagma-graph-canvas');
  const metricsPlot = root.querySelector('#dagma-metrics-plot');
  const twoNodePlot = root.querySelector('#dagma-two-node-plot');

  if (!form || !runButton || !pauseButton || !resetButton || !replayButton || !graphCanvas || !metricsPlot || !twoNodePlot) {
    return null;
  }

  const graphViz = new DagmaGraphViz(graphCanvas);
  const plots = new DagmaPlots({ metricsEl: metricsPlot, twoNodeEl: twoNodePlot });

  const state = {
    worker: null,
    running: false,
    paused: false,
    replaying: false,
    replayTimer: null,
    snapshots: [],
    latestResult: null,
    currentStage: null,
    currentConfig: { ...DEFAULT_CONFIG, ...initialConfig },
    speed: toNumber(speedInput ? speedInput.value : 1, 1),
    activeSnapshotIndex: 0,
  };

  function updateStatus(main, secondary = '') {
    if (statusLine) {
      statusLine.textContent = main;
    }
    if (stageLine) {
      stageLine.textContent = secondary;
    }
  }

  function refreshButtons() {
    pauseButton.disabled = !state.running;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
    replayButton.disabled = state.snapshots.length === 0 || state.running;
  }

  function getConfigFromForm() {
    const d = Math.max(3, Math.min(10, Math.floor(toNumber(form.elements.d.value, DEFAULT_CONFIG.d))));
    const maxEdges = maxEdgesForD(d);

    const expectedEdges = Math.max(
      1,
      Math.min(maxEdges, Math.round(toNumber(form.elements.expectedEdges.value, DEFAULT_CONFIG.expectedEdges))),
    );

    const config = {
      d,
      n: Math.max(100, Math.floor(toNumber(form.elements.n.value, DEFAULT_CONFIG.n))),
      expectedEdges,
      seed: Math.floor(toNumber(form.elements.seed.value, DEFAULT_CONFIG.seed)),
      lambda1: Math.max(0, toNumber(form.elements.lambda1.value, DEFAULT_CONFIG.lambda1)),
      T: Math.max(2, Math.floor(toNumber(form.elements.T.value, DEFAULT_CONFIG.T))),
      muInit: Math.max(1e-4, toNumber(form.elements.muInit.value, DEFAULT_CONFIG.muInit)),
      muFactor: Math.max(0.01, Math.min(0.99, toNumber(form.elements.muFactor.value, DEFAULT_CONFIG.muFactor))),
      threshold: Math.max(0, toNumber(form.elements.threshold.value, DEFAULT_CONFIG.threshold)),
      warmIter: Math.max(100, Math.floor(toNumber(form.elements.warmIter.value, DEFAULT_CONFIG.warmIter))),
      maxIter: Math.max(100, Math.floor(toNumber(form.elements.maxIter.value, DEFAULT_CONFIG.maxIter))),
      lr: Math.max(1e-5, toNumber(form.elements.lr.value, DEFAULT_CONFIG.lr)),
      checkpoint: Math.max(1, Math.floor(toNumber(form.elements.checkpoint.value, DEFAULT_CONFIG.checkpoint))),
      sSchedule: [1.0, 0.95, 0.9, 0.9, 0.85],
    };

    if (config.T < config.sSchedule.length) {
      config.sSchedule = config.sSchedule.slice(0, config.T);
    }

    return config;
  }

  function ensureWorker() {
    if (state.worker) {
      return state.worker;
    }

    const worker = new Worker('/assets/js/dagma/optimizer-worker.js', { type: 'module' });
    worker.onmessage = (event) => {
      const { type, payload, message } = event.data || {};

      if (type === 'stage') {
        state.currentStage = {
          ...payload,
          totalStages: state.currentConfig.T,
        };
        updateStatus(
          state.paused ? 'Optimization paused.' : 'Optimizing linear DAGMA...',
          statusText(state.currentStage),
        );
        return;
      }

      if (type === 'snapshot') {
        const snapshot = payload;
        state.snapshots.push(snapshot);
        state.activeSnapshotIndex = state.snapshots.length - 1;

        const duration = Math.max(80, Math.round(420 / Math.max(0.25, state.speed)));
        graphViz.update(matrixFromArray(snapshot.W), snapshot.d, {
          threshold: Math.max(0.01, state.currentConfig.threshold * 0.35),
          duration,
        });
        plots.appendSnapshot(snapshot);

        if (playbackSlider) {
          playbackSlider.max = String(Math.max(0, state.snapshots.length - 1));
          playbackSlider.value = String(state.activeSnapshotIndex);
        }
        if (playbackValue) {
          playbackValue.textContent = `${state.activeSnapshotIndex + 1}/${state.snapshots.length}`;
        }

        updateStatus(
          state.paused ? 'Optimization paused.' : 'Optimizing linear DAGMA...',
          `stage ${snapshot.stage}/${state.currentConfig.T} | checkpoint ${snapshot.iter} | h=${snapshot.h.toExponential(2)}`,
        );
        return;
      }

      if (type === 'done') {
        state.running = false;
        state.paused = false;
        state.latestResult = payload;

        if (payload && payload.WFinal) {
          const finalW = matrixFromArray(payload.WFinal);
          graphViz.update(finalW, state.currentConfig.d, {
            threshold: Math.max(0.005, state.currentConfig.threshold * 0.25),
            duration: 520,
          });

          if (payload.snapshots && payload.snapshots.length > 0 && payload.diagnostics?.cov) {
            plots.renderTwoNodeTrajectory({
              snapshots: payload.snapshots,
              covariance: payload.diagnostics.cov,
              d: state.currentConfig.d,
              lambda1: state.currentConfig.lambda1,
            });
          }

          const dagStatus = payload.diagnostics?.isDag ? 'DAG' : 'contains cycles';
          const finalSnapshot = payload.snapshots && payload.snapshots.length > 0
            ? payload.snapshots[payload.snapshots.length - 1]
            : null;
          updateStatus(
            `Run complete. Final graph ${dagStatus}.`,
            finalSnapshot
              ? `h=${finalSnapshot.h.toExponential(2)} | nnz=${finalSnapshot.nnz} | obj=${finalSnapshot.obj.toExponential(2)}`
              : '',
          );
        } else {
          updateStatus('Run finished.', '');
        }

        refreshButtons();
        return;
      }

      if (type === 'error') {
        state.running = false;
        state.paused = false;
        updateStatus('Worker error while running optimization.', message || 'Unknown error.');
        refreshButtons();
      }
    };

    state.worker = worker;
    return worker;
  }

  function stopReplay() {
    state.replaying = false;
    if (state.replayTimer) {
      clearTimeout(state.replayTimer);
      state.replayTimer = null;
    }
    replayButton.textContent = 'Replay';
  }

  function renderSnapshotAt(index) {
    if (!state.snapshots.length) {
      return;
    }
    const clamped = Math.max(0, Math.min(state.snapshots.length - 1, index));
    state.activeSnapshotIndex = clamped;
    const snapshot = state.snapshots[clamped];
    const duration = Math.max(50, Math.round(350 / Math.max(0.25, state.speed)));
    graphViz.update(matrixFromArray(snapshot.W), snapshot.d, {
      threshold: Math.max(0.01, state.currentConfig.threshold * 0.35),
      duration,
    });

    if (playbackSlider) {
      playbackSlider.value = String(clamped);
    }
    if (playbackValue) {
      playbackValue.textContent = `${clamped + 1}/${state.snapshots.length}`;
    }

    updateStatus(
      'Browsing optimization checkpoints.',
      `stage ${snapshot.stage}/${state.currentConfig.T} | checkpoint ${snapshot.iter} | h=${snapshot.h.toExponential(2)}`,
    );
  }

  function startReplay() {
    if (!state.snapshots.length) {
      return;
    }
    if (state.replaying) {
      stopReplay();
      return;
    }

    state.replaying = true;
    replayButton.textContent = 'Stop Replay';
    let cursor = 0;

    const step = () => {
      if (!state.replaying) {
        return;
      }
      renderSnapshotAt(cursor);
      cursor += 1;
      if (cursor >= state.snapshots.length) {
        stopReplay();
        return;
      }
      const delay = Math.max(80, Math.round(320 / Math.max(0.25, state.speed)));
      state.replayTimer = setTimeout(step, delay);
    };

    step();
  }

  function resetVisuals() {
    stopReplay();
    state.snapshots = [];
    state.latestResult = null;
    state.activeSnapshotIndex = 0;
    plots.reset();
    graphViz.setNodeCount(state.currentConfig.d);
    graphViz.update(new Float64Array(state.currentConfig.d * state.currentConfig.d), state.currentConfig.d, {
      threshold: 1,
      duration: 300,
    });

    if (playbackSlider) {
      playbackSlider.value = '0';
      playbackSlider.max = '0';
    }
    if (playbackValue) {
      playbackValue.textContent = '0/0';
    }
    updateStatus('Ready to run linear DAGMA in your browser.', '');
    refreshButtons();
  }

  function startRun() {
    stopReplay();
    const worker = ensureWorker();

    if (state.running) {
      worker.postMessage({ type: 'cancel' });
    }

    state.currentConfig = getConfigFromForm();
    state.running = true;
    state.paused = false;
    state.currentStage = null;
    state.snapshots = [];
    state.latestResult = null;

    graphViz.setNodeCount(state.currentConfig.d);
    plots.reset();

    if (playbackSlider) {
      playbackSlider.max = '0';
      playbackSlider.value = '0';
    }
    if (playbackValue) {
      playbackValue.textContent = '0/0';
    }

    updateStatus('Optimizing linear DAGMA...', `d=${state.currentConfig.d}, n=${state.currentConfig.n}`);
    refreshButtons();

    worker.postMessage({ type: 'start', config: state.currentConfig });
  }

  runButton.addEventListener('click', () => {
    startRun();
  });

  pauseButton.addEventListener('click', () => {
    if (!state.running) {
      return;
    }
    const worker = ensureWorker();
    if (state.paused) {
      worker.postMessage({ type: 'resume' });
      state.paused = false;
      updateStatus('Optimizing linear DAGMA...', statusText(state.currentStage));
    } else {
      worker.postMessage({ type: 'pause' });
      state.paused = true;
      updateStatus('Optimization paused.', statusText(state.currentStage));
    }
    refreshButtons();
  });

  resetButton.addEventListener('click', () => {
    if (state.worker && state.running) {
      state.worker.postMessage({ type: 'cancel' });
    }
    state.running = false;
    state.paused = false;
    resetVisuals();
  });

  replayButton.addEventListener('click', () => {
    if (state.running) {
      return;
    }
    startReplay();
  });

  if (speedInput && speedValue) {
    const applySpeed = () => {
      state.speed = Math.max(0.25, Math.min(4, toNumber(speedInput.value, 1)));
      speedValue.textContent = `${state.speed.toFixed(2)}x`;
    };
    speedInput.addEventListener('input', applySpeed);
    applySpeed();
  }

  if (playbackSlider) {
    playbackSlider.addEventListener('input', () => {
      stopReplay();
      renderSnapshotAt(Math.floor(toNumber(playbackSlider.value, 0)));
    });
  }

  form.elements.d.addEventListener('change', () => {
    const d = Math.max(3, Math.min(10, Math.floor(toNumber(form.elements.d.value, DEFAULT_CONFIG.d))));
    const maxEdges = maxEdgesForD(d);
    form.elements.expectedEdges.max = String(maxEdges);
    if (Number(form.elements.expectedEdges.value) > maxEdges) {
      form.elements.expectedEdges.value = String(Math.round(maxEdges));
    }
    state.currentConfig.d = d;
    graphViz.setNodeCount(d);
    graphViz.update(new Float64Array(d * d), d, { threshold: 1, duration: 300 });
  });

  initScrolly(root, (sectionId) => {
    root.setAttribute('data-active-section', sectionId);
  });

  resetVisuals();

  return {
    startRun,
    reset: resetVisuals,
    destroy: () => {
      stopReplay();
      if (state.worker) {
        state.worker.postMessage({ type: 'cancel' });
        state.worker.terminate();
      }
      graphViz.destroy();
    },
  };
}

window.addEventListener('DOMContentLoaded', () => {
  mountDagmaExplorer('dagma-guide-root', DEFAULT_CONFIG);
});
