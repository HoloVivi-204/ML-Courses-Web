import type { LocalizedText } from '../catalog/course-data';
import type { ContentBlock } from './content-block-renderer';

export interface TrialPost {
  accessLevel: 'full' | 'trial';
  blocks: readonly ContentBlock[];
  courseId: string;
  description: LocalizedText;
  durationMinutes: number;
  id: string;
  moduleId: string;
  postQuizId: string;
  title: LocalizedText;
}

const TRIAL_POST_ID = 'dl-p01-neuron-perceptron';
const GOOGLE_NEURAL_NODES_URL =
  'https://developers.google.com/machine-learning/crash-course/' +
  'neural-networks/nodes-hidden-layers';

const blockDefaults = {
  accessibility: { en: null, vi: null },
  activityId: null,
  assetIds: [],
  postId: TRIAL_POST_ID,
  required: true,
  schemaVersion: 1,
  sourceIds: [],
} as const;

const trialBlocks = [
  {
    ...blockDefaults,
    id: 'what-is-a-neuron',
    locales: {
      en: {
        lede:
          'A neuron is a tiny decision unit. It receives signals, scores their importance, ' +
          'then produces one output.',
        navigationTitle: 'What does a neuron do?',
        title: 'From signals to a decision',
      },
      vi: {
        lede:
          'Neuron là một đơn vị ra quyết định rất nhỏ. Nó nhận tín hiệu, đánh giá mức ' +
          'quan trọng rồi tạo ra một đầu ra.',
        navigationTitle: 'Một neuron làm gì?',
        title: 'Từ tín hiệu đến quyết định',
      },
    },
    order: 1,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'neuron-explanation',
    locales: {
      en: {
        markdown:
          'Think of each input as one piece of **evidence**. The neuron combines numbers ' +
          'using a fixed, inspectable rule: $z = w_1x_1 + w_2x_2 + b$.',
      },
      vi: {
        markdown:
          'Hãy xem mỗi đầu vào như một mẩu **bằng chứng**. Neuron kết hợp các con số bằng ' +
          'một quy tắc cố định, có thể kiểm tra: $z = w_1x_1 + w_2x_2 + b$.',
      },
    },
    order: 2,
    type: 'markdown',
  },
  {
    ...blockDefaults,
    id: 'neuron-insight',
    locales: {
      en: {
        body:
          'A model decision becomes explainable when you can trace the inputs, weights, ' +
          'bias, and threshold that produced it.',
        title: 'The useful idea',
      },
      vi: {
        body:
          'Quyết định của mô hình trở nên giải thích được khi bạn lần theo đầu vào, ' +
          'trọng số, độ lệch và ngưỡng đã tạo ra nó.',
        title: 'Ý tưởng cần giữ lại',
      },
    },
    order: 3,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...blockDefaults,
    id: 'weighted-sum',
    locales: {
      en: {
        lede:
          'Before adding the inputs, the neuron multiplies each one by a weight. ' +
          'Larger weights create a stronger influence.',
        navigationTitle: 'Why weights matter',
        title: 'Weights say which signals matter',
      },
      vi: {
        lede:
          'Trước khi cộng các đầu vào, neuron nhân từng đầu vào với một trọng số. ' +
          'Trọng số lớn tạo ảnh hưởng mạnh hơn.',
        navigationTitle: 'Vì sao trọng số quan trọng?',
        title: 'Trọng số cho biết tín hiệu nào quan trọng',
      },
    },
    order: 4,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'weight-explanation',
    locales: {
      en: {
        markdown:
          'The bias shifts the decision point. A step function compares $z$ with zero and ' +
          'returns either **0** or **1**.',
      },
      vi: {
        markdown:
          'Độ lệch dịch chuyển điểm ra quyết định. Hàm bước so sánh $z$ với 0 và trả về ' +
          '**0** hoặc **1**.',
      },
    },
    order: 5,
    type: 'markdown',
  },
  {
    ...blockDefaults,
    accessibility: {
      en:
        'Inputs x one and x two are multiplied by weights, then bias is added ' +
        'to produce score z.',
      vi: 'Đầu vào x một và x hai được nhân với trọng số rồi cộng độ lệch để tạo điểm z.',
    },
    id: 'weighted-sum-formula',
    locales: {
      en: {
        bias: 'bias',
        description: 'The sign of z determines whether the step function returns 0 or 1.',
        inputs: 'inputs',
        score: 'score',
        weights: 'weights',
      },
      vi: {
        bias: 'độ lệch',
        description: 'Dấu của z quyết định hàm bước trả về 0 hay 1.',
        inputs: 'đầu vào',
        score: 'điểm',
        weights: 'trọng số',
      },
    },
    order: 6,
    type: 'formula',
  },
  {
    ...blockDefaults,
    activityId: 'act-dl-p01-neuron-perceptron-example',
    id: 'try-it',
    locales: {
      en: { navigationTitle: 'Try the decision' },
      vi: { navigationTitle: 'Thử tạo quyết định' },
    },
    order: 7,
    type: 'example',
  },
  {
    ...blockDefaults,
    id: 'read-result',
    locales: {
      en: {
        lede: 'The output is not magic. It follows directly from the sign of the weighted score.',
        navigationTitle: 'Read the result',
        title: 'Read the result, do not guess',
      },
      vi: {
        lede: 'Đầu ra không phải phép màu. Nó đi thẳng từ dấu của tổng có trọng số.',
        navigationTitle: 'Đọc kết quả',
        title: 'Đọc kết quả, không đoán mò',
      },
    },
    order: 8,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'result-thresholds',
    locales: {
      en: {
        body:
          'Toggle the two inputs again and narrate the chain aloud: inputs, weighted sum, ' +
          'threshold, output.',
        items: [
          {
            body: 'The combined evidence has not reached the threshold.',
            label: 'z < 0',
            title: 'Output 0',
          },
          {
            body: 'The combined evidence has reached or crossed the threshold.',
            label: 'z ≥ 0',
            title: 'Output 1',
          },
        ],
        title: 'Two outcomes, one rule',
      },
      vi: {
        body:
          'Hãy đổi hai đầu vào lần nữa và đọc thành tiếng chuỗi này: đầu vào, ' +
          'tổng có trọng số, ngưỡng, đầu ra.',
        items: [
          { body: 'Bằng chứng kết hợp chưa chạm ngưỡng.', label: 'z < 0', title: 'Đầu ra 0' },
          {
            body: 'Bằng chứng kết hợp đã chạm hoặc vượt ngưỡng.',
            label: 'z ≥ 0',
            title: 'Đầu ra 1',
          },
        ],
        title: 'Hai kết quả, một quy tắc',
      },
    },
    order: 9,
    type: 'callout',
    variant: 'comparison',
  },
  {
    ...blockDefaults,
    id: 'further-reading',
    locales: {
      en: {
        heading: 'Continue from a primary source',
        intro: 'Further reading is optional and does not affect lesson progress.',
        navigationTitle: 'Further reading',
      },
      vi: {
        heading: 'Đọc tiếp từ nguồn chính thống',
        intro: 'Tài liệu mở rộng là tùy chọn và không ảnh hưởng tiến độ bài học.',
        navigationTitle: 'Tài liệu mở rộng',
      },
    },
    order: 10,
    required: false,
    resources: [
      {
        attribution: {
          en: 'Reference material by Google for Developers.',
          vi: 'Tài liệu tham khảo của Google for Developers.',
        },
        language: 'en',
        license: {
          name: 'CC BY 4.0',
          url: 'https://creativecommons.org/licenses/by/4.0/',
        },
        relatedTopicIds: [],
        resourceType: 'documentation',
        sourceId: 'source-google-neural-nodes',
        sourceName: 'Google for Developers',
        title: 'Neural networks: Nodes and hidden layers',
        url: GOOGLE_NEURAL_NODES_URL,
      },
    ],
    sourceIds: ['source-google-neural-nodes'],
    type: 'source-list',
  },
] satisfies readonly ContentBlock[];

const fullLessonBlocks = [
  ...trialBlocks.filter(
    (block) => block.id !== 'result-thresholds' && block.id !== 'further-reading',
  ),
  {
    ...blockDefaults,
    id: 'xor-linear-limit',
    locales: {
      en: {
        lede:
          'XOR uses two positive cases that sit across from each other. One straight ' +
          'decision boundary cannot separate them from the negative cases.',
        navigationTitle: 'Why XOR breaks the line',
        title: 'Why does XOR break a single-layer Perceptron?',
      },
      vi: {
        lede:
          'XOR có hai trường hợp dương nằm chéo nhau. Một ranh giới quyết định thẳng ' +
          'không thể tách chúng khỏi hai trường hợp âm.',
        navigationTitle: 'Vì sao XOR phá đường thẳng?',
        title: 'Vì sao XOR làm Perceptron một lớp thất bại?',
      },
    },
    order: 9,
    type: 'heading',
  },
  {
    ...blockDefaults,
    id: 'xor-truth-table',
    locales: {
      en: {
        markdown:
          'Read the stable XOR target before thinking about weights:\n\n' +
          '| x1 | x2 | XOR |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'The positive points are diagonal, so pushing one side of a line up also ' +
          'pushes the wrong negative point up.',
      },
      vi: {
        markdown:
          'Hãy đọc target XOR ổn định trước khi nghĩ về trọng số:\n\n' +
          '| x1 | x2 | XOR |\n|---:|---:|---:|\n| 0 | 0 | 0 |\n| 0 | 1 | 1 |\n| 1 | 0 | 1 |\n| 1 | 1 | 0 |\n\n' +
          'Hai điểm dương nằm chéo nhau, nên khi đẩy một phía của đường thẳng lên, ' +
          'một điểm âm sai cũng bị đẩy lên theo.',
      },
    },
    order: 10,
    type: 'markdown',
  },
  {
    ...blockDefaults,
    id: 'stable-content-access',
    locales: {
      en: {
        body:
          'Full reading is granted by stable content access post_dl-p01-neuron-perceptron. ' +
          'The grant does not pin a revision, so a safe publish can move the current text forward.',
        title: 'Stable access, current content',
      },
      vi: {
        body:
          'Quyền đọc đầy đủ được cấp bằng stable content access post_dl-p01-neuron-perceptron. ' +
          'Grant này không pin revision, nên một lần publish an toàn vẫn có thể chuyển nội dung hiện tại về phía trước.',
        title: 'Stable access, nội dung hiện tại',
      },
    },
    order: 11,
    type: 'callout',
    variant: 'insight',
  },
  {
    ...blockDefaults,
    id: 'from-perceptron-to-next-step',
    locales: {
      en: {
        lede:
          'The useful failure tells you what to look for next: a hidden layer can bend ' +
          'the representation before the final decision.',
        navigationTitle: 'What this unlocks next',
        title: 'The failure points to the next model',
      },
      vi: {
        lede:
          'Thất bại hữu ích này cho bạn biết cần quan sát gì tiếp theo: một hidden layer ' +
          'có thể bẻ cong biểu diễn trước quyết định cuối.',
        navigationTitle: 'Điều này mở gì tiếp theo?',
        title: 'Thất bại chỉ sang mô hình kế tiếp',
      },
    },
    order: 12,
    type: 'heading',
  },
] satisfies readonly ContentBlock[];

const trialPosts = [
  {
    accessLevel: 'trial',
    blocks: trialBlocks,
    courseId: 'course-deep-learning-basic',
    description: {
      en: 'See how inputs, weights, and a bias become one explainable decision.',
      vi: 'Quan sát cách đầu vào, trọng số và độ lệch tạo thành một quyết định có thể giải thích.',
    },
    durationMinutes: 8,
    id: TRIAL_POST_ID,
    moduleId: 'dl-m01-neuron-perceptron',
    postQuizId: 'quiz-post-dl-p01',
    title: {
      en: 'How does a neuron make a decision?',
      vi: 'Một neuron đưa ra quyết định như thế nào?',
    },
  },
] satisfies readonly TrialPost[];

const fullLessonPosts: readonly TrialPost[] = [
  {
    ...trialPosts[0]!,
    accessLevel: 'full',
    blocks: fullLessonBlocks,
    description: {
      en: 'Read from a single neuron decision to the XOR limit that motivates the next model.',
      vi: 'Đọc từ một quyết định của neuron đến giới hạn XOR mở đường cho mô hình kế tiếp.',
    },
    durationMinutes: 16,
  },
];

export function getTrialPost(courseId: string | undefined, postId: string | undefined) {
  return trialPosts.find((post) => post.courseId === courseId && post.id === postId);
}

export function getReadablePost(
  courseId: string | undefined,
  postId: string | undefined,
  isFullAccess: boolean,
) {
  const posts = isFullAccess ? fullLessonPosts : trialPosts;

  return posts.find((post) => post.courseId === courseId && post.id === postId);
}
