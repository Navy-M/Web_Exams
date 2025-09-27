import { useState, useEffect } from 'react'; 
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/main.css';
import '../../styles/login.css';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { checkServer } from '../../services/api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }

    // Clear form and error on mount
    setError('');
    setUsername('');
    setPassword('');
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loggedInUser = await login({ username, password });

      if (loggedInUser?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Invalid credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <h1>ورود به سامانه</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="mobile">حساب کاربری</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
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
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? <LoadingSpinner size={20} color="#fff" /> : 'ورود به سامانه'}
        </button>

        {/* Sign Up link */}
        <p className="signup-text">
          حساب کاربری ندارید؟{' '}
          <Link to="/signup" className="signup-link">
            ثبت نام
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
