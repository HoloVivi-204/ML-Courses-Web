import { useEffect, useMemo, useRef } from 'react';
import type { PlotlyLayout, PlotlyModule, PlotlyTrace } from 'plotly.js-cartesian-dist-min';

import type { Locale } from '../catalog/course-data';
import type { PlaygroundDataset } from './playground-datasets';
import type { MlRunResult } from './ml-engine-contract';
import { loadPlotly } from './plotly-loader';

interface PlaygroundVisualizationProps {
  dataset: PlaygroundDataset | null;
  locale: Locale;
  result: MlRunResult;
}

interface PlotlyChartSpec {
  data: readonly PlotlyTrace[];
  layout: PlotlyLayout;
}

interface PlotlyTheme {
  ink: string;
  line: string;
  paper: string;
  surface: string;
  teal: string;
}

const PLOTLY_CONFIG = {
  displayModeBar: false,
  responsive: true,
  scrollZoom: false,
};

const PLOTLY_MARKERS = ['circle', 'square', 'diamond', 'cross'] as const;
const PLOTLY_COLORS = ['#f97316', '#14b8a6', '#8b5cf6', '#eab308'] as const;

export function PlaygroundVisualization({ dataset, locale, result }: PlaygroundVisualizationProps) {
  const chartKind = getChartKind(result);
  const chartTitle = formatChartTitle(chartKind, locale);
  const chartDescription = formatChartDescription(chartKind, locale);
  const chartSpec = useMemo(
    () => createChartSpec({ chartKind, dataset, result }),
    [chartKind, dataset, result],
  );

  return (
    <div className="playground-visualization" data-testid="playground-visualization">
      <figure className="playground-chart-figure">
        <PlotlyChart
          description={chartDescription}
          spec={chartSpec}
          testId={`playground-chart-${chartKind}`}
          title={chartTitle}
        />
        <figcaption>{chartTitle}</figcaption>
      </figure>
      {result.lossCurve && result.lossCurve.length > 0 ? (
        <LossCurveChart locale={locale} points={result.lossCurve} />
      ) : null}
    </div>
  );
}

function PlotlyChart({
  description,
  spec,
  testId,
  title,
}: {
  description: string;
  spec: PlotlyChartSpec;
  testId: string;
  title: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const descriptionId = `${testId}-description`;

  useEffect(() => {
    const chartElement = chartRef.current;

    if (!chartElement) {
      return undefined;
    }

    let disposed = false;
    let activePlotly: PlotlyModule | null = null;
    chartElement.dataset.plotlyState = 'loading';

    void loadPlotly()
      .then((plotly) => {
        if (disposed) {
          return undefined;
        }

        activePlotly = plotly;

        return plotly.newPlot(chartElement, spec.data, spec.layout, PLOTLY_CONFIG);
      })
      .then(() => {
        if (!disposed) {
          chartElement.dataset.plotlyState = 'ready';
        }
      })
      .catch(() => {
        if (!disposed) {
          chartElement.dataset.plotlyState = 'error';
        }
      });

    return () => {
      disposed = true;
      activePlotly?.purge(chartElement);
    };
  }, [spec]);

  return (
    <>
      <div
        aria-describedby={descriptionId}
        aria-label={title}
        className="playground-chart"
        data-testid={testId}
        ref={chartRef}
        role="img"
      />
      <span className="visually-hidden" id={descriptionId}>
        {description}
      </span>
    </>
  );
}

function LossCurveChart({
  locale,
  points,
}: {
  locale: Locale;
  points: ReadonlyArray<Record<string, unknown>>;
}) {
  const curve = points.flatMap((point) => {
    const epoch = readFiniteNumber(point.epoch);
    const trainLoss = readFiniteNumber(point.trainLoss ?? point.trainingLoss ?? point.loss);
    const testLoss = readFiniteNumber(point.testLoss ?? point.validationLoss);

    return epoch === null || (trainLoss === null && testLoss === null)
      ? []
      : [{ epoch, testLoss, trainLoss }];
  });

  if (curve.length === 0) {
    return null;
  }

  const title = locale === 'vi' ? 'Đường cong loss' : 'Loss curve';
  const description =
    locale === 'vi'
      ? 'Loss train và loss test theo từng epoch trong quá trình huấn luyện.'
      : 'Train and test loss measured at each training epoch.';
  const spec = createLossCurveSpec(curve, locale);

  return (
    <figure className="playground-chart-figure playground-loss-figure">
      <PlotlyChart
        description={description}
        spec={spec}
        testId="playground-loss-chart"
        title={title}
      />
      <figcaption>{locale === 'vi' ? 'Loss theo epoch' : 'Loss over epochs'}</figcaption>
    </figure>
  );
}

function createChartSpec({
  chartKind,
  dataset,
  result,
}: {
  chartKind: string;
  dataset: PlaygroundDataset | null;
  result: MlRunResult;
}): PlotlyChartSpec {
  const theme = getPlotlyTheme();
  const summary = result.chartSummary ?? {};

  if (chartKind === 'confusion-matrix') {
    return createConfusionMatrixSpec(summary, theme);
  }

  if (chartKind === 'actual-vs-predicted' || chartKind === 'polynomial-residual') {
    return createResidualSpec(summary, theme);
  }

  if (chartKind === 'residual-coefficient' || chartKind === 'importance') {
    return createBarSpec(summary, theme);
  }

  if (chartKind === 'tree') {
    return createTreeSpec(summary, theme);
  }

  if (chartKind === 'dendrogram') {
    return createDendrogramSpec(summary, theme);
  }

  return createScatterSpec(dataset, result, theme);
}

function createScatterSpec(
  dataset: PlaygroundDataset | null,
  result: MlRunResult,
  theme: PlotlyTheme,
): PlotlyChartSpec {
  const rows = dataset?.rows.slice(0, 180) ?? [];
  const summary = result.chartSummary ?? {};
  const clusterCount = readNumberArray(summary.clusterSizes).length;
  const groupCount = Math.max(clusterCount, 2);
  const traces: PlotlyTrace[] = Array.from({ length: groupCount }, (_, groupIndex) => {
    const groupRows = rows.filter((_, index) => index % groupCount === groupIndex);

    return {
      hovertemplate: '%{text}<extra></extra>',
      marker: {
        color: PLOTLY_COLORS[groupIndex % PLOTLY_COLORS.length],
        size: 8,
        symbol: PLOTLY_MARKERS[groupIndex % PLOTLY_MARKERS.length],
      },
      mode: 'markers',
      name: `Group ${groupIndex + 1}`,
      text: groupRows.map((row) => `${row.rowId}: ${formatRowLabel(row.label)}`),
      type: 'scatter',
      x: groupRows.map((row) => row.features[0] ?? 0),
      y: groupRows.map((row) => row.features[1] ?? 0),
    } satisfies PlotlyTrace;
  }).filter((trace) => Array.isArray(trace.x) && trace.x.length > 0);
  const boundary = readBoundary(result.boundary);

  if (boundary) {
    const bounds = getScatterBounds(rows);
    traces.push({
      hoverinfo: 'skip',
      line: { color: theme.teal, dash: 'dash', width: 3 },
      mode: 'lines',
      name: 'Decision boundary',
      type: 'scatter',
      x: [bounds.xMin, bounds.xMax],
      y: [
        calculateBoundaryY(bounds.xMin, boundary, bounds),
        calculateBoundaryY(bounds.xMax, boundary, bounds),
      ],
    });
  }

  return {
    data: traces,
    layout: {
      ...createBaseLayout(theme),
      showlegend: traces.length > 1,
      xaxis: {
        ...createAxis(theme),
        title: { text: dataset?.featureColumns[0] ?? 'feature 1' },
      },
      yaxis: {
        ...createAxis(theme),
        title: { text: dataset?.featureColumns[1] ?? 'feature 2' },
      },
    },
  };
}

function createConfusionMatrixSpec(
  summary: Record<string, unknown>,
  theme: PlotlyTheme,
): PlotlyChartSpec {
  const matrix = getConfusionMatrix(summary);
  const labels = matrix.map((_, index) => `Class ${index}`);

  return {
    data: [
      {
        colorbar: { title: { text: 'Count' } },
        colorscale: [
          [0, theme.paper],
          [1, theme.teal],
        ],
        hovertemplate: 'Actual %{y}<br>Predicted %{x}<br>Count %{z}<extra></extra>',
        text: matrix,
        texttemplate: '%{text}',
        type: 'heatmap',
        x: labels,
        y: labels,
        z: matrix,
      },
    ],
    layout: {
      ...createBaseLayout(theme),
      xaxis: { ...createAxis(theme), title: { text: 'Predicted' } },
      yaxis: { ...createAxis(theme), title: { text: 'Actual' } },
    },
  };
}

function createResidualSpec(summary: Record<string, unknown>, theme: PlotlyTheme): PlotlyChartSpec {
  const residualMean = readFiniteNumber(summary.residualMean) ?? 0;
  const residualMaxAbs = Math.abs(readFiniteNumber(summary.residualMaxAbs) ?? 0);

  return createBarChartSpec(
    ['Mean', 'Max abs', 'Negative max'],
    [residualMean, residualMaxAbs, -residualMaxAbs],
    theme,
  );
}

function createBarSpec(summary: Record<string, unknown>, theme: PlotlyTheme): PlotlyChartSpec {
  const featureUsage = readNumberRecord(summary.featureUsage);
  const coefficientMagnitudes = readNumberArray(summary.coefficientMagnitudes);
  const values =
    Object.keys(featureUsage).length > 0 ? Object.values(featureUsage) : coefficientMagnitudes;
  const labels =
    Object.keys(featureUsage).length > 0
      ? Object.keys(featureUsage)
      : values.map((_, index) => `Feature ${index + 1}`);

  return createBarChartSpec(labels, values, theme);
}

function createBarChartSpec(
  labels: readonly string[],
  values: readonly number[],
  theme: PlotlyTheme,
): PlotlyChartSpec {
  return {
    data: [
      {
        hovertemplate: '%{x}: %{y}<extra></extra>',
        marker: { color: theme.teal },
        text: values.map(formatNumber),
        textposition: 'auto',
        type: 'bar',
        x: labels,
        y: values,
      },
    ],
    layout: {
      ...createBaseLayout(theme),
      xaxis: createAxis(theme),
      yaxis: { ...createAxis(theme), title: { text: 'Value' } },
    },
  };
}

function createTreeSpec(summary: Record<string, unknown>, theme: PlotlyTheme): PlotlyChartSpec {
  const rootFeature = typeof summary.rootFeature === 'string' ? summary.rootFeature : 'feature';
  const threshold = readFiniteNumber(summary.rootThreshold);

  return {
    data: [
      {
        hoverinfo: 'skip',
        line: { color: theme.line, width: 2 },
        mode: 'lines',
        type: 'scatter',
        x: [0, -1, null, 0, 1],
        y: [1, 0, null, 1, 0],
      },
      {
        hovertemplate: '%{text}<extra></extra>',
        marker: { color: [theme.teal, PLOTLY_COLORS[0], PLOTLY_COLORS[1]], size: [26, 20, 20] },
        mode: 'markers+text',
        text: [
          `${truncateLabel(rootFeature)}<br>${threshold === null ? 'split' : `≤ ${formatNumber(threshold)}`}`,
          'class 0',
          'class 1',
        ],
        textposition: 'top center',
        type: 'scatter',
        x: [0, -1, 1],
        y: [1, 0, 0],
      },
    ],
    layout: {
      ...createBaseLayout(theme),
      showlegend: false,
      xaxis: { ...createAxis(theme), range: [-1.5, 1.5], showgrid: false, visible: false },
      yaxis: { ...createAxis(theme), range: [-0.5, 1.5], showgrid: false, visible: false },
    },
  };
}

function createDendrogramSpec(
  summary: Record<string, unknown>,
  theme: PlotlyTheme,
): PlotlyChartSpec {
  const heights = readNumberArray(summary.mergeHeights);
  const x = heights.flatMap((_, index) => [index, index + 1, null]);
  const y = heights.flatMap((height) => [height, height, null]);

  return {
    data: [
      {
        hovertemplate: 'Merge height %{y}<extra></extra>',
        line: { color: theme.teal, width: 3 },
        mode: 'lines+markers',
        type: 'scatter',
        x,
        y,
      },
    ],
    layout: {
      ...createBaseLayout(theme),
      showlegend: false,
      xaxis: { ...createAxis(theme), title: { text: 'Merge order' } },
      yaxis: { ...createAxis(theme), title: { text: 'Height' } },
    },
  };
}

function createLossCurveSpec(
  curve: readonly {
    epoch: number;
    testLoss: number | null;
    trainLoss: number | null;
  }[],
  locale: Locale,
): PlotlyChartSpec {
  const theme = getPlotlyTheme();
  const trainPoints = curve
    .filter((point) => point.trainLoss !== null)
    .map((point) => ({ epoch: point.epoch, trainLoss: point.trainLoss as number }));
  const testPoints = curve
    .filter((point) => point.testLoss !== null)
    .map((point) => ({ epoch: point.epoch, testLoss: point.testLoss as number }));
  const data: PlotlyTrace[] = [];

  if (trainPoints.length > 0) {
    data.push({
      hovertemplate: `${locale === 'vi' ? 'Epoch' : 'Epoch'} %{x}: %{y}<extra></extra>`,
      line: { color: theme.teal, width: 3 },
      marker: { color: theme.teal, size: 6 },
      mode: 'lines+markers',
      name: locale === 'vi' ? 'Loss train' : 'Train loss',
      type: 'scatter',
      x: trainPoints.map((point) => point.epoch),
      y: trainPoints.map((point) => point.trainLoss),
    });
  }

  if (testPoints.length > 0) {
    data.push({
      hovertemplate: `${locale === 'vi' ? 'Epoch' : 'Epoch'} %{x}: %{y}<extra></extra>`,
      line: { color: PLOTLY_COLORS[1], dash: 'dot', width: 3 },
      marker: { color: PLOTLY_COLORS[1], size: 6 },
      mode: 'lines+markers',
      name: locale === 'vi' ? 'Loss test' : 'Test loss',
      type: 'scatter',
      x: testPoints.map((point) => point.epoch),
      y: testPoints.map((point) => point.testLoss),
    });
  }

  return {
    data,
    layout: {
      ...createBaseLayout(theme),
      showlegend: data.length > 1,
      xaxis: { ...createAxis(theme), title: { text: 'Epoch' } },
      yaxis: { ...createAxis(theme), title: { text: 'Loss' } },
    },
  };
}

function createBaseLayout(theme: PlotlyTheme): PlotlyLayout {
  return {
    autosize: true,
    font: { color: theme.ink, family: 'Be Vietnam Pro, sans-serif', size: 12 },
    height: 300,
    hoverlabel: { bgcolor: theme.surface, font: { color: theme.ink } },
    margin: { b: 54, l: 58, r: 24, t: 24 },
    paper_bgcolor: theme.paper,
    plot_bgcolor: theme.paper,
  };
}

function createAxis(theme: PlotlyTheme): PlotlyLayout {
  return {
    automargin: true,
    gridcolor: theme.line,
    linecolor: theme.line,
    tickfont: { color: theme.ink },
    zerolinecolor: theme.line,
  };
}

function getPlotlyTheme(): PlotlyTheme {
  return {
    ink: readThemeToken('--ink', '#1f2937'),
    line: readThemeToken('--line', '#d1d5db'),
    paper: readThemeToken('--paper', '#f8fafc'),
    surface: readThemeToken('--surface', '#ffffff'),
    teal: readThemeToken('--teal', '#0f766e'),
  };
}

function readThemeToken(token: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }

  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function getChartKind(result: MlRunResult): string {
  if (result.chartSummary && typeof result.chartSummary.kind === 'string') {
    return result.chartSummary.kind;
  }

  return result.boundary ? 'decision-boundary' : 'dataset-overview';
}

function formatChartTitle(kind: string, locale: Locale): string {
  const labels: Record<string, { en: string; vi: string }> = {
    'actual-vs-predicted': {
      en: 'Actual versus predicted residuals',
      vi: 'Residual thực tế và dự đoán',
    },
    'cluster-plot': { en: 'Cluster scatter plot', vi: 'Biểu đồ phân cụm' },
    'confusion-matrix': { en: 'Confusion matrix', vi: 'Ma trận nhầm lẫn' },
    'dataset-overview': { en: 'Dataset overview', vi: 'Tổng quan dataset' },
    'decision-boundary': { en: 'Decision boundary', vi: 'Ranh giới quyết định' },
    dendrogram: { en: 'Hierarchical dendrogram', vi: 'Dendrogram phân cấp' },
    importance: { en: 'Feature importance', vi: 'Độ quan trọng feature' },
    'polynomial-residual': { en: 'Polynomial residuals', vi: 'Residual đa thức' },
    'projection-2d': { en: 'Two-dimensional projection', vi: 'Phép chiếu hai chiều' },
    'residual-coefficient': {
      en: 'Residual and coefficient magnitudes',
      vi: 'Độ lớn residual và hệ số',
    },
    tree: { en: 'Decision tree split', vi: 'Nhánh cây quyết định' },
  };

  return labels[kind]?.[locale] ?? kind;
}

function formatChartDescription(kind: string, locale: Locale): string {
  if (locale === 'vi') {
    return `Biểu đồ ${formatChartTitle(kind, locale).toLowerCase()} được dựng từ kết quả run.`;
  }

  return `${formatChartTitle(kind, locale)} rendered from the run result.`;
}

function getScatterBounds(rows: readonly { features: readonly number[] }[]) {
  const xValues = rows.map((row) => row.features[0] ?? 0);
  const yValues = rows.map((row) => row.features[1] ?? 0);
  const x = withRangePadding(Math.min(...xValues, 0), Math.max(...xValues, 1));
  const y = withRangePadding(Math.min(...yValues, 0), Math.max(...yValues, 1));

  return { xMax: x.max, xMin: x.min, yMax: y.max, yMin: y.min };
}

function withRangePadding(min: number, max: number): { max: number; min: number } {
  const range = Math.max(max - min, 1);
  const padding = range * 0.08;

  return { max: max + padding, min: min - padding };
}

function readBoundary(
  value: Record<string, unknown> | undefined,
): { bias: number; weights: number[] } | null {
  if (!value) {
    return null;
  }

  const weights = readNumberArray(value.weights);
  const bias = readFiniteNumber(value.bias);

  return weights.length >= 2 && bias !== null ? { bias, weights } : null;
}

function calculateBoundaryY(
  x: number,
  boundary: { bias: number; weights: number[] },
  bounds: { yMax: number; yMin: number },
): number {
  const denominator = boundary.weights[1] ?? 0;
  const modelY =
    Math.abs(denominator) < Number.EPSILON
      ? bounds.yMax
      : -(boundary.bias + (boundary.weights[0] ?? 0) * x) / denominator;

  return Math.min(bounds.yMax, Math.max(bounds.yMin, modelY));
}

function getConfusionMatrix(summary: Record<string, unknown>): number[][] {
  if (Array.isArray(summary.matrix)) {
    return summary.matrix.map((row) =>
      Array.isArray(row) ? row.map((value) => readFiniteNumber(value) ?? 0) : [],
    );
  }

  return [
    [readFiniteNumber(summary.trueNegative) ?? 0, readFiniteNumber(summary.falsePositive) ?? 0],
    [readFiniteNumber(summary.falseNegative) ?? 0, readFiniteNumber(summary.truePositive) ?? 0],
  ];
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (readFiniteNumber(item) === null ? [] : [item as number]))
    : [];
}

function readNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, number>>((record, [key, item]) => {
    const number = readFiniteNumber(item);

    if (number !== null) {
      record[key] = number;
    }

    return record;
  }, {});
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function truncateLabel(value: string): string {
  return value.length > 12 ? `${value.slice(0, 11)}…` : value;
}

function formatRowLabel(label: number | undefined): string {
  return label === undefined ? 'unlabeled' : `class ${label}`;
}
