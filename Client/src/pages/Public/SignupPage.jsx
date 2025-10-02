import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import '../../styles/main.css';
import '../../styles/login.css';

function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor}>
      {children}
      {required && <span style={{ color: "red" }}> *</span>}
    </label>
  );
}



const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, user } = useAuth();

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
      return 'لطفاً تمام فیلدهای ضروری را تکمیل کنید.';
    }
    if (formData.password.length < 6) {
      return 'گذرواژه باید حداقل ۶ کاراکتر باشد.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'گذرواژه و تکرار آن یکسان نیست.';
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
      const message = err?.response?.data?.message || 'ثبت‌نام با خطا مواجه شد.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <header className="auth-header">
          <h1>ایجاد حساب جدید</h1>
          <p className="auth-subtitle">برای دسترسی به آزمون‌ها، اطلاعات خود را وارد و حساب کاربری بسازید.</p>
        </header>

        {formError && <div className="error-message">{formError}</div>}

        <div className="form-group">
          <Label htmlFor="username" required>نام کاربری</Label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="مثلاً student1403"
            value={formData.username}
            disabled={submitting}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fullName">نام و نام خانوادگی</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="نام کامل"
            value={formData.fullName}
            disabled={submitting}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="period">دوره </label>
          <input
            id="period"
            name="period"
            type="text"
            placeholder="مثلاً دوره تابستان 1403"
            value={formData.period}
            disabled={submitting}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <Label htmlFor="password" required>گذرواژه</Label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="حداقل ۶ کاراکتر"
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
              aria-label={showPassword ? 'مخفی کردن گذرواژه' : 'نمایش گذرواژه'}
              disabled={submitting}
            >
              {showPassword ? 'مخفی' : 'نمایش'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <Label htmlFor="confirmPassword" required>تکرار گذرواژه</Label>
          <div className="password-field" required>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="گذرواژه را دوباره وارد کنید"
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
              aria-label={showConfirm ? 'مخفی کردن تکرار گذرواژه' : 'نمایش تکرار گذرواژه'}
              disabled={submitting}
            >
              {showConfirm ? 'مخفی' : 'نمایش'}
            </button>
          </div>
        </div>

        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? <LoadingSpinner size={20} color="#fff" /> : 'ایجاد حساب کاربری'}
        </button>

        <p className="signup-text">
          قبلاً ثبت‌نام کرده‌اید؟
          <Link to="/login" className="signup-link">
            ورود به حساب
          </Link>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;
