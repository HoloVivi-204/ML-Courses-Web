import { ArrowRight, LockKeyhole, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import type { Locale } from '../catalog/course-data';
import type {
  LearnerProfile,
  LearnerThemePreference,
  LearningApiClient,
} from '../learning/learning-api';
import { getSafeAuthReturnPath } from './auth-return-path';
import { type SafeAuthErrorCode } from './auth-service';
import { useAuth } from './auth-context';

export type AuthMode = 'forgot-password' | 'sign-in' | 'sign-up';

interface AuthPageProps {
  learningApiClient: LearningApiClient;
  locale: Locale;
  mode: AuthMode;
  onProfilePreferencesLoaded: (profile: LearnerProfile) => void;
  themePreference: LearnerThemePreference;
}

interface AuthCopy {
  alternateAction: string;
  alternateLead: string;
  alternatePath: string;
  email: string;
  errors: Readonly<Record<SafeAuthErrorCode, string>>;
  forgotPasswordAction?: string;
  google?: string;
  lead: string;
  password?: string;
  resetSuccess?: string;
  signal: string;
  status: string;
  submit: string;
  title: string;
}

const copy: Readonly<Record<Locale, Readonly<Record<AuthMode, AuthCopy>>>> = {
  en: {
    'sign-in': {
      alternateAction: 'Create an account',
      alternateLead: 'New to ML Path?',
      alternatePath: '/register',
      email: 'Email',
      errors: {
        'account-exists': 'This email is already registered. Try signing in instead.',
        'invalid-email': 'Enter a valid email address.',
        'invalid-credentials': 'Email or password is not correct.',
        network: 'We could not reach the authentication service. Try again.',
        'popup-blocked':
          'Your browser blocked the sign-in window. Continue with the redirect flow.',
        'rate-limited': 'Too many attempts. Please wait a moment and try again.',
        unavailable: 'Authentication is not available right now. Try again later.',
      },
      google: 'Continue with Google',
      lead: 'Keep your learning path, progress, and next experiment in one place.',
      forgotPasswordAction: 'Forgot password?',
      password: 'Password',
      signal: 'AUTHENTICATION / STUDENT ACCESS',
      status: 'Signing you in…',
      submit: 'Sign in',
      title: 'Pick up where curiosity left off.',
    },
    'sign-up': {
      alternateAction: 'Sign in',
      alternateLead: 'Already have an account?',
      alternatePath: '/login',
      email: 'Email',
      errors: {
        'account-exists': 'This email is already registered. Try signing in instead.',
        'invalid-email': 'Enter a valid email address.',
        'invalid-credentials': 'Check the email and password, then try again.',
        network: 'We could not reach the authentication service. Try again.',
        'popup-blocked':
          'Your browser blocked the sign-in window. Continue with the redirect flow.',
        'rate-limited': 'Too many attempts. Please wait a moment and try again.',
        unavailable: 'Authentication is not available right now. Try again later.',
      },
      google: 'Continue with Google',
      lead: 'Your account starts as a Student. No email verification is required to begin Release 1 learning.',
      password: 'Password',
      signal: 'AUTHENTICATION / STUDENT ACCESS',
      status: 'Creating your account…',
      submit: 'Create account',
      title: 'Turn the first question into a path.',
    },
    'forgot-password': {
      alternateAction: 'Sign in',
      alternateLead: 'Remembered your password?',
      alternatePath: '/login',
      email: 'Email',
      errors: {
        'account-exists': 'This email is already registered. Try signing in instead.',
        'invalid-email': 'Enter a valid email address.',
        'invalid-credentials': 'We could not send a reset link. Try again.',
        network: 'We could not reach the authentication service. Try again.',
        'popup-blocked':
          'Your browser blocked the sign-in window. Continue with the redirect flow.',
        'rate-limited': 'Too many attempts. Please wait a moment and try again.',
        unavailable: 'Authentication is not available right now. Try again later.',
      },
      lead: 'Request a reset link for your learning account.',
      resetSuccess: 'If this email belongs to an ML Path account, a reset link will be sent.',
      signal: 'ACCOUNT RECOVERY',
      status: 'Sending reset link…',
      submit: 'Send reset link',
      title: 'Reset access to ML Path.',
    },
  },
  vi: {
    'sign-in': {
      alternateAction: 'Tạo tài khoản',
      alternateLead: 'Chưa có tài khoản ML Path?',
      alternatePath: '/register',
      email: 'Email',
      errors: {
        'account-exists': 'Email này đã có tài khoản. Hãy thử đăng nhập.',
        'invalid-email': 'Hãy nhập email hợp lệ.',
        'invalid-credentials': 'Email hoặc mật khẩu chưa đúng.',
        network: 'Không thể kết nối dịch vụ xác thực. Hãy thử lại.',
        'popup-blocked':
          'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy tiếp tục bằng luồng chuyển trang.',
        'rate-limited': 'Bạn đã thử quá nhiều lần. Hãy chờ một chút rồi thử lại.',
        unavailable: 'Xác thực tạm thời chưa sẵn sàng. Hãy thử lại sau.',
      },
      google: 'Tiếp tục với Google',
      lead: 'Giữ lộ trình, tiến độ và thử nghiệm tiếp theo của bạn ở cùng một nơi.',
      forgotPasswordAction: 'Quên mật khẩu?',
      password: 'Mật khẩu',
      signal: 'XÁC THỰC / TRUY CẬP HỌC VIÊN',
      status: 'Đang đăng nhập…',
      submit: 'Đăng nhập',
      title: 'Tiếp tục từ nơi sự tò mò dừng lại.',
    },
    'sign-up': {
      alternateAction: 'Đăng nhập',
      alternateLead: 'Đã có tài khoản?',
      alternatePath: '/login',
      email: 'Email',
      errors: {
        'account-exists': 'Email này đã có tài khoản. Hãy thử đăng nhập.',
        'invalid-email': 'Hãy nhập email hợp lệ.',
        'invalid-credentials': 'Hãy kiểm tra lại email và mật khẩu.',
        network: 'Không thể kết nối dịch vụ xác thực. Hãy thử lại.',
        'popup-blocked':
          'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy tiếp tục bằng luồng chuyển trang.',
        'rate-limited': 'Bạn đã thử quá nhiều lần. Hãy chờ một chút rồi thử lại.',
        unavailable: 'Xác thực tạm thời chưa sẵn sàng. Hãy thử lại sau.',
      },
      google: 'Tiếp tục với Google',
      lead: 'Tài khoản mới bắt đầu với vai trò Học viên. Release 1 không yêu cầu xác minh email trước khi học.',
      password: 'Mật khẩu',
      signal: 'XÁC THỰC / TRUY CẬP HỌC VIÊN',
      status: 'Đang tạo tài khoản…',
      submit: 'Tạo tài khoản',
      title: 'Biến câu hỏi đầu tiên thành một lộ trình.',
    },
    'forgot-password': {
      alternateAction: 'Đăng nhập',
      alternateLead: 'Đã nhớ mật khẩu?',
      alternatePath: '/login',
      email: 'Email',
      errors: {
        'account-exists': 'Email này đã có tài khoản. Hãy thử đăng nhập.',
        'invalid-email': 'Hãy nhập email hợp lệ.',
        'invalid-credentials': 'Chưa thể gửi liên kết đặt lại. Hãy thử lại.',
        network: 'Không thể kết nối dịch vụ xác thực. Hãy thử lại.',
        'popup-blocked':
          'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy tiếp tục bằng luồng chuyển trang.',
        'rate-limited': 'Bạn đã thử quá nhiều lần. Hãy chờ một chút rồi thử lại.',
        unavailable: 'Xác thực tạm thời chưa sẵn sàng. Hãy thử lại sau.',
      },
      lead: 'Yêu cầu liên kết đặt lại cho tài khoản học tập của bạn.',
      resetSuccess: 'Nếu email thuộc tài khoản ML Path, liên kết đặt lại mật khẩu sẽ được gửi.',
      signal: 'KHÔI PHỤC TÀI KHOẢN',
      status: 'Đang gửi liên kết…',
      submit: 'Gửi liên kết đặt lại',
      title: 'Đặt lại quyền truy cập ML Path.',
    },
  },
};

export function AuthPage({
  learningApiClient,
  locale,
  mode,
  onProfilePreferencesLoaded,
  themePreference,
}: AuthPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    error,
    getIdToken,
    isSubmitting,
    requestPasswordReset,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    status,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileBootstrapFailed, setProfileBootstrapFailed] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const bootstrapAttemptedRef = useRef(false);
  const bootstrapPreferencesRef = useRef({ locale, theme: themePreference });
  const text = copy[locale][mode];
  const returnPath = useMemo(() => getSafeAuthReturnPath(location.search), [location.search]);
  const alternatePath =
    mode === 'forgot-password' && location.search ? `/login${location.search}` : text.alternatePath;

  useEffect(() => {
    bootstrapPreferencesRef.current = { locale, theme: themePreference };
  }, [locale, themePreference]);

  useEffect(() => {
    if (mode === 'forgot-password') {
      return undefined;
    }

    if (status !== 'authenticated') {
      bootstrapAttemptedRef.current = false;
      return undefined;
    }

    if (bootstrapAttemptedRef.current) {
      return undefined;
    }

    let isActive = true;
    bootstrapAttemptedRef.current = true;

    async function bootstrapProfileAndReturn() {
      setProfileBootstrapFailed(false);

      try {
        const idToken = await getIdToken();

        if (!idToken) {
          throw new Error('Authenticated user is missing an ID token.');
        }

        const profile = await learningApiClient.bootstrapProfile({
          idToken,
          locale: bootstrapPreferencesRef.current.locale,
          theme: bootstrapPreferencesRef.current.theme,
        });

        if (isActive) {
          onProfilePreferencesLoaded(profile);
        }

        if (isActive) {
          navigate(returnPath, { replace: true });
        }
      } catch {
        if (isActive) {
          setProfileBootstrapFailed(true);
        }
      }
    }

    void bootstrapProfileAndReturn();

    return () => {
      isActive = false;
    };
  }, [
    getIdToken,
    learningApiClient,
    mode,
    navigate,
    onProfilePreferencesLoaded,
    returnPath,
    status,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setResetRequested(false);

    if (mode === 'forgot-password') {
      const completed = await requestPasswordReset(email.trim(), returnPath);

      if (completed) {
        setResetRequested(true);
      }

      return;
    }

    const completed =
      mode === 'sign-up'
        ? await signUpWithEmail(email.trim(), password)
        : await signInWithEmail(email.trim(), password);

    if (completed) {
      setPassword('');
    }
  }

  async function handleGoogleSignIn() {
    setSubmitted(true);
    await signInWithGoogle();
  }

  return (
    <main className="auth-page page-shell">
      <section className="auth-signal" aria-hidden="true">
        <span className="auth-signal-index">01</span>
        <div className="auth-signal-copy">
          <span>{text.signal}</span>
          <strong>ML PATH</strong>
        </div>
        <div className="auth-signal-orbit">
          <i />
          <i />
          <i />
        </div>
        <p>
          {locale === 'vi'
            ? 'Mỗi lộ trình bắt đầu bằng một tín hiệu rõ ràng.'
            : 'Every path starts with one clear signal.'}
        </p>
      </section>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-kicker">
          <Sparkles aria-hidden="true" size={16} />
          <span>{text.signal}</span>
        </div>
        <h1 id="auth-title">{text.title}</h1>
        <p className="auth-lead">{text.lead}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">{text.email}</label>
          <input
            autoComplete="email"
            disabled={isSubmitting}
            id="auth-email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          {mode !== 'forgot-password' ? (
            <>
              <label htmlFor="auth-password">{text.password}</label>
              <input
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                disabled={isSubmitting}
                id="auth-password"
                minLength={6}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />

              {mode === 'sign-in' && text.forgotPasswordAction ? (
                <Link className="auth-secondary-link" to={`/forgot-password${location.search}`}>
                  {text.forgotPasswordAction}
                </Link>
              ) : null}
            </>
          ) : null}

          {submitted && error ? (
            <p className="auth-error" role="alert">
              <LockKeyhole aria-hidden="true" size={16} />
              {text.errors[error.code]}
            </p>
          ) : null}

          {resetRequested && text.resetSuccess ? (
            <p className="auth-success" role="status">
              <MailCheck aria-hidden="true" size={16} />
              {text.resetSuccess}
            </p>
          ) : null}

          {profileBootstrapFailed ? (
            <p className="auth-error" role="alert">
              <LockKeyhole aria-hidden="true" size={16} />
              {locale === 'vi'
                ? 'Chưa thể tạo hồ sơ học viên. Hãy thử lại sau.'
                : 'We could not prepare your learner profile. Try again later.'}
            </p>
          ) : null}

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            <span>{isSubmitting ? text.status : text.submit}</span>
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </form>

        {mode !== 'forgot-password' && text.google ? (
          <>
            <div className="auth-divider">
              <span>{locale === 'vi' ? 'hoặc' : 'or'}</span>
            </div>

            <button
              className="auth-google"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              type="button"
            >
              <span aria-hidden="true" className="auth-google-mark">
                G
              </span>
              {text.google}
            </button>
          </>
        ) : null}

        <p className="auth-alternate">
          {text.alternateLead} <Link to={alternatePath}>{text.alternateAction}</Link>
        </p>

        <p className="auth-security-note">
          <ShieldCheck aria-hidden="true" size={15} />
          {locale === 'vi'
            ? 'Mật khẩu và token không được hiển thị hoặc lưu trong giao diện.'
            : 'Passwords and tokens are never displayed or stored in the interface.'}
        </p>
      </section>
    </main>
  );
}
