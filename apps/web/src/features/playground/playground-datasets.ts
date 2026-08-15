export type PlaygroundDatasetTask =
  | 'binary-classification'
  | 'clustering'
  | 'dimensionality-reduction'
  | 'multiclass-classification'
  | 'regression';

export interface PlaygroundDatasetRow {
  features: readonly number[];
  label?: number | undefined;
  rowId: string;
}

export interface PlaygroundDatasetSource {
  attribution: {
    en: string;
    vi: string;
  };
  generator: {
    formula: string;
    id: 'release-one-playground-generator';
    parameterManifest: string;
    version: '1';
  };
  kind: 'generated';
  license: {
    id: 'LicenseRef-generated-playground-baseline';
    notice: string;
  };
  sourceId: 'generated-playground-baseline';
}

export interface PlaygroundDataset {
  datasetVersionId: string;
  featureColumns: readonly string[];
  labelColumn?: string | undefined;
  rows: readonly PlaygroundDatasetRow[];
  schemaVersion: 1;
  source: PlaygroundDatasetSource;
  task: PlaygroundDatasetTask;
  textAlternative: {
    en: string;
    vi: string;
  };
}

export interface PlaygroundDataSplit {
  testRows: readonly PlaygroundDatasetRow[];
  trainRows: readonly PlaygroundDatasetRow[];
}

const XOR_DATASET_SEED = 42;
const XOR_SAMPLE_COUNT = 400;
const XOR_NOISE_STD = 0.15;
const INSURANCE_DATASET_SEED = 314;
const INSURANCE_SAMPLE_COUNT = 64;

const playgroundDatasets = [
  createDataset({
    datasetVersionId: 'ds-xor-noisy-v1',
    featureColumns: ['x1', 'x2'],
    labelColumn: 'xorLabel',
    rows: createXorRows(),
    task: 'binary-classification',
    textAlternative: {
      en: 'Four noisy XOR quadrants with two numeric features and a binary label.',
      vi: 'Bốn cụm XOR có nhiễu với hai đặc trưng số và nhãn nhị phân.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-moons-2d-v1',
    featureColumns: ['x1', 'x2'],
    labelColumn: 'moonClass',
    rows: createMoonsRows(),
    task: 'binary-classification',
    textAlternative: {
      en: 'Two deterministic noisy moon shapes with two numeric features and a binary label.',
      vi: 'Hai cung trang khuyet co nhieu xac dinh voi hai dac trung so va nhan nhi phan.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-house-price-v1',
    featureColumns: ['areaSqm', 'rooms', 'distanceKm', 'ageYears'],
    labelColumn: 'priceIndex',
    rows: createHouseRows(),
    task: 'regression',
    textAlternative: {
      en: 'Synthetic house-price rows generated from area, rooms, distance, and age.',
      vi: 'Dữ liệu giá nhà tổng hợp từ diện tích, số phòng, khoảng cách và tuổi nhà.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-insurance-cost-v1',
    featureColumns: ['ageYears', 'bodyMassIndex', 'smokerRiskIndex', 'childrenCount'],
    labelColumn: 'annualCostIndex',
    rows: createInsuranceRows(),
    task: 'regression',
    textAlternative: {
      en: 'Synthetic insurance-cost rows with numeric values already encoded for age, body mass, smoker risk, and children.',
      vi: 'Dữ liệu chi phí bảo hiểm tổng hợp với đặc trưng số đã mã hóa cho tuổi, BMI, rủi ro hút thuốc và số con.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-sms-spam-v1',
    featureColumns: ['offerTerms', 'moneyTerms', 'linkTerms', 'meetingTerms', 'personalTerms'],
    labelColumn: 'isSpam',
    rows: createSpamRows(),
    task: 'binary-classification',
    textAlternative: {
      en: 'Offline numeric SMS features representing promotional, money, link, and ham context terms.',
      vi: 'Đặc trưng SMS dạng số đã tạo sẵn cho nhóm từ khuyến mãi, tiền, liên kết và ngữ cảnh thường.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-customer-churn-v1',
    featureColumns: ['tenureMonths', 'monthlyChargeIndex', 'supportContactIndex', 'contractIndex'],
    labelColumn: 'isChurned',
    rows: createChurnRows(),
    task: 'binary-classification',
    textAlternative: {
      en: 'Synthetic customer-churn rows with pre-encoded tenure, charge, support, and contract signals.',
      vi: 'Du lieu customer churn tong hop voi tenure, chi phi, lien he ho tro va loai hop dong da ma hoa so.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-credit-risk-v1',
    featureColumns: ['incomeScore', 'debtRatio', 'missedPayments', 'collateralScore'],
    labelColumn: 'isHighRisk',
    rows: createCreditRows(),
    task: 'binary-classification',
    textAlternative: {
      en: 'Synthetic credit rows with income, debt ratio, missed payments, and collateral score.',
      vi: 'Dữ liệu tín dụng tổng hợp với thu nhập, tỷ lệ nợ, lần trễ hạn và điểm tài sản đảm bảo.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-wine-cultivar-v1',
    featureColumns: ['flavonoidIndex', 'hueIndex', 'colorIntensityIndex', 'prolineIndex'],
    labelColumn: 'cultivarClass',
    rows: createWineRows(),
    task: 'multiclass-classification',
    textAlternative: {
      en: 'Synthetic wine cultivar rows with four standardized numeric chemistry indicators and three classes.',
      vi: 'Du lieu cultivar ruou vang tong hop voi bon chi bao hoa hoc dang so va ba lop.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-retail-segments-v1',
    featureColumns: ['annualSpendIndex', 'visitFrequencyIndex'],
    rows: createRetailRows(),
    task: 'clustering',
    textAlternative: {
      en: 'Synthetic retail customers arranged into four spend/frequency segments.',
      vi: 'Khách hàng bán lẻ tổng hợp thành bốn nhóm theo mức chi tiêu và tần suất ghé mua.',
    },
  }),
  createDataset({
    datasetVersionId: 'ds-country-indicators-v1',
    featureColumns: ['prosperityIndex', 'wellbeingIndex'],
    rows: createCountryRows(),
    task: 'dimensionality-reduction',
    textAlternative: {
      en: 'Synthetic country indicator rows with prosperity and wellbeing indices.',
      vi: 'Dữ liệu chỉ báo quốc gia tổng hợp với chỉ số thịnh vượng và phúc lợi.',
    },
  }),
] satisfies readonly PlaygroundDataset[];

export function getPlaygroundDatasetRegistry(): readonly PlaygroundDataset[] {
  return playgroundDatasets;
}

export function getPlaygroundDataset(datasetVersionId: string): PlaygroundDataset {
  const dataset = playgroundDatasets.find(
    (candidate) => candidate.datasetVersionId === datasetVersionId,
  );

  if (!dataset) {
    throw new Error(`Unsupported playground dataset version: ${datasetVersionId}.`);
  }

  return dataset;
}

export function splitDatasetRows(
  dataset: Pick<PlaygroundDataset, 'rows'>,
  trainRatio: number,
  seed: number,
): PlaygroundDataSplit {
  if (trainRatio <= 0 || trainRatio >= 1 || !Number.isFinite(trainRatio)) {
    throw new Error('trainRatio must be a finite number between 0 and 1.');
  }

  const shuffledRows = shuffleItems(dataset.rows, seed);
  const trainCount = Math.floor(shuffledRows.length * trainRatio);
  const trainRows = shuffledRows.slice(0, trainCount);
  const testRows = shuffledRows.slice(trainCount);

  if (trainRows.length === 0 || testRows.length === 0) {
    throw new Error('trainRatio must leave at least one train row and one test row.');
  }

  return { testRows, trainRows };
}

export function shuffleItems<TItem>(items: readonly TItem[], seed: number): TItem[] {
  const random = createSeededRandom(seed);
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentItem = shuffledItems[index];
    const swapItem = shuffledItems[swapIndex];

    if (currentItem === undefined || swapItem === undefined) {
      continue;
    }

    shuffledItems[index] = swapItem;
    shuffledItems[swapIndex] = currentItem;
  }

  return shuffledItems;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function gaussian(random: () => number): number {
  const left = Math.max(random(), Number.EPSILON);
  const right = random();

  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right);
}

export function roundMetric(value: number, precision = 4): number {
  const rounded = Number(value.toFixed(precision));

  return Object.is(rounded, -0) ? 0 : rounded;
}

function createDataset(input: {
  datasetVersionId: string;
  featureColumns: readonly string[];
  labelColumn?: string | undefined;
  rows: readonly PlaygroundDatasetRow[];
  task: PlaygroundDatasetTask;
  textAlternative: PlaygroundDataset['textAlternative'];
}): PlaygroundDataset {
  const source: PlaygroundDatasetSource = {
    kind: 'generated',
    attribution: {
      en: 'Generated synthetic dataset for interactive practice.',
      vi: 'Dữ liệu tổng hợp cho hoạt động thực hành.',
    },
    generator: {
      formula: 'Deterministic rows generated from the dataset parameters.',
      id: 'release-one-playground-generator',
      parameterManifest: `${input.datasetVersionId}:generator-v1`,
      version: '1',
    },
    license: {
      id: 'LicenseRef-generated-playground-baseline',
      notice: 'Generated for interactive practice.',
    },
    sourceId: 'generated-playground-baseline',
  };

  return {
    schemaVersion: 1,
    datasetVersionId: input.datasetVersionId,
    featureColumns: input.featureColumns,
    labelColumn: input.labelColumn,
    task: input.task,
    rows: input.rows,
    source,
    textAlternative: input.textAlternative,
  };
}

function createXorRows(): PlaygroundDatasetRow[] {
  const random = createSeededRandom(XOR_DATASET_SEED);
  const centers: readonly (readonly [number, number, 0 | 1])[] = [
    [-1, -1, 0],
    [-1, 1, 1],
    [1, -1, 1],
    [1, 1, 0],
  ];
  const rows: PlaygroundDatasetRow[] = [];

  centers.forEach(([centerX1, centerX2, label], centerIndex) => {
    for (let index = 0; index < XOR_SAMPLE_COUNT / centers.length; index += 1) {
      rows.push({
        rowId: `xor-${centerIndex}-${String(index).padStart(3, '0')}`,
        features: [
          centerX1 + gaussian(random) * XOR_NOISE_STD,
          centerX2 + gaussian(random) * XOR_NOISE_STD,
        ],
        label,
      });
    }
  });

  return rows;
}

function createMoonsRows(): PlaygroundDatasetRow[] {
  const random = createSeededRandom(2_024);
  const samplesPerClass = 80;
  const rows: PlaygroundDatasetRow[] = [];

  for (let index = 0; index < samplesPerClass; index += 1) {
    const angle = (Math.PI * index) / (samplesPerClass - 1);

    rows.push({
      rowId: `moon-0-${String(index + 1).padStart(3, '0')}`,
      features: [
        roundMetric(Math.cos(angle) + gaussian(random) * 0.09),
        roundMetric(Math.sin(angle) + gaussian(random) * 0.09),
      ],
      label: 0,
    });
    rows.push({
      rowId: `moon-1-${String(index + 1).padStart(3, '0')}`,
      features: [
        roundMetric(1 - Math.cos(angle) + gaussian(random) * 0.09),
        roundMetric(0.48 - Math.sin(angle) + gaussian(random) * 0.09),
      ],
      label: 1,
    });
  }

  return rows;
}

function createHouseRows(): PlaygroundDatasetRow[] {
  const featureRows: readonly (readonly [number, number, number, number])[] = [
    [45, 2, 8, 20],
    [52, 2, 6, 15],
    [58, 3, 9, 12],
    [64, 3, 5, 10],
    [70, 3, 7, 8],
    [76, 3, 4, 7],
    [82, 4, 6, 6],
    [88, 4, 3, 5],
    [96, 4, 5, 4],
    [104, 4, 2, 3],
    [112, 5, 4, 2],
    [120, 5, 2, 1],
    [128, 5, 3, 2],
    [136, 5, 1, 1],
    [144, 6, 2, 0],
    [152, 6, 1, 0],
    [160, 6, 3, 4],
    [168, 6, 2, 3],
    [176, 7, 1, 2],
    [184, 7, 1, 1],
  ];

  return featureRows.map((features, index) => ({
    rowId: `house-${String(index + 1).padStart(2, '0')}`,
    features,
    label: roundMetric(
      80 + features[0] * 2.4 + features[1] * 25 - features[2] * 5 - features[3] * 1.2,
    ),
  }));
}

function createInsuranceRows(): PlaygroundDatasetRow[] {
  const random = createSeededRandom(INSURANCE_DATASET_SEED);

  return Array.from({ length: INSURANCE_SAMPLE_COUNT }, (_, index) => {
    const ageYears = 18 + random() * 47;
    const bodyMassIndex = 18 + random() * 17;
    const smokerRiskIndex = 0.05 + random() * 0.9;
    const childrenCount = Math.floor(random() * 5);
    const label =
      600 +
      ageYears * 27 +
      bodyMassIndex * 82 +
      smokerRiskIndex * 8_700 +
      childrenCount * 210 +
      bodyMassIndex ** 2 * 7.5 +
      ageYears * smokerRiskIndex * 105;

    return {
      rowId: `insurance-${String(index + 1).padStart(2, '0')}`,
      features: [ageYears, bodyMassIndex, smokerRiskIndex, childrenCount],
      label: roundMetric(label),
    };
  });
}

function createSpamRows(): PlaygroundDatasetRow[] {
  const rows: readonly (readonly [number, number, number, number, number, 0 | 1])[] = [
    [0.85, 0.9, 0.7, 0.05, 0.05, 1],
    [0.75, 0.8, 0.65, 0.1, 0.05, 1],
    [0.9, 0.7, 0.8, 0.05, 0.1, 1],
    [0.68, 0.88, 0.75, 0.1, 0.05, 1],
    [0.8, 0.72, 0.7, 0.15, 0.1, 1],
    [0.72, 0.95, 0.82, 0.05, 0.1, 1],
    [0.88, 0.78, 0.76, 0.08, 0.08, 1],
    [0.7, 0.84, 0.68, 0.12, 0.05, 1],
    [0.05, 0.05, 0.02, 0.82, 0.7, 0],
    [0.08, 0.02, 0.03, 0.78, 0.8, 0],
    [0.04, 0.08, 0.01, 0.86, 0.65, 0],
    [0.78, 0.86, 0.72, 0.08, 0.08, 1],
    [0.82, 0.74, 0.79, 0.04, 0.08, 1],
    [0.12, 0.08, 0.05, 0.72, 0.7, 0],
    [0.03, 0.05, 0.02, 0.88, 0.76, 0],
    [0.09, 0.06, 0.03, 0.7, 0.78, 0],
    [0.1, 0.04, 0.02, 0.75, 0.74, 0],
    [0.07, 0.02, 0.04, 0.84, 0.72, 0],
    [0.06, 0.03, 0.04, 0.8, 0.82, 0],
    [0.04, 0.07, 0.01, 0.9, 0.69, 0],
  ];

  return rows.map(
    ([offerTerms, moneyTerms, linkTerms, meetingTerms, personalTerms, label], index) => ({
      rowId: `sms-${String(index + 1).padStart(2, '0')}`,
      features: [offerTerms, moneyTerms, linkTerms, meetingTerms, personalTerms],
      label,
    }),
  );
}

function createChurnRows(): PlaygroundDatasetRow[] {
  const random = createSeededRandom(731);

  return Array.from({ length: 60 }, (_, index) => {
    const label = index % 4 === 0 || index % 11 === 0;
    const variance = gaussian(random);

    return {
      rowId: `churn-${String(index + 1).padStart(2, '0')}`,
      features: label
        ? [
            roundMetric(2 + random() * 16 + variance),
            roundMetric(72 + random() * 26 + variance * 2),
            roundMetric(4 + random() * 5 + Math.abs(variance)),
            roundMetric(random() * 0.35),
          ]
        : [
            roundMetric(28 + random() * 44 + variance),
            roundMetric(28 + random() * 38 + variance * 2),
            roundMetric(random() * 2.8 + Math.max(variance, -0.5)),
            roundMetric(1 + random() * 1.8),
          ],
      label: label ? 1 : 0,
    };
  });
}

function createCreditRows(): PlaygroundDatasetRow[] {
  const rows: readonly (readonly [number, number, number, number, 0 | 1])[] = [
    [82, 0.24, 0, 76, 0],
    [76, 0.31, 0, 69, 0],
    [68, 0.42, 1, 58, 0],
    [72, 0.38, 0, 62, 0],
    [58, 0.53, 1, 45, 0],
    [44, 0.68, 2, 34, 1],
    [36, 0.74, 3, 28, 1],
    [50, 0.63, 2, 40, 1],
    [52, 0.58, 2, 44, 1],
    [88, 0.22, 0, 82, 0],
    [41, 0.71, 3, 31, 1],
    [69, 0.34, 1, 66, 0],
    [55, 0.61, 2, 38, 1],
    [78, 0.27, 0, 71, 0],
    [47, 0.66, 2, 33, 1],
    [64, 0.46, 1, 52, 0],
    [39, 0.8, 4, 22, 1],
    [74, 0.35, 0, 63, 0],
    [62, 0.59, 2, 42, 1],
    [86, 0.19, 0, 85, 0],
  ];

  return rows.map(([incomeScore, debtRatio, missedPayments, collateralScore, label], index) => ({
    rowId: `credit-${String(index + 1).padStart(2, '0')}`,
    features: [incomeScore, debtRatio, missedPayments, collateralScore],
    label,
  }));
}

function createWineRows(): PlaygroundDatasetRow[] {
  const random = createSeededRandom(1_779);
  const centers: readonly (readonly [number, number, number, number])[] = [
    [1.2, 0.7, 2.1, 1.1],
    [3.7, 2.9, 4.8, 4.2],
    [6.4, 5.8, 7.1, 7.3],
  ];

  return centers.flatMap((center, label) =>
    Array.from({ length: 20 }, (_, index) => ({
      rowId: `wine-${label}-${String(index + 1).padStart(2, '0')}`,
      features: center.map((value) => roundMetric(value + gaussian(random) * 0.28)),
      label,
    })),
  );
}

function createRetailRows(): PlaygroundDatasetRow[] {
  const rows: readonly (readonly [number, number])[] = [
    [1, 1],
    [1.1, 0.9],
    [0.9, 1.1],
    [1.05, 1.05],
    [1, 5],
    [1.1, 5.1],
    [0.9, 4.9],
    [1.05, 5.05],
    [5, 1],
    [5.1, 0.9],
    [4.9, 1.1],
    [5.05, 1.05],
    [5, 5],
    [5.1, 5.1],
    [4.9, 4.9],
    [5.05, 4.95],
  ];

  return rows.map((features, index) => ({
    rowId: `retail-${String(index + 1).padStart(2, '0')}`,
    features,
  }));
}

function createCountryRows(): PlaygroundDatasetRow[] {
  const rows: readonly (readonly [number, number])[] = [
    [35, 48],
    [42, 52],
    [48, 58],
    [55, 61],
    [63, 68],
    [70, 74],
    [78, 81],
    [86, 88],
  ];

  return rows.map((features, index) => ({
    rowId: `country-${String(index + 1).padStart(2, '0')}`,
    features,
  }));
}
