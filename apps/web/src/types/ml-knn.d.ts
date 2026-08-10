declare module 'ml-knn' {
  interface KnnOptions {
    k?: number;
  }

  export default class KNN {
    constructor(dataset: number[][], labels: number[], options?: KnnOptions);

    predict(dataset: number[][]): number[];
  }
}
