import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/main.css';
import '../../styles/login.css';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {checkServer} from '../../services/api'

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, login  } = useAuth();
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
    setEmail('');
    setPassword('');
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loggedInUser = await login({ email, password }); // Get user immediately

      // Redirect based on their role
      if (loggedInUser?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      // Defensive: check error response shape
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
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
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
          {loading ? <LoadingSpinner size={20} color="#fff" /> : 'Sign In'}
        </button>
        {/* <button type="button" onClick={checkServer}>check</button> */}
      </form>
    </div>
  );
};

export default LoginPage;
