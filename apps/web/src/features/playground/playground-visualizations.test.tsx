import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const plotly = vi.hoisted(() => ({
  newPlot: vi.fn(() => Promise.resolve()),
  purge: vi.fn(),
}));

vi.mock('./plotly-loader', () => ({
  loadPlotly: vi.fn(() => Promise.resolve(plotly)),
}));

import { getPlaygroundDataset } from './playground-datasets';
import type { MlRunResult } from './ml-engine-contract';
import { PlaygroundVisualization } from './playground-visualizations';

describe('Playground visualizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a result chart through the lazy Plotly boundary', async () => {
    const result: MlRunResult = {
      algorithmId: 'perceptron',
      boundary: { bias: 0, weights: [0.0278, 0.0481] },
      datasetVersionId: 'ds-xor-noisy-v1',
      determinism: 'exact',
      feedback: ['linear-limit'],
      metrics: { accuracy: 0.5 },
      runId: 'run-plotly-boundary',
      scenarioId: 'pg-xor',
    };

    const { getByTestId } = render(
      <PlaygroundVisualization
        dataset={getPlaygroundDataset('ds-xor-noisy-v1')}
        locale="en"
        result={result}
      />,
    );
    const chart = getByTestId('playground-chart-decision-boundary');

    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalledTimes(1));
    expect(plotly.newPlot).toHaveBeenCalledWith(
      chart,
      expect.arrayContaining([expect.objectContaining({ type: 'scatter' })]),
      expect.any(Object),
      expect.any(Object),
    );
    expect(chart).toHaveAccessibleName('Decision boundary');
  });

  it('purges Plotly resources when the result chart unmounts', async () => {
    const result: MlRunResult = {
      algorithmId: 'perceptron',
      boundary: { bias: 0, weights: [0.0278, 0.0481] },
      datasetVersionId: 'ds-xor-noisy-v1',
      determinism: 'exact',
      feedback: [],
      metrics: { accuracy: 0.5 },
      runId: 'run-plotly-purge',
      scenarioId: 'pg-xor',
    };
    const { getByTestId, unmount } = render(
      <PlaygroundVisualization
        dataset={getPlaygroundDataset('ds-xor-noisy-v1')}
        locale="en"
        result={result}
      />,
    );
    const chart = getByTestId('playground-chart-decision-boundary');

    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalledTimes(1));
    unmount();

    expect(plotly.purge).toHaveBeenCalledWith(chart);
  });

  it('renders dataset points, a decision boundary, and a loss series', async () => {
    const result: MlRunResult = {
      algorithmId: 'perceptron',
      boundary: { bias: 0, weights: [0.0278, 0.0481] },
      chartSummary: undefined,
      datasetVersionId: 'ds-xor-noisy-v1',
      determinism: 'exact',
      feedback: ['linear-limit'],
      lossCurve: [
        { epoch: 1, loss: 0.7 },
        { epoch: 10, loss: 0.5 },
      ],
      metrics: { accuracy: 0.5, loss: 0.5 },
      runId: 'run-visual-01',
      scenarioId: 'pg-xor',
    };

    const { getByTestId } = render(
      <PlaygroundVisualization
        dataset={getPlaygroundDataset('ds-xor-noisy-v1')}
        locale="vi"
        result={result}
      />,
    );

    const chart = getByTestId('playground-chart-decision-boundary');
    const lossChart = getByTestId('playground-loss-chart');

    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalledTimes(2));
    expect(chart).toBeVisible();
    expect(lossChart).toBeVisible();
    expect(getPlotlyData(chart)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Decision boundary' })]),
    );
    expect(
      getPlotlyData(chart).flatMap((trace) => readTraceNumbers(trace.x)).length,
    ).toBeGreaterThan(100);
    expect(getPlotlyData(lossChart)).toEqual(
      expect.arrayContaining([expect.objectContaining({ mode: 'lines+markers', x: [1, 10] })]),
    );
  });

  it.each([
    ['confusion-matrix', { trueNegative: 3, falsePositive: 1, falseNegative: 2, truePositive: 4 }],
    [
      'residual-coefficient',
      { coefficientMagnitudes: [4, 2, 1], residualMean: 0.2, residualMaxAbs: 1 },
    ],
    ['cluster-plot', { clusterSizes: [4, 4, 4, 4] }],
    ['dendrogram', { mergeHeights: [0.1, 0.2, 0.4] }],
    ['tree', { rootFeature: 'debtRatio', rootThreshold: 0.56 }],
  ])('renders a non-empty %s chart from result summary', async (kind, chartSummary) => {
    const result: MlRunResult = {
      algorithmId: 'test',
      chartSummary: { kind, ...chartSummary },
      datasetVersionId: 'ds-credit-risk-v1',
      determinism: 'exact',
      feedback: [],
      metrics: { metric: 1 },
      runId: `run-${kind}`,
      scenarioId: 'pg-test',
    };

    const { getByTestId } = render(
      <PlaygroundVisualization
        dataset={getPlaygroundDataset('ds-credit-risk-v1')}
        locale="en"
        result={result}
      />,
    );

    const chart = getByTestId(`playground-chart-${kind}`);

    await waitFor(() => expect(plotly.newPlot).toHaveBeenCalledTimes(1));
    expect(getPlotlyData(chart)).not.toHaveLength(0);
  });
});

function getPlotlyData(chart: HTMLElement): Array<Record<string, unknown>> {
  const calls = plotly.newPlot.mock.calls as unknown as Array<
    [HTMLElement, Array<Record<string, unknown>>]
  >;
  const call = calls.find(([element]) => element === chart);

  expect(call).toBeDefined();

  return call?.[1] ?? [];
}

function readTraceNumbers(value: unknown): number[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'number' && Number.isFinite(item) ? [item] : []))
    : [];
}
