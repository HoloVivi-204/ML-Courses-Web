declare module 'ml-cart' {
  interface DecisionTreeClassifierOptions {
    gainFunction?: 'gini';
    maxDepth?: number;
    minNumSamples?: number;
  }

  export class DecisionTreeClassifier {
    constructor(options?: DecisionTreeClassifierOptions);
  }
}
