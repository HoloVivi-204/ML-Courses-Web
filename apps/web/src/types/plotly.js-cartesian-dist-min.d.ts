declare module 'plotly.js-cartesian-dist-min' {
  export type PlotlyLayout = Record<string, unknown>;
  export type PlotlyTrace = Record<string, unknown>;

  export interface PlotlyModule {
    newPlot(
      element: HTMLElement,
      data: readonly PlotlyTrace[],
      layout: PlotlyLayout,
      config: Record<string, unknown>,
    ): Promise<unknown>;
    purge(element: HTMLElement): void;
  }

  const plotly: PlotlyModule;

  export default plotly;
}
