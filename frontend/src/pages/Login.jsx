import { useState } from 'react';
import axios from 'axios';
import { storeTokens } from '../utils/tokenManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/token/`, {
        username: formData.username,
        password: formData.password
      });

      const { access, refresh } = response.data;
      storeTokens(access, refresh, false);
      onLogin();
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#021B2C', 
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#002035',
        padding: '40px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>TGGG Accounting</h1>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#1a2332',
                border: '1px solid #47545E',
                borderRadius: '4px',
                color: 'white'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#1a2332',
                border: '1px solid #47545E',
                borderRadius: '4px',
                color: 'white'
              }}
              required
            />
          </div>

          {error && (
            <div style={{ 
              color: '#d4183d', 
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: 'rgba(212, 24, 61, 0.1)',
              borderRadius: '4px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#F27229',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;