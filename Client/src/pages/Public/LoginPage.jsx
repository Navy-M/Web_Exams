import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import '../../styles/main.css';
import '../../styles/login.css';


const LoginPage = () => {
  const navigate = useNavigate();
  const { user, login, error: authError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // clear fields when component mounts
    setUsername('');
    setPassword('');
    setFormError('');
  }, []);

  useEffect(() => {
    if (authError) {
      setFormError(authError);
    }
  }, [authError]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!username.trim() || !password.trim()) {
      setFormError('نام کاربری و گذرواژه الزامی است.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const loggedIn = await login({ username: username.trim(), password });
      if (loggedIn?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'نام کاربری یا گذرواژه نادرست است.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <header className="auth-header">
          <h1>ورود به سامانه</h1>
          <p className="auth-subtitle">برای مشاهده آزمون‌ها و نتایج، نام کاربری و گذرواژه خود را وارد کنید.</p>
        </header>

        {formError && <div className="error-message">{formError}</div>}

        <div className="form-group">
          <label htmlFor="username">نام کاربری</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="مثلاً student1403"
            value={username}
            disabled={submitting}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">گذرواژه</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="گذرواژه خود را وارد کنید"
              value={password}
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'مخفی کردن گذرواژه' : 'نمایش گذرواژه'}
              disabled={submitting}
            >
              {showPassword ? 'مخفی' : 'نمایش'}
            </button>
          </div>
        </div>

        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? <LoadingSpinner size={20} color="#fff" /> : 'ورود به حساب کاربری'}
        </button>

        <p className="signup-text">
          حساب کاربری ندارید؟
          <Link to="/signup" className="signup-link">
            ثبت‌نام کنید
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
