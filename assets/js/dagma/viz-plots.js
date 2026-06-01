import { contourGrid } from './core.js';

function format(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return 'nan';
  }
  return value.toExponential(digits);
}

function stagePalette(stage) {
  const colors = ['#f59e0b', '#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#14b8a6'];
  return colors[(stage - 1) % colors.length];
}

export class DagmaPlots {
  constructor({ metricsEl, twoNodeEl }) {
    this.Plotly = window.Plotly;
    if (!this.Plotly) {
      throw new Error('Plotly is required for chart rendering.');
    }

    this.metricsEl = metricsEl;
    this.twoNodeEl = twoNodeEl;
    this.series = {
      iter: [],
      h: [],
      score: [],
      obj: [],
      nnz: [],
      stage: [],
      mu: [],
      s: [],
    };

    this.initMetrics();
    this.initTwoNode();
  }

  initMetrics() {
    const layout = {
      paper_bgcolor: 'rgba(15, 23, 42, 0)',
      plot_bgcolor: 'rgba(15, 23, 42, 0)',
      margin: { l: 48, r: 20, t: 12, b: 34 },
      font: { family: 'IBM Plex Sans, sans-serif', color: '#e2e8f0', size: 12 },
      showlegend: false,
      grid: { rows: 4, columns: 1, pattern: 'independent', roworder: 'top to bottom' },
      xaxis: { title: 'checkpoint', color: '#94a3b8' },
      yaxis: { title: 'h(W)', color: '#94a3b8', rangemode: 'tozero' },
      xaxis2: { title: 'checkpoint', color: '#94a3b8' },
      yaxis2: { title: 'score', color: '#94a3b8' },
      xaxis3: { title: 'checkpoint', color: '#94a3b8' },
      yaxis3: { title: 'objective', color: '#94a3b8' },
      xaxis4: { title: 'checkpoint', color: '#94a3b8' },
      yaxis4: { title: 'nnz', color: '#94a3b8', rangemode: 'tozero' },
    };

    const traces = [
      { x: [], y: [], type: 'scatter', mode: 'lines', line: { color: '#f59e0b', width: 2 }, xaxis: 'x', yaxis: 'y' },
      { x: [], y: [], type: 'scatter', mode: 'lines', line: { color: '#22d3ee', width: 2 }, xaxis: 'x2', yaxis: 'y2' },
      { x: [], y: [], type: 'scatter', mode: 'lines', line: { color: '#a78bfa', width: 2 }, xaxis: 'x3', yaxis: 'y3' },
      { x: [], y: [], type: 'scatter', mode: 'lines', line: { color: '#34d399', width: 2 }, xaxis: 'x4', yaxis: 'y4' },
    ];

    this.Plotly.newPlot(this.metricsEl, traces, layout, {
      displayModeBar: false,
      responsive: true,
    });
  }

  initTwoNode() {
    const layout = {
      paper_bgcolor: 'rgba(15, 23, 42, 0)',
      plot_bgcolor: 'rgba(15, 23, 42, 0)',
      margin: { l: 52, r: 16, t: 12, b: 42 },
      font: { family: 'IBM Plex Sans, sans-serif', color: '#e2e8f0', size: 12 },
      xaxis: { title: 'w12', color: '#94a3b8', zerolinecolor: '#334155' },
      yaxis: { title: 'w21', color: '#94a3b8', zerolinecolor: '#334155' },
      showlegend: true,
      legend: { orientation: 'h', x: 0, y: 1.12 },
    };

    this.Plotly.newPlot(this.twoNodeEl, [], layout, {
      displayModeBar: false,
      responsive: true,
    });
  }

  reset() {
    this.series = {
      iter: [],
      h: [],
      score: [],
      obj: [],
      nnz: [],
      stage: [],
      mu: [],
      s: [],
    };
    this.initMetrics();
    this.initTwoNode();
  }

  appendSnapshot(snapshot) {
    this.series.iter.push(snapshot.iter);
    this.series.h.push(snapshot.h);
    this.series.score.push(snapshot.score);
    this.series.obj.push(snapshot.obj);
    this.series.nnz.push(snapshot.nnz);
    this.series.stage.push(snapshot.stage);
    this.series.mu.push(snapshot.mu);
    this.series.s.push(snapshot.s);

    const traces = [
      { x: this.series.iter, y: this.series.h, type: 'scatter', mode: 'lines', line: { color: '#f59e0b', width: 2 }, xaxis: 'x', yaxis: 'y' },
      { x: this.series.iter, y: this.series.score, type: 'scatter', mode: 'lines', line: { color: '#22d3ee', width: 2 }, xaxis: 'x2', yaxis: 'y2' },
      { x: this.series.iter, y: this.series.obj, type: 'scatter', mode: 'lines', line: { color: '#a78bfa', width: 2 }, xaxis: 'x3', yaxis: 'y3' },
      { x: this.series.iter, y: this.series.nnz, type: 'scatter', mode: 'lines', line: { color: '#34d399', width: 2 }, xaxis: 'x4', yaxis: 'y4' },
    ];

    this.Plotly.react(this.metricsEl, traces, this.metricsEl.layout, {
      displayModeBar: false,
      responsive: true,
    });
  }

  renderTwoNodeTrajectory({ snapshots, covariance, d, lambda1 }) {
    if (!snapshots || snapshots.length < 2 || d < 2) {
      return;
    }

    const cov2 = [
      [covariance[0], covariance[1]],
      [covariance[d], covariance[d + 1]],
    ];

    const final = snapshots[snapshots.length - 1];
    const contour = contourGrid({
      cov2,
      mu: final.mu,
      lambda1,
      s: final.s,
      bound: 2,
      steps: 60,
    });

    const byStage = new Map();
    snapshots.forEach((snapshot) => {
      const stage = snapshot.stage;
      if (!byStage.has(stage)) {
        byStage.set(stage, { x: [], y: [], stage, mu: snapshot.mu, s: snapshot.s });
      }
      const track = byStage.get(stage);
      const w = snapshot.W;
      track.x.push(w[1]);
      track.y.push(w[d]);
    });

    const traces = [
      {
        type: 'contour',
        x: contour.x,
        y: contour.y,
        z: contour.z,
        contours: { coloring: 'heatmap' },
        colorscale: 'Cividis',
        showscale: false,
        opacity: 0.75,
        name: 'objective landscape',
        hovertemplate: 'w12=%{x:.3f}<br>w21=%{y:.3f}<br>obj=%{z:.3f}<extra></extra>',
      },
    ];

    Array.from(byStage.keys())
      .sort((a, b) => a - b)
      .forEach((stage) => {
        const track = byStage.get(stage);
        traces.push({
          type: 'scatter',
          mode: 'lines+markers',
          x: track.x,
          y: track.y,
          name: `stage ${stage} | mu=${format(track.mu, 2)}`,
          line: { width: 2.2, color: stagePalette(stage) },
          marker: { size: 6, color: stagePalette(stage) },
          hovertemplate: `stage ${stage}<br>w12=%{x:.3f}<br>w21=%{y:.3f}<extra></extra>`,
        });
      });

    const finalW = final.W;
    traces.push({
      type: 'scatter',
      mode: 'markers',
      x: [finalW[1]],
      y: [finalW[d]],
      name: 'final point',
      marker: { size: 12, color: '#f8fafc', line: { color: '#f43f5e', width: 2 } },
      hovertemplate: `final<br>w12=%{x:.4f}<br>w21=%{y:.4f}<extra></extra>`,
    });

    this.Plotly.react(this.twoNodeEl, traces, this.twoNodeEl.layout, {
      displayModeBar: false,
      responsive: true,
    });
  }
}
