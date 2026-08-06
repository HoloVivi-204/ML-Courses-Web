import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getPlaygroundDataset } from './playground-datasets';
import type { MlRunResult } from './ml-engine-contract';
import { PlaygroundVisualization } from './playground-visualizations';

describe('Playground visualizations', () => {
  it('renders dataset points, a decision boundary, and a loss series', () => {
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

    const { container, getByTestId } = render(
      <PlaygroundVisualization
        dataset={getPlaygroundDataset('ds-xor-noisy-v1')}
        locale="vi"
        result={result}
      />,
    );

    expect(getByTestId('playground-chart-decision-boundary')).toBeVisible();
    expect(getByTestId('playground-boundary-line')).toBeVisible();
    expect(getByTestId('playground-loss-chart')).toBeVisible();
    expect(getByTestId('playground-loss-chart').querySelector('polyline')).not.toBeNull();
    expect(container.querySelectorAll('[data-row-id]').length).toBeGreaterThan(100);
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
  ])('renders a non-empty %s chart from result summary', (kind, chartSummary) => {
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

    expect(chart.querySelectorAll('rect, circle, line, polyline').length).toBeGreaterThan(0);
  });
});
