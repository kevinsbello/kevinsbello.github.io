function nodeLayout(count, width, height, margin = 48) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(20, Math.min(width, height) / 2 - margin);
  const nodes = [];

  for (let i = 0; i < count; i += 1) {
    const angle = (-Math.PI / 2) + ((2 * Math.PI * i) / count);
    nodes.push({
      id: i,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }

  return nodes;
}

function edgeKey(edge) {
  return `${edge.source}-${edge.target}`;
}

export class DagmaGraphViz {
  constructor(container) {
    this.container = container;
    this.d3 = window.d3;

    if (!this.d3) {
      throw new Error('D3 is required for graph rendering.');
    }

    this.width = container.clientWidth || 700;
    this.height = 430;
    this.nodes = [];
    this.edgeThreshold = 0.05;

    this.svg = this.d3
      .select(container)
      .append('svg')
      .attr('class', 'dagma-graph-svg')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Directed graph showing DAGMA edge updates.');

    const defs = this.svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'dagma-arrow-positive')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ec9c2b');

    defs
      .append('marker')
      .attr('id', 'dagma-arrow-negative')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3f8ed1');

    this.edgeLayer = this.svg.append('g').attr('class', 'dagma-edge-layer');
    this.nodeLayer = this.svg.append('g').attr('class', 'dagma-node-layer');

    this.resizeObserver = new ResizeObserver(() => {
      this.width = this.container.clientWidth || this.width;
      this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
      if (this.nodes.length > 0) {
        this.setNodeCount(this.nodes.length);
      }
    });
    this.resizeObserver.observe(container);
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  setNodeCount(count) {
    this.nodes = nodeLayout(count, this.width, this.height);

    const nodeGroup = this.nodeLayer
      .selectAll('g.dagma-node')
      .data(this.nodes, (d) => d.id)
      .join((enter) => {
        const group = enter.append('g').attr('class', 'dagma-node');
        group
          .append('circle')
          .attr('r', 0)
          .attr('fill', '#0f172a')
          .attr('stroke', '#f3f4f6')
          .attr('stroke-width', 1.6)
          .transition()
          .duration(500)
          .attr('r', 16);

        group
          .append('text')
          .attr('class', 'dagma-node-label')
          .attr('text-anchor', 'middle')
          .attr('dy', 5)
          .text((d) => d.id + 1)
          .style('opacity', 0)
          .transition()
          .duration(500)
          .style('opacity', 1);

        return group;
      });

    nodeGroup
      .transition()
      .duration(500)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);
  }

  update(weights, d, options = {}) {
    if (this.nodes.length !== d) {
      this.setNodeCount(d);
    }

    const edgeThreshold = Number.isFinite(Number(options.threshold))
      ? Number(options.threshold)
      : this.edgeThreshold;
    const duration = Number.isFinite(Number(options.duration)) ? Number(options.duration) : 350;

    const edges = [];
    for (let i = 0; i < d; i += 1) {
      for (let j = 0; j < d; j += 1) {
        if (i === j) {
          continue;
        }
        const w = weights[i * d + j];
        if (Math.abs(w) <= edgeThreshold) {
          continue;
        }
        const source = this.nodes[i];
        const target = this.nodes[j];
        edges.push({
          source: i,
          target: j,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          weight: w,
          magnitude: Math.abs(w),
        });
      }
    }

    const weightMax = edges.reduce((max, e) => Math.max(max, e.magnitude), 1e-6);

    const edgeSelection = this.edgeLayer
      .selectAll('line.dagma-edge')
      .data(edges, edgeKey);

    edgeSelection
      .exit()
      .transition()
      .duration(duration)
      .style('opacity', 0)
      .remove();

    const enterEdges = edgeSelection
      .enter()
      .append('line')
      .attr('class', 'dagma-edge')
      .style('opacity', 0)
      .attr('x1', (edge) => edge.x1)
      .attr('y1', (edge) => edge.y1)
      .attr('x2', (edge) => edge.x1)
      .attr('y2', (edge) => edge.y1);

    enterEdges
      .merge(edgeSelection)
      .transition()
      .duration(duration)
      .style('opacity', 0.95)
      .attr('x1', (edge) => edge.x1)
      .attr('y1', (edge) => edge.y1)
      .attr('x2', (edge) => edge.x2)
      .attr('y2', (edge) => edge.y2)
      .attr('stroke', (edge) => (edge.weight >= 0 ? '#ec9c2b' : '#3f8ed1'))
      .attr('stroke-width', (edge) => 0.8 + (3.7 * edge.magnitude) / weightMax)
      .attr('marker-end', (edge) => (edge.weight >= 0 ? 'url(#dagma-arrow-positive)' : 'url(#dagma-arrow-negative)'));
  }
}
