import { createInstance, type i18n } from 'i18next';

const resources = {
  en: {
    translation: {
      'locale.switch': 'Chuyển sang tiếng Việt',
      'theme.enableDark': 'Enable dark theme',
      'theme.enableLight': 'Enable light theme',
      'nav.primaryLabel': 'Primary navigation',
      'nav.home': 'Home',
      'nav.courses': 'Courses',
      'nav.method': 'Method',
      'nav.start': 'Start learning',
      'landing.eyebrow': 'SEE IT. CHANGE IT. UNDERSTAND IT.',
      'landing.title':
        '<line>Machine Learning</line> <line>is no longer a <accent>black box.</accent></line>',
      'landing.lede':
        'Follow a deliberate path, watch each model make decisions, then change the variables yourself — no setup and no code required.',
      'landing.primaryCta': 'Start the first journey',
      'landing.secondaryCta': 'See how learning works',
      'landing.stats.courses': 'foundation courses',
      'landing.stats.modules': 'focused modules',
      'landing.stats.browser': 'in your browser',
      'landing.lab.ariaLabel': 'Interactive Perceptron preview on the XOR dataset',
      'landing.lab.status': 'RUN COMPLETE',
      'landing.lab.parameters': 'PARAMETERS',
      'landing.lab.learningRate': 'Learning rate',
      'landing.lab.epochs': 'Epochs',
      'landing.lab.run': 'Run model',
      'landing.lab.chartAlt':
        'XOR points in four quadrants with one straight decision boundary that cannot separate them',
      'landing.lab.insightTitle': 'A useful failure',
      'landing.lab.insightBody': 'One line cannot separate XOR.',
      'landing.lab.accuracy': 'ACCURACY',
      'landing.lab.loss': 'LOSS',
      'landing.lab.verdict': '● LINEAR LIMIT FOUND',
      'landing.lab.orbitNote': 'failure becomes an explanation',
      'landing.method.eyebrow': 'ONE PATH, THREE MOVES',
      'landing.method.title': 'From concept to intuition',
      'landing.method.intro':
        'Every lesson ends in an observable action. You always know what to notice and what to try next.',
      'landing.method.items.0.title': 'Follow the path',
      'landing.method.items.0.body':
        'Short modules reveal prerequisites and keep your current position visible.',
      'landing.method.items.1.title': 'Watch the model',
      'landing.method.items.1.body':
        'Charts expose boundaries, errors, and the moments a model improves or fails.',
      'landing.method.items.2.title': 'Change one thing',
      'landing.method.items.2.body':
        'Adjust data and parameters, then compare outcomes instead of memorising formulas.',
      'landing.courses.eyebrow': 'FOUNDATION PATHS',
      'landing.courses.title': 'Begin with what matters',
      'landing.courses.all': 'View full catalog',
      'landing.closing.quote': 'Understanding starts when the result stops feeling magical.',
      'landing.closing.body':
        'Your first journey uses a Perceptron and XOR to make a model’s limitation visible.',
      'landing.closing.cta': 'Open the first roadmap',
      'catalog.eyebrow': 'COURSE CATALOG',
      'catalog.title': 'Two paths, one learning language',
      'catalog.intro':
        'Start with classical foundations or inspect a neural network from its smallest useful unit.',
      'catalog.principleTitle': 'Sequential by design',
      'catalog.principleBody':
        'Metadata stays public; learning content opens only when verified prerequisites are complete.',
      'course.moduleCount': '{{count}} modules',
      'course.postCount': '{{count}} lessons',
      'course.hourCount': '{{count}} hours',
      'course.minuteCount': '{{count}} min',
      'course.explore': 'Explore',
      'course.exploreLabel': 'Explore the {{title}} course',
      'course.back': 'All courses',
      'course.viewRoadmap': 'View course roadmap',
      'course.roadmapEyebrow': 'COURSE ROADMAP',
      'course.roadmapTitle': 'Learn in the right order',
      'course.roadmapIntro':
        'Each module closes with a mastery check. Completing it unlocks the next concept and its algorithm.',
      'course.trialState': 'Start here',
      'course.sequenceState': 'Sequential',
      'course.roadmapPendingTitle': 'Roadmap in preparation',
      'course.roadmapPendingBody':
        'This public course is visible, but its detailed learning sequence is not released yet.',
      'course.notFound.title': 'Course not found',
      'course.notFound.back': 'Back to course catalog',
      'course.notFound.body': 'This course ID is not part of the current public catalog.',
      'route.notFound.title': 'This path does not exist',
      'route.notFound.body': 'The address may be old or incomplete.',
      'route.notFound.back': 'Return home',
    },
  },
  vi: {
    translation: {
      'locale.switch': 'Chuyển sang tiếng Anh',
      'theme.enableDark': 'Bật giao diện tối',
      'theme.enableLight': 'Bật giao diện sáng',
      'nav.primaryLabel': 'Điều hướng chính',
      'nav.home': 'Trang chủ',
      'nav.courses': 'Khóa học',
      'nav.method': 'Phương pháp',
      'nav.start': 'Bắt đầu học',
      'landing.eyebrow': 'QUAN SÁT. THAY ĐỔI. THẤU HIỂU.',
      'landing.title':
        '<line>Machine Learning</line> <line>không còn là một <accent>hộp đen.</accent></line>',
      'landing.lede':
        'Đi theo lộ trình rõ ràng, quan sát mô hình ra quyết định rồi tự thay đổi từng biến số — không cần cài đặt, không cần viết code.',
      'landing.primaryCta': 'Bắt đầu lộ trình đầu tiên',
      'landing.secondaryCta': 'Xem cách học hoạt động',
      'landing.stats.courses': 'khóa học nền tảng',
      'landing.stats.modules': 'module cô đọng',
      'landing.stats.browser': 'ngay trên trình duyệt',
      'landing.lab.ariaLabel': 'Bản xem trước Perceptron trên dữ liệu XOR',
      'landing.lab.status': 'ĐÃ CHẠY XONG',
      'landing.lab.parameters': 'THAM SỐ',
      'landing.lab.learningRate': 'Tốc độ học',
      'landing.lab.epochs': 'Vòng lặp',
      'landing.lab.run': 'Chạy mô hình',
      'landing.lab.chartAlt':
        'Các điểm XOR ở bốn góc cùng một ranh giới thẳng không thể phân tách chúng',
      'landing.lab.insightTitle': 'Một thất bại hữu ích',
      'landing.lab.insightBody': 'Một đường thẳng không thể tách XOR.',
      'landing.lab.accuracy': 'ĐỘ CHÍNH XÁC',
      'landing.lab.loss': 'SAI SỐ',
      'landing.lab.verdict': '● ĐÃ THẤY GIỚI HẠN TUYẾN TÍNH',
      'landing.lab.orbitNote': 'thất bại trở thành lời giải thích',
      'landing.method.eyebrow': 'MỘT LỘ TRÌNH, BA BƯỚC',
      'landing.method.title': 'Từ khái niệm đến trực giác',
      'landing.method.intro':
        'Mỗi bài học kết thúc bằng một hành động quan sát được. Bạn luôn biết cần nhìn gì và thử gì tiếp theo.',
      'landing.method.items.0.title': 'Học theo lộ trình',
      'landing.method.items.0.body':
        'Module ngắn chỉ rõ điều kiện học trước và luôn cho biết bạn đang ở đâu.',
      'landing.method.items.1.title': 'Quan sát mô hình',
      'landing.method.items.1.body':
        'Biểu đồ phơi bày ranh giới, sai số và khoảnh khắc mô hình tiến bộ hoặc thất bại.',
      'landing.method.items.2.title': 'Thay đổi một thứ',
      'landing.method.items.2.body':
        'Điều chỉnh dữ liệu, tham số rồi so sánh kết quả thay vì học thuộc công thức.',
      'landing.courses.eyebrow': 'LỘ TRÌNH NỀN TẢNG',
      'landing.courses.title': 'Bắt đầu từ điều cốt lõi',
      'landing.courses.all': 'Xem toàn bộ khóa học',
      'landing.closing.quote': 'Thấu hiểu bắt đầu khi kết quả không còn giống phép màu.',
      'landing.closing.body':
        'Lộ trình đầu tiên dùng Perceptron và XOR để biến giới hạn của mô hình thành thứ có thể nhìn thấy.',
      'landing.closing.cta': 'Mở lộ trình đầu tiên',
      'catalog.eyebrow': 'DANH MỤC KHÓA HỌC',
      'catalog.title': 'Hai lộ trình, một ngôn ngữ học tập',
      'catalog.intro':
        'Bắt đầu bằng nền tảng cổ điển hoặc quan sát mạng nơ-ron từ đơn vị nhỏ nhất có ích.',
      'catalog.principleTitle': 'Tuần tự có chủ đích',
      'catalog.principleBody':
        'Metadata luôn công khai; nội dung học chỉ mở khi prerequisite đã được xác minh.',
      'course.moduleCount': '{{count}} module',
      'course.postCount': '{{count}} bài học',
      'course.hourCount': '{{count}} giờ',
      'course.minuteCount': '{{count}} phút',
      'course.explore': 'Khám phá',
      'course.exploreLabel': 'Khám phá khóa {{title}}',
      'course.back': 'Tất cả khóa học',
      'course.viewRoadmap': 'Xem lộ trình khóa học',
      'course.roadmapEyebrow': 'LỘ TRÌNH KHÓA HỌC',
      'course.roadmapTitle': 'Học đúng thứ tự',
      'course.roadmapIntro':
        'Mỗi module kết thúc bằng mastery check. Hoàn thành sẽ mở khái niệm và thuật toán tiếp theo.',
      'course.trialState': 'Bắt đầu ở đây',
      'course.sequenceState': 'Theo lộ trình',
      'course.roadmapPendingTitle': 'Lộ trình đang được chuẩn bị',
      'course.roadmapPendingBody':
        'Khóa học đã hiện trong catalog nhưng trình tự chi tiết chưa được phát hành.',
      'course.notFound.title': 'Không tìm thấy khóa học',
      'course.notFound.back': 'Về danh sách khóa học',
      'course.notFound.body': 'Mã khóa học này không thuộc danh mục đang được công khai.',
      'route.notFound.title': 'Đường dẫn này không tồn tại',
      'route.notFound.body': 'Địa chỉ có thể đã cũ hoặc chưa đầy đủ.',
      'route.notFound.back': 'Về trang chủ',
    },
  },
} as const;

function getInitialLocale(): 'en' | 'vi' {
  return localStorage.getItem('ml-path-locale') === 'en' ? 'en' : 'vi';
}

export function createAppI18n(): i18n {
  const instance = createInstance();

  void instance.init({
    fallbackLng: 'vi',
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
    lng: getInitialLocale(),
    resources,
  });

  return instance;
}
