import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { Locale } from '../catalog/course-data';
import { type SafeAuthErrorCode } from './auth-service';
import { useAuth } from './auth-context';

export type AuthMode = 'sign-in' | 'sign-up';

interface AuthPageProps {
  locale: Locale;
  mode: AuthMode;
}

interface AuthCopy {
  alternateAction: string;
  alternateLead: string;
  alternatePath: string;
  email: string;
  errors: Readonly<Record<SafeAuthErrorCode, string>>;
  google: string;
  lead: string;
  password: string;
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
        'invalid-credentials': 'Email or password is not correct.',
        network: 'We could not reach the authentication service. Try again.',
        'popup-blocked':
          'Your browser blocked the sign-in window. Continue with the redirect flow.',
        'rate-limited': 'Too many attempts. Please wait a moment and try again.',
        unavailable: 'Authentication is not available right now. Try again later.',
      },
      google: 'Continue with Google',
      lead: 'Keep your learning path, progress, and next experiment in one place.',
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
  },
  vi: {
    'sign-in': {
      alternateAction: 'Tạo tài khoản',
      alternateLead: 'Chưa có tài khoản ML Path?',
      alternatePath: '/register',
      email: 'Email',
      errors: {
        'account-exists': 'Email này đã có tài khoản. Hãy thử đăng nhập.',
        'invalid-credentials': 'Email hoặc mật khẩu chưa đúng.',
        network: 'Không thể kết nối dịch vụ xác thực. Hãy thử lại.',
        'popup-blocked':
          'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy tiếp tục bằng luồng chuyển trang.',
        'rate-limited': 'Bạn đã thử quá nhiều lần. Hãy chờ một chút rồi thử lại.',
        unavailable: 'Xác thực tạm thời chưa sẵn sàng. Hãy thử lại sau.',
      },
      google: 'Tiếp tục với Google',
      lead: 'Giữ lộ trình, tiến độ và thử nghiệm tiếp theo của bạn ở cùng một nơi.',
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
  },
};

export function AuthPage({ locale, mode }: AuthPageProps) {
  const navigate = useNavigate();
  const { error, isSubmitting, signInWithEmail, signInWithGoogle, signUpWithEmail, status } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const text = copy[locale][mode];

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [navigate, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

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

          {submitted && error ? (
            <p className="auth-error" role="alert">
              <LockKeyhole aria-hidden="true" size={16} />
              {text.errors[error.code]}
            </p>
          ) : null}

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            <span>{isSubmitting ? text.status : text.submit}</span>
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        </form>

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

        <p className="auth-alternate">
          {text.alternateLead} <Link to={text.alternatePath}>{text.alternateAction}</Link>
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
