import { useState } from 'react';
import StatusModal from '../components/StatusModal';
import { login, register } from '../services/authService';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  // Modal states
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const closeModal = () => {
    setModalState({ ...modalState, isOpen: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await login(email, password);

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    setModalState({
      isOpen: true,
      type: 'loading',
      title: 'Creating Your Account',
      message: 'Please wait while we process your registration...'
    });

    setIsLoading(true);

    try {
      const data = await register({ email, password, firstName, lastName });

      if (data.success) {
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Registration Successful!',
          message: data.message || 'Your account has been created successfully. Please wait for admin approval to access your account. You will receive an email notification once approved.'
        });

        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');

        setTimeout(() => {
          setIsRegister(false);
        }, 4000);
      }
    } catch (err) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Registration Failed',
        message: err.response?.data?.error || 'An error occurred during registration. Please try again.'
      });
      setRegisterError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />

      <div style={{
        minHeight: '100vh',
        backgroundColor: '#021B2C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <div className="login-container" style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1100px',
          minHeight: '600px',
          height: '75vh',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Left Side - Hero Section */}
          <div className="login-hero-section" style={{
            flex: '1',
            background: 'linear-gradient(135deg, rgba(0, 32, 53, 0.92) 0%, rgba(0, 48, 73, 0.4) 100%), url("https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?auto=format&fit=crop&w=1600&q=80") center/cover no-repeat',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(255,113,32,0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              top: '-300px',
              left: '-250px',
              animation: 'pulse 3s ease-in-out infinite'
            }} />

            <div style={{
              position: 'absolute',
              bottom: '-48px',
              right: '-48px',
              width: '300px',
              height: '300px',
              border: '2px solid rgba(255,113,32,0.1)',
              borderRadius: '50%',
              animation: 'spin 20s linear infinite'
            }} />

            <div style={{
              position: 'relative',
              zIndex: 10,
              textAlign: 'center',
              maxWidth: '500px'
            }}>
              <div style={{
                marginBottom: '40px',
                animation: 'bounce 2s ease-in-out infinite'
              }}>
                <img
                  src="/logo.png"
                  alt="Triple G Logo"
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '999px',
                    objectFit: 'cover',
                    margin: '0 auto',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.35), 0 0 0 6px rgba(255,113,32,0.12)'
                  }}
                />
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '18px',
                marginBottom: '48px',
                fontWeight: '300'
              }}>
                We're in business to help develop the built environment and change the world.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <span style={{ width: '40px', height: '4px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px' }}></span>
                <span style={{ width: '60px', height: '4px', backgroundColor: '#FF7120', borderRadius: '2px' }}></span>
                <span style={{ width: '40px', height: '4px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px' }}></span>
              </div>
            </div>
          </div>

          {/* Right Side - Form Section */}
          <div className="login-form-section" style={{
            flex: '1',
            backgroundColor: '#021B2C',
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflowY: 'auto'
          }}>
            <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
              {!isRegister && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}></div>
              )}
              <h2 style={{ color: 'white', fontSize: '32px', fontWeight: '600', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                {isRegister ? 'Create an account' : 'Sign In'}
              </h2>

              <p style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '14px' }}>
                {isRegister ? (
                  <span>
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setIsRegister(false); setRegisterError(''); setRegisterSuccess(''); }}
                      style={{ background: 'none', border: 'none', color: '#FF7120', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                      Log in
                    </button>
                  </span>
                ) : (
                  <span>Triple G (Design Studio + Construction)</span>
                )}
              </p>

              <form onSubmit={isRegister ? handleRegister : handleSubmit}>
                {isRegister && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      style={{ width: '100%', padding: '14px 16px', backgroundColor: '#002035', border: '2px solid rgba(255,113,32,0.2)', borderRadius: '12px', color: 'white', fontSize: '16px', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#FF7120'; e.target.style.backgroundColor = '#003049'; e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)'; e.target.style.transform = 'translateY(-2px)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,113,32,0.2)'; e.target.style.backgroundColor = '#002035'; e.target.style.boxShadow = 'none'; e.target.style.transform = 'translateY(0)'; }}
                      required />
                    <input type="text" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)}
                      style={{ width: '100%', padding: '14px 16px', backgroundColor: '#002035', border: '2px solid rgba(255,113,32,0.2)', borderRadius: '12px', color: 'white', fontSize: '16px', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#FF7120'; e.target.style.backgroundColor = '#003049'; e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)'; e.target.style.transform = 'translateY(-2px)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,113,32,0.2)'; e.target.style.backgroundColor = '#002035'; e.target.style.boxShadow = 'none'; e.target.style.transform = 'translateY(0)'; }}
                      required />
                  </div>
                )}

                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px', marginBottom: '16px', backgroundColor: '#002035', border: '2px solid rgba(255,113,32,0.2)', borderRadius: '12px', color: 'white', fontSize: '16px', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.target.style.borderColor = '#FF7120'; e.target.style.backgroundColor = '#003049'; e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)'; e.target.style.transform = 'translateY(-2px)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,113,32,0.2)'; e.target.style.backgroundColor = '#002035'; e.target.style.boxShadow = 'none'; e.target.style.transform = 'translateY(0)'; }}
                  required />

                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '14px 50px 14px 16px', backgroundColor: '#002035', border: '2px solid rgba(255,113,32,0.2)', borderRadius: '12px', color: 'white', fontSize: '16px', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = '#FF7120'; e.target.style.backgroundColor = '#003049'; e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)'; e.target.style.transform = 'translateY(-2px)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,113,32,0.2)'; e.target.style.backgroundColor = '#002035'; e.target.style.boxShadow = 'none'; e.target.style.transform = 'translateY(0)'; }}
                    required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.3s ease' }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#FF7120'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#9CA3AF'}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>

                {error && !isRegister && (
                  <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', fontSize: '14px' }}>{error}</div>
                )}

                {registerError && isRegister && (
                  <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', fontSize: '14px' }}>{registerError}</div>
                )}

                {registerSuccess && !isRegister && (
                  <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10B981', fontSize: '14px' }}>{registerSuccess}</div>
                )}

                {isRegister && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
                    <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#FF7120' }} />
                    <span>I agree to the{' '}<span style={{ color: '#FF7120' }}>Terms & Conditions</span></span>
                  </label>
                )}

                <button type="submit" disabled={isLoading || (isRegister && !agreeTerms)}
                  style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #FF7120 0%, #e55a1f 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(255,113,32,0.3)', marginBottom: '24px', letterSpacing: '0.5px', opacity: (isLoading || (isRegister && !agreeTerms)) ? 0.7 : 1 }}
                  onMouseOver={(e) => { if (!isLoading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(255,113,32,0.5)'; } }}
                  onMouseOut={(e) => { if (!isLoading) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 12px rgba(255,113,32,0.3)'; } }}>
                  {isLoading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create account' : 'Sign in')}
                </button>
              </form>

              {!isRegister && (
                <div style={{ marginTop: '12px', color: '#9CA3AF', fontSize: '14px' }}>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setIsRegister(true); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#FF7120', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                    Create account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @media (max-width: 768px) {
          .login-container { flex-direction: column !important; height: auto !important; min-height: auto !important; }
          .login-hero-section { padding: 32px 24px !important; min-height: 200px !important; flex: none !important; }
          .login-hero-section img { width: 80px !important; height: 80px !important; }
          .login-hero-section p { font-size: 16px !important; margin-bottom: 24px !important; }
          .login-form-section { padding: 32px 24px !important; flex: none !important; }
        }
      `}</style>
      </div>
    </>
  );
}
