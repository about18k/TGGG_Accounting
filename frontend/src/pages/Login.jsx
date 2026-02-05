import { useState } from 'react';
import axios from 'axios';
import { storeTokens } from '../utils/tokenManager';
import logoImg from '../assets/651002f6876413a3b201123bf1660ae20713e019.png'; // Use your preferred logo image

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
    <div className="login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        :root {
          --ink: #081821;
          --steel: #0f2a3a;
          --blueprint: #0c3044;
          --oxide: #f07b2c;
          --concrete: #cfd6dc;
          --fog: #dfe7ee;
          --edge: rgba(255, 255, 255, 0.12);
          --glow: rgba(240, 123, 44, 0.35);
        }
        .login-root {
          min-height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at 20% 20%, #0c2b3a 0%, #06151c 45%, #030c12 100%);
          color: #f6f8fb;
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 0;
          position: relative;
          overflow: hidden;
          font-family: "Space Grotesk", "Segoe UI", sans-serif;
        }
        .login-grid {
          position: absolute;
          inset: -40% -10% -10% -10%;
          background-image:
            linear-gradient(transparent 93%, rgba(255, 255, 255, 0.06) 93%),
            linear-gradient(90deg, transparent 93%, rgba(255, 255, 255, 0.06) 93%);
          background-size: 48px 48px;
          transform: skewY(-6deg);
          opacity: 0.5;
          pointer-events: none;
        }
        .login-bolt {
          position: absolute;
          width: 38vw;
          height: 38vw;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(240, 123, 44, 0.35) 0%, rgba(240, 123, 44, 0.05) 48%, transparent 70%);
          right: -12vw;
          top: -6vw;
          filter: blur(2px);
          pointer-events: none;
        }
        .hero-title {
          font-family: "Oswald", "Space Grotesk", sans-serif;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .hero-tag {
          font-family: "Oswald", "Space Grotesk", sans-serif;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .login-card {
          background: linear-gradient(140deg, rgba(11, 38, 52, 0.92), rgba(6, 20, 30, 0.96));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 2px solid rgba(240, 123, 44, 0.8);
          box-shadow: 0 30px 60px rgba(2, 12, 18, 0.45);
          backdrop-filter: blur(12px);
        }
        .login-input {
          width: 100%;
          padding: 12px 14px;
          background: rgba(7, 20, 28, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 10px;
          color: #f6f8fb;
          font-size: 1.02rem;
          transition: border 0.2s, box-shadow 0.2s, transform 0.2s;
          outline: none;
        }
        .login-input:focus {
          border-color: rgba(240, 123, 44, 0.8);
          box-shadow: 0 0 0 3px rgba(240, 123, 44, 0.2);
          transform: translateY(-1px);
        }
        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(120deg, #f07b2c 0%, #ff9b3b 100%);
          color: #07131a;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          box-shadow: 0 12px 22px rgba(240, 123, 44, 0.25);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 28px rgba(240, 123, 44, 0.35);
        }
        .login-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
          transform: none;
          box-shadow: 0 6px 12px rgba(240, 123, 44, 0.2);
        }
        .badge {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(7, 22, 32, 0.6);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 140px;
        }
        .badge span {
          font-size: 0.72rem;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #9fb3c2;
        }
        .badge strong {
          font-size: 1.2rem;
          font-weight: 600;
        }
        @media (max-width: 960px) {
          .login-root {
            flex-direction: column;
          }
        }
      `}</style>
      <div className="login-grid" />
      <div className="login-bolt" />
      {/* Left Side: Visual/Branding */}
      <div
        style={{
          flex: 1.25,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          background: `linear-gradient(120deg, rgba(3, 18, 26, 0.95) 55%, rgba(240,123,44,0.12) 100%)`,
          overflow: 'hidden',
          padding: '64px 32px',
        }}
      >
        {/* Background image with overlay */}
        <img
          src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80"
          alt="Construction and architecture"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.25,
            zIndex: 0,
            filter: 'grayscale(0.15) contrast(1.1)',
          }}
        />
        {/* Overlay for color consistency */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(120deg, rgba(3, 18, 26, 0.95) 55%, rgba(240,123,44,0.12) 100%)',
            zIndex: 1,
          }}
        />
        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 560,
            padding: '0 32px',
            textAlign: 'center',
          }}
        >
          <img
            src={logoImg}
            alt="TGGG Logo"
            style={{ width: 84, height: 84, marginBottom: 24, borderRadius: 18, boxShadow: '0 10px 28px rgba(0,0,0,0.35)' }}
          />
          <div style={{ fontSize: '0.9rem', color: '#9fb3c2', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Architects • Engineers • Site Teams
          </div>
          <h1 className="hero-title" style={{ fontSize: '3.1rem', fontWeight: 600, marginBottom: 8, color: '#fff', textShadow: '0 6px 18px rgba(2, 16, 24, 0.9)' }}>
            Triple G
          </h1>
          <div className="hero-tag" style={{ fontSize: '1.15rem', color: '#F07B2C', fontWeight: 500, marginBottom: 12 }}>
            Design Studio + Construction
          </div>
          <div style={{ fontSize: '1.05rem', color: '#e6edf3', opacity: 0.85, marginBottom: 28, fontWeight: 400, maxWidth: 520 }}>
            We’re in business to help develop the built environment and change the world.
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 600,
              marginBottom: 12,
              color: '#fff',
              textShadow: '0 6px 18px rgba(2, 16, 24, 0.9)',
              lineHeight: 1.2,
            }}
          >
            Architecture. Engineering.<br />Design-Build Delivery.
          </div>
          <div style={{ fontSize: '1rem', color: '#b6c6d6', marginBottom: 36, fontWeight: 400, maxWidth: 460 }}>
            Attendance, overtime, leaves, and absences for teams. Accounting manages payroll and reports. Employees control their accounts.
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="badge">
              <span>Active Projects</span>
              <strong>48 Sites</strong>
            </div>
            <div className="badge">
              <span>Drawings Synced</span>
              <strong>1,120 Sheets</strong>
            </div>
            <div className="badge">
              <span>Weekly Attendance</span>
              <strong>98% On Time</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          position: 'relative',
          zIndex: 2,
          padding: '64px 32px',
        }}
      >
        <div
          className="login-card"
          style={{
            padding: '48px 40px',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '410px',
            zIndex: 3,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.85rem', color: '#9fb3c2', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Access For
            </div>
            <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: '2.1rem', marginBottom: '6px', letterSpacing: '1px' }}>
              Sign In
            </h2>
            <span style={{ fontSize: '1rem', color: '#B6C6D6', fontWeight: 400, marginBottom: '2px', letterSpacing: '0.5px' }}>
              Architects, engineers, supervisors, admin, HR, and OJT
            </span>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500, letterSpacing: '0.5px' }}>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="login-input"
                required
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500, letterSpacing: '0.5px' }}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="login-input"
                required
              />
            </div>
            {error && (
              <div style={{
                color: '#d4183d',
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: 'rgba(212, 24, 61, 0.1)',
                borderRadius: '8px',
                fontWeight: 500,
                textAlign: 'center',
                letterSpacing: '0.5px',
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '0.88rem', color: '#9fb3c2', marginTop: 12 }}>
              Use your company credentials to access assigned sites.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
