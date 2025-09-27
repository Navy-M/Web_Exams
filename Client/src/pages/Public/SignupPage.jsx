import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/main.css';
import '../../styles/login.css';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [period, setPeriod] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup({ username, password , fullName, period});
      navigate('/dashboard'); // Redirect after signup
    } catch (err) {
      const message = err?.response?.data?.message || 'Signup failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <h1>ثبت نام</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="username">نام کاربری (ایمیل یا نام مستعار)</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="fullName">نام و نام خانوادگی</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="period">دوره</label>
          <input
            id="period"
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            required
            disabled={loading}
          />
            
        </div>
        <div className="form-group">
          <label htmlFor="password">رمز عبور</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">تأیید رمز عبور</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? <LoadingSpinner size={20} color="#fff" /> : 'ثبت حساب کاربری'}
        </button>

        <p className="signup-text">
          حساب کاربری دارید؟{' '}
          <Link to="/login" className="signup-link">
            ورود
          </Link>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;
