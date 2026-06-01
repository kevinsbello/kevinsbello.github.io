import { runDagmaLinear } from './core.js';

let running = false;
let paused = false;
let cancelled = false;
let taskToken = 0;
let pauseResolvers = [];

function releasePauseWaiters() {
  while (pauseResolvers.length > 0) {
    const resolve = pauseResolvers.pop();
    resolve();
  }
}

function waitWhilePaused() {
  return new Promise((resolve) => {
    pauseResolvers.push(resolve);
  });
}

async function startTask(config) {
  taskToken += 1;
  const localToken = taskToken;

  cancelled = false;
  paused = false;
  running = true;

  try {
    const result = await runDagmaLinear(config, {
      onStageStart: async (stageInfo) => {
        postMessage({ type: 'stage', payload: stageInfo });
      },
      onSnapshot: async (snapshot) => {
        postMessage({ type: 'snapshot', payload: snapshot });
      },
      shouldPause: () => paused,
      waitWhilePaused: () => waitWhilePaused(),
      isCancelled: () => cancelled,
      yieldControl: () => new Promise((resolve) => setTimeout(resolve, 0)),
    });

    if (localToken !== taskToken) {
      return;
    }

    postMessage({ type: 'done', payload: result });
  } catch (error) {
    if (localToken !== taskToken) {
      return;
    }
    postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (localToken === taskToken) {
      running = false;
      paused = false;
      cancelled = false;
      releasePauseWaiters();
    }
  }
}

self.onmessage = (event) => {
  const { type, config } = event.data || {};

  if (type === 'start') {
    if (running) {
      cancelled = true;
      paused = false;
      releasePauseWaiters();
    }
    startTask(config || {});
    return;
  }

  if (type === 'pause') {
    if (running) {
      paused = true;
    }
    return;
  }

  if (type === 'resume') {
    paused = false;
    releasePauseWaiters();
    return;
  }

  if (type === 'cancel') {
    cancelled = true;
    paused = false;
    releasePauseWaiters();
  }
};
