import type { Locale } from '../catalog/course-data';
import type { PlaygroundDataset } from './playground-datasets';
import type { MlRunResult } from './ml-engine-contract';

interface PlaygroundVisualizationProps {
  dataset: PlaygroundDataset | null;
  locale: Locale;
  result: MlRunResult;
}

const CHART_WIDTH = 520;
const CHART_HEIGHT = 300;
const PLOT_LEFT = 44;
const PLOT_RIGHT = 494;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 252;
const CLASS_COLORS = ['class-zero', 'class-one', 'class-two', 'class-three'] as const;

export function PlaygroundVisualization({ dataset, locale, result }: PlaygroundVisualizationProps) {
  const chartKind = getChartKind(result);
  const chartTitle = formatChartTitle(chartKind, locale);

  return (
    <div className="playground-visualization" data-testid="playground-visualization">
      <figure className="playground-chart-figure">
        <svg
          aria-labelledby="playground-chart-title playground-chart-description"
          className="playground-chart"
          data-chart-kind={chartKind}
          data-testid={`playground-chart-${chartKind}`}
          role="img"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <title id="playground-chart-title">{chartTitle}</title>
          <desc id="playground-chart-description">{formatChartDescription(chartKind, locale)}</desc>
          {renderChart({ chartKind, dataset, result })}
        </svg>
        <figcaption>{chartTitle}</figcaption>
      </figure>
      {result.lossCurve && result.lossCurve.length > 0 ? (
        <LossCurveChart locale={locale} points={result.lossCurve} />
      ) : null}
    </div>
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
    const loss = readFiniteNumber(point.loss);

    return epoch === null || loss === null ? [] : [{ epoch, loss }];
  });

  if (curve.length === 0) {
    return null;
  }

  const epochMax = Math.max(...curve.map((point) => point.epoch), 1);
  const lossMax = Math.max(...curve.map((point) => point.loss), 0.0001);
  const path = curve
    .map(
      (point) =>
        `${projectLinear(point.epoch, 1, epochMax, PLOT_LEFT, PLOT_RIGHT)},${projectLinear(
          point.loss,
          0,
          lossMax,
          PLOT_BOTTOM,
          PLOT_TOP,
        )}`,
    )
    .join(' ');

  return (
    <figure className="playground-chart-figure playground-loss-figure">
      <svg
        aria-labelledby="playground-loss-title playground-loss-description"
        className="playground-chart playground-loss-chart"
        data-testid="playground-loss-chart"
        role="img"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        <title id="playground-loss-title">
          {locale === 'vi' ? 'Đường cong loss' : 'Loss curve'}
        </title>
        <desc id="playground-loss-description">
          {locale === 'vi'
            ? 'Loss theo từng epoch trong quá trình huấn luyện.'
            : 'Loss measured at each training epoch.'}
        </desc>
        <line
          className="chart-axis"
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={PLOT_BOTTOM}
          y2={PLOT_BOTTOM}
        />
        <line className="chart-axis" x1={PLOT_LEFT} x2={PLOT_LEFT} y1={PLOT_TOP} y2={PLOT_BOTTOM} />
        <polyline className="chart-series loss-series" points={path} />
        {curve.map((point, index) => (
          <circle
            className="chart-point"
            cx={projectLinear(point.epoch, 1, epochMax, PLOT_LEFT, PLOT_RIGHT)}
            cy={projectLinear(point.loss, 0, lossMax, PLOT_BOTTOM, PLOT_TOP)}
            data-point-index={index}
            key={`${point.epoch}-${index}`}
            r="3.5"
          >
            <title>
              {locale === 'vi' ? 'Epoch' : 'Epoch'} {point.epoch}: {point.loss}
            </title>
          </circle>
        ))}
        <text className="chart-label" x={PLOT_LEFT} y={CHART_HEIGHT - 12}>
          {locale === 'vi' ? 'Epoch' : 'Epoch'}
        </text>
        <text
          className="chart-label"
          transform={`rotate(-90 14 ${PLOT_BOTTOM / 2})`}
          x="14"
          y={PLOT_BOTTOM / 2}
        >
          Loss
        </text>
      </svg>
      <figcaption>{locale === 'vi' ? 'Loss theo epoch' : 'Loss over epochs'}</figcaption>
    </figure>
  );
}

function renderChart({
  chartKind,
  dataset,
  result,
}: {
  chartKind: string;
  dataset: PlaygroundDataset | null;
  result: MlRunResult;
}) {
  const summary = result.chartSummary ?? {};

  if (chartKind === 'confusion-matrix') {
    return <ConfusionMatrixChart summary={summary} />;
  }

  if (chartKind === 'actual-vs-predicted' || chartKind === 'polynomial-residual') {
    return <ResidualChart summary={summary} />;
  }

  if (chartKind === 'residual-coefficient' || chartKind === 'importance') {
    return <BarChart summary={summary} />;
  }

  if (chartKind === 'tree') {
    return <TreeChart summary={summary} />;
  }

  if (chartKind === 'dendrogram') {
    return <DendrogramChart summary={summary} />;
  }

  if (
    chartKind === 'cluster-plot' ||
    chartKind === 'projection-2d' ||
    chartKind === 'decision-boundary'
  ) {
    return <ScatterChart dataset={dataset} result={result} />;
  }

  return <ScatterChart dataset={dataset} result={result} />;
}

function ScatterChart({
  dataset,
  result,
}: {
  dataset: PlaygroundDataset | null;
  result: MlRunResult;
}) {
  const rows = dataset?.rows.slice(0, 180) ?? [];
  const bounds = getScatterBounds(rows);
  const boundary = readBoundary(result.boundary);
  const summary = result.chartSummary ?? {};
  const clusterCount = readNumberArray(summary.clusterSizes).length;
  const pointClassCount = Math.max(clusterCount, 2);

  return (
    <g className="scatter-chart">
      <line
        className="chart-axis"
        x1={PLOT_LEFT}
        x2={PLOT_RIGHT}
        y1={PLOT_BOTTOM}
        y2={PLOT_BOTTOM}
      />
      <line className="chart-axis" x1={PLOT_LEFT} x2={PLOT_LEFT} y1={PLOT_TOP} y2={PLOT_BOTTOM} />
      {rows.map((row, index) => {
        const [x, y] = row.features;

        return (
          <circle
            className={`chart-point ${CLASS_COLORS[index % pointClassCount] ?? 'class-zero'}`}
            cx={projectFeature(x ?? 0, bounds.xMin, bounds.xMax, PLOT_LEFT, PLOT_RIGHT)}
            cy={projectFeature(y ?? 0, bounds.yMin, bounds.yMax, PLOT_BOTTOM, PLOT_TOP)}
            data-row-id={row.rowId}
            key={row.rowId}
            r="3.4"
          >
            <title>
              {row.rowId}: {row.label === undefined ? 'unlabeled' : `class ${row.label}`}
            </title>
          </circle>
        );
      })}
      {boundary ? (
        <line
          className="boundary"
          data-testid="playground-boundary-line"
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={projectBoundaryY(bounds.xMin, boundary, bounds, PLOT_BOTTOM, PLOT_TOP)}
          y2={projectBoundaryY(bounds.xMax, boundary, bounds, PLOT_BOTTOM, PLOT_TOP)}
        />
      ) : (
        <line
          className="boundary boundary-placeholder"
          data-testid="playground-boundary-placeholder"
          x1={PLOT_LEFT + 12}
          x2={PLOT_RIGHT - 12}
          y1={PLOT_BOTTOM - 18}
          y2={PLOT_TOP + 18}
        />
      )}
      <text className="chart-label" x={PLOT_LEFT} y={CHART_HEIGHT - 12}>
        {dataset?.featureColumns[0] ?? 'feature 1'}
      </text>
      <text
        className="chart-label"
        transform={`rotate(-90 14 ${PLOT_BOTTOM / 2})`}
        x="14"
        y={PLOT_BOTTOM / 2}
      >
        {dataset?.featureColumns[1] ?? 'feature 2'}
      </text>
    </g>
  );
}

function ConfusionMatrixChart({ summary }: { summary: Record<string, unknown> }) {
  const matrix = getConfusionMatrix(summary);
  const cellSize = Math.min(92, 250 / matrix.length);
  const originX = 132;
  const originY = 38;
  const maxValue = Math.max(...matrix.flat(), 1);

  return (
    <g className="confusion-matrix-chart">
      <text className="chart-label" x={originX + (matrix.length * cellSize) / 2} y="18">
        Predicted
      </text>
      <text className="chart-label" transform="rotate(-90 18 150)" x="18" y="150">
        Actual
      </text>
      {matrix.map((row, rowIndex) =>
        row.map((value, columnIndex) => {
          const x = originX + columnIndex * cellSize;
          const y = originY + rowIndex * cellSize;

          return (
            <g key={`${rowIndex}-${columnIndex}`}>
              <rect
                className="confusion-cell"
                data-cell-value={value}
                height={cellSize - 4}
                opacity={0.18 + (value / maxValue) * 0.72}
                width={cellSize - 4}
                x={x}
                y={y}
              />
              <text
                className="chart-cell-label"
                x={x + (cellSize - 4) / 2}
                y={y + (cellSize - 4) / 2 + 5}
              >
                {value}
              </text>
            </g>
          );
        }),
      )}
    </g>
  );
}

function ResidualChart({ summary }: { summary: Record<string, unknown> }) {
  const residualMean = readFiniteNumber(summary.residualMean) ?? 0;
  const residualMaxAbs = Math.abs(readFiniteNumber(summary.residualMaxAbs) ?? 0);
  const values = [residualMean, residualMaxAbs, -residualMaxAbs];
  const max = Math.max(...values.map(Math.abs), 1);

  return (
    <VerticalBarChart labels={['mean', 'max abs', 'negative max']} values={values} max={max} />
  );
}

function BarChart({ summary }: { summary: Record<string, unknown> }) {
  const featureUsage = readNumberRecord(summary.featureUsage);
  const coefficientMagnitudes = readNumberArray(summary.coefficientMagnitudes);
  const values =
    Object.keys(featureUsage).length > 0 ? Object.values(featureUsage) : coefficientMagnitudes;
  const labels =
    Object.keys(featureUsage).length > 0
      ? Object.keys(featureUsage)
      : values.map((_, index) => `feature ${index + 1}`);
  const max = Math.max(...values, 1);

  return <VerticalBarChart labels={labels} values={values} max={max} />;
}

function VerticalBarChart({
  labels,
  max,
  values,
}: {
  labels: readonly string[];
  max: number;
  values: readonly number[];
}) {
  const barWidth = Math.max(20, Math.min(70, 360 / Math.max(values.length, 1)));
  const gap = values.length > 1 ? (360 - values.length * barWidth) / (values.length - 1) : 0;

  return (
    <g className="bar-chart">
      <line
        className="chart-axis"
        x1={PLOT_LEFT}
        x2={PLOT_RIGHT}
        y1={PLOT_BOTTOM}
        y2={PLOT_BOTTOM}
      />
      {values.map((value, index) => {
        const x = PLOT_LEFT + 18 + index * (barWidth + gap);
        const height = (Math.abs(value) / max) * 172;
        const y = value < 0 ? PLOT_BOTTOM : PLOT_BOTTOM - height;

        return (
          <g key={`${labels[index] ?? 'value'}-${index}`}>
            <rect
              className="chart-bar"
              data-value={value}
              height={height}
              width={barWidth}
              x={x}
              y={y}
            />
            <text
              className="chart-label chart-bar-label"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={PLOT_BOTTOM + 18}
            >
              {truncateLabel(labels[index] ?? `value ${index + 1}`)}
            </text>
            <text
              className="chart-value"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={Math.max(PLOT_TOP + 12, y - 5)}
            >
              {formatNumber(value)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function TreeChart({ summary }: { summary: Record<string, unknown> }) {
  const rootFeature = typeof summary.rootFeature === 'string' ? summary.rootFeature : 'feature';
  const threshold = readFiniteNumber(summary.rootThreshold);

  return (
    <g className="tree-chart">
      <line className="tree-branch" x1="260" x2="150" y1="112" y2="190" />
      <line className="tree-branch" x1="260" x2="370" y1="112" y2="190" />
      <rect className="tree-node tree-root" height="60" rx="8" width="156" x="182" y="52" />
      <text className="chart-cell-label" textAnchor="middle" x="260" y="78">
        {truncateLabel(rootFeature)}
      </text>
      <text className="chart-cell-label" textAnchor="middle" x="260" y="98">
        {threshold === null ? 'split' : `≤ ${formatNumber(threshold)}`}
      </text>
      <rect className="tree-node" height="48" rx="8" width="110" x="95" y="190" />
      <rect className="tree-node" height="48" rx="8" width="110" x="315" y="190" />
      <text className="chart-cell-label" textAnchor="middle" x="150" y="218">
        class 0
      </text>
      <text className="chart-cell-label" textAnchor="middle" x="370" y="218">
        class 1
      </text>
    </g>
  );
}

function DendrogramChart({ summary }: { summary: Record<string, unknown> }) {
  const heights = readNumberArray(summary.mergeHeights);
  const max = Math.max(...heights, 0.0001);
  const step = heights.length > 0 ? 390 / heights.length : 390;

  return (
    <g className="dendrogram-chart">
      <line
        className="chart-axis"
        x1={PLOT_LEFT}
        x2={PLOT_RIGHT}
        y1={PLOT_BOTTOM}
        y2={PLOT_BOTTOM}
      />
      {heights.map((height, index) => {
        const x = PLOT_LEFT + 12 + index * step;
        const y = PLOT_BOTTOM - (height / max) * 188;

        return (
          <line
            className="dendrogram-merge"
            data-height={height}
            key={`${height}-${index}`}
            x1={x}
            x2={x + step}
            y1={y}
            y2={y}
          />
        );
      })}
      <text className="chart-label" x={PLOT_LEFT} y={CHART_HEIGHT - 12}>
        Merge order
      </text>
    </g>
  );
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
  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues, 1);
  const yMin = Math.min(...yValues, 0);
  const yMax = Math.max(...yValues, 1);

  return {
    xMax: withRangePadding(xMin, xMax).max,
    xMin: withRangePadding(xMin, xMax).min,
    yMax: withRangePadding(yMin, yMax).max,
    yMin: withRangePadding(yMin, yMax).min,
  };
}

function withRangePadding(min: number, max: number): { max: number; min: number } {
  const range = Math.max(max - min, 1);
  const padding = range * 0.08;

  return { max: max + padding, min: min - padding };
}

function projectFeature(
  value: number,
  min: number,
  max: number,
  start: number,
  end: number,
): number {
  return projectLinear(value, min, max, start, end);
}

function projectLinear(
  value: number,
  min: number,
  max: number,
  start: number,
  end: number,
): number {
  if (max === min) {
    return (start + end) / 2;
  }

  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));

  return start + ratio * (end - start);
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

function projectBoundaryY(
  x: number,
  boundary: { bias: number; weights: number[] },
  bounds: { yMax: number; yMin: number },
  start: number,
  end: number,
): number {
  const denominator = boundary.weights[1] ?? 0;
  const modelY =
    Math.abs(denominator) < Number.EPSILON
      ? bounds.yMax
      : -(boundary.bias + (boundary.weights[0] ?? 0) * x) / denominator;

  return projectFeature(modelY, bounds.yMin, bounds.yMax, start, end);
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
