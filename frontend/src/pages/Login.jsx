import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import LogoIcon from '../components/LogoIcon';
import { APP_NAME, APP_VERSION } from '../constants/app';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { access_token: accessToken, user } = response.data;

      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/projects', { replace: true });
    } catch (err) {
      const message = err.response?.data?.detail
        || err.response?.data?.message
        || err.message
        || '登录失败，请检查用户名和密码';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <LogoIcon size={24} />
          </div>
          <h1 className="login-title">{APP_NAME}</h1>
          <p className="login-subtitle">独立项目管理平台</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="username">
              用户名
            </label>
            <input
              id="username"
              type="text"
              className="input"
              placeholder="请输入用户名"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="form-label" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="请输入密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="login-footer">{APP_NAME} v{APP_VERSION} © 2026</div>
      </div>
    </div>
  );
};

export default Login;
