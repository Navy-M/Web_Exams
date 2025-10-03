import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import LoadingSpinner from '../../components/Common/LoadingSpinner.jsx';
import '../../styles/main.css';
import '../../styles/login.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, login, error: authError } = useAuth();
  const { t } = useI18n();

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
      setFormError(t('auth.login.errors.required'));
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
      const message = err?.response?.data?.message || t('auth.login.errors.generic');
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <header className="auth-header">
          <h1>{t('auth.login.title')}</h1>
          <p className="auth-subtitle">{t('auth.login.subtitle')}</p>
        </header>

        {formError && <div className="error-message">{formError}</div>}

        <div className="form-group">
          <label htmlFor="username">{t('auth.login.usernameLabel')}</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder={t('auth.login.usernamePlaceholder')}
            value={username}
            disabled={submitting}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t('auth.login.passwordLabel')}</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t('auth.common.togglePasswordHide') : t('auth.common.togglePasswordShow')}
              disabled={submitting}
            >
              {showPassword ? t('auth.common.togglePasswordHide') : t('auth.common.togglePasswordShow')}
            </button>
          </div>
        </div>

        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? <LoadingSpinner size={20} color="#fff" /> : t('auth.login.signInButton')}
        </button>

        <p className="signup-text">
          {t('auth.login.footerText')}{' '}
          <Link to="/signup" className="signup-link">
            {t('auth.login.footerLink')}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
