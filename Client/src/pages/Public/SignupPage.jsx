import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import LoadingSpinner from '../../components/Common/LoadingSpinner.jsx';
import '../../styles/main.css';
import '../../styles/login.css';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, user } = useAuth();
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    period: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.period.trim()) {
      return t('auth.signup.errors.required');
    }
    if (formData.password.length < 6) {
      return t('auth.signup.errors.passwordLength');
    }
    if (formData.password !== formData.confirmPassword) {
      return t('auth.signup.errors.mismatch');
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        period: formData.period.trim(),
        password: formData.password,
      };

      const createdUser = await signup(payload);
      if (createdUser?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const message = err?.response?.data?.message || t('auth.signup.errors.generic');
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <header className="auth-header">
          <h1>{t('auth.signup.title')}</h1>
          <p className="auth-subtitle">{t('auth.signup.subtitle')}</p>
        </header>

        {formError && <div className="error-message">{formError}</div>}

        <div className="form-group">
          <label htmlFor="username" class="required">{t('auth.signup.usernameLabel')}</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder={t('auth.signup.usernamePlaceholder')}
            value={formData.username}
            disabled={submitting}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fullName">{t('auth.signup.fullNameLabel')}</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder={t('auth.signup.fullNamePlaceholder')}
            value={formData.fullName}
            disabled={submitting}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="period">{t('auth.signup.periodLabel')}</label>
          <input
            id="period"
            name="period"
            type="text"
            placeholder={t('auth.signup.periodPlaceholder')}
            value={formData.period}
            disabled={submitting}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" class="required">{t('auth.signup.passwordLabel')}</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.signup.passwordPlaceholder')}
              value={formData.password}
              disabled={submitting}
              onChange={handleChange}
              autoComplete="new-password"
              required
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

        <div className="form-group">
          <label htmlFor="confirmPassword" class="required">{t('auth.signup.confirmPasswordLabel')}</label>
          <div className="password-field">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder={t('auth.signup.confirmPasswordPlaceholder')}
              value={formData.confirmPassword}
              disabled={submitting}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={showConfirm ? t('auth.signup.toggleConfirmHide') : t('auth.signup.toggleConfirmShow')}
              disabled={submitting}
            >
              {showConfirm ? t('auth.signup.toggleConfirmHide') : t('auth.signup.toggleConfirmShow')}
            </button>
          </div>
        </div>

        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? <LoadingSpinner size={20} color="#fff" /> : t('auth.signup.submit')}
        </button>

        <p className="signup-text">
          {t('auth.signup.footerText')}{' '}
          <Link to="/login" className="signup-link">
            {t('auth.signup.footerLink')}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;
