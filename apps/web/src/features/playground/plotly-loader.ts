import type { PlotlyModule } from 'plotly.js-cartesian-dist-min';

export async function loadPlotly(): Promise<PlotlyModule> {
  const { default: plotly } = await import('plotly.js-cartesian-dist-min');

  return plotly;
}
