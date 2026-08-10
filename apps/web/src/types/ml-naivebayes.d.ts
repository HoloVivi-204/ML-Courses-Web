declare module 'ml-naivebayes' {
  export class GaussianNB {
    predict(dataset: number[][]): number[];

    train(dataset: number[][], labels: number[]): void;
  }
}
