import { localize, type Locale } from '../catalog/course-data';

import type { LearningDemoContent, LearningDemoStep } from './learning-api';

export function FixedDemoFrame({
  demo,
  locale,
  step,
  stepIndex,
}: {
  demo: LearningDemoContent;
  locale: Locale;
  step: LearningDemoStep;
  stepIndex: number;
}) {
  return (
    <div className="and-demo-frame">
      <svg
        aria-label={localize(step.textAlternative, locale)}
        className="and-demo-chart"
        role="img"
        viewBox="0 0 240 240"
      >
        <line className="axis-line" x1="36" x2="210" y1="196" y2="196" />
        <line className="axis-line" x1="36" x2="36" y1="196" y2="34" />
        <polyline
          className="boundary-line"
          fill="none"
          points={demo.visualization.boundary.map((point) => `${point.x},${point.y}`).join(' ')}
        />
        {demo.visualization.points.map((point) => (
          <DemoPoint
            isPositive={
              point.classification
                ? point.classification === 'positive'
                : stepIndex >= point.positiveFromStep
            }
            key={`${point.x}:${point.y}:${point.label}`}
            label={point.label}
            x={point.x}
            y={point.y}
          />
        ))}
        <text x="62" y="222">
          {demo.algorithmId}
        </text>
      </svg>

      {demo.fixedRun ? (
        <table className="and-truth-table">
          <caption>
            {demo.fixedRun.caption
              ? localize(demo.fixedRun.caption, locale)
              : locale === 'vi'
                ? 'Dữ liệu và kết quả AND cố định'
                : 'Fixed AND data and results'}
          </caption>
          <thead>
            <tr>
              <th>x1</th>
              <th>x2</th>
              <th>{locale === 'vi' ? 'Nhãn' : 'Target'}</th>
              <th>{locale === 'vi' ? 'Dự đoán' : 'Prediction'}</th>
            </tr>
          </thead>
          <tbody>
            {demo.fixedRun.rows.map((row) => (
              <tr key={row.input.join(':')}>
                <td>{row.input[0]}</td>
                <td>{row.input[1]}</td>
                <td>{row.targetOutput}</td>
                <td>{row.predictedOutput}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="and-truth-table">
          <caption>{demo.problemId}</caption>
          <tbody>
            <tr>
              <th>step</th>
              <td>{step.id}</td>
            </tr>
            <tr>
              <th>seed</th>
              <td>{demo.seed}</td>
            </tr>
            <tr>
              <th>status</th>
              <td>fixed</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function DemoPoint({
  isPositive,
  label,
  x,
  y,
}: {
  isPositive: boolean;
  label: string;
  x: number;
  y: number;
}) {
  return (
    <g className={isPositive ? 'and-point is-positive' : 'and-point'}>
      <circle cx={x} cy={y} r="12" />
      <text x={x - 9} y={y + 31}>
        {label}
      </text>
    </g>
  );
}
