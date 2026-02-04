import { useState, useEffect } from 'react';
import axios from 'axios';
import StatusModal from './components/StatusModal';

const API_URL = 'http://localhost:8000/api/accounts';

// Setup axios interceptor to add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Department Components
function AccountingDashboard({ user, onLogout }) {
  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Accounting Department</h1>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Employee ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>Accounting Module Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>Chart of Accounts</li>
          <li>Journal Entries</li>
          <li>General Ledger</li>
          <li>Financial Reports</li>
        </ul>
      </div>
    </div>
  );
}

function DesignDashboard({ user, onLogout }) {
  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Design Department</h1>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Employee ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>Design Module Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>Design Projects</li>
          <li>Asset Management</li>
          <li>Design Guidelines</li>
          <li>Team Collaboration</li>
        </ul>
      </div>
    </div>
  );
}

function EngineeringDashboard({ user, onLogout }) {
  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Engineering Department</h1>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Employee ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>Engineering Module Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>Technical Documentation</li>
          <li>Build & Deployment</li>
          <li>Performance Monitoring</li>
          <li>Infrastructure Management</li>
        </ul>
      </div>
    </div>
  );
}

function PlanningDashboard({ user, onLogout }) {
  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Planning Department</h1>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Employee ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>Planning Module Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>Project Planning</li>
          <li>Timeline Management</li>
          <li>Resource Allocation</li>
          <li>Progress Tracking</li>
        </ul>
      </div>
    </div>
  );
}

function ITDashboard({ user, onLogout }) {
  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>IT Department</h1>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <p>Welcome, {user.first_name} {user.last_name}</p>
        <p>Employee ID: {user.employee_id}</p>
        <p style={{ marginTop: '20px', color: '#9CA3AF' }}>IT Module Features:</p>
        <ul style={{ marginTop: '10px' }}>
          <li>System Administration</li>
          <li>Network Management</li>
          <li>Support Ticketing</li>
          <li>Security & Compliance</li>
        </ul>
      </div>
    </div>
  );
}

function Login({ onLoginSuccess }) {
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
      const response = await axios.post(`${API_URL}/login/`, {
        email,
        password
      });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user);
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
    
    // Show loading modal
    setModalState({
      isOpen: true,
      type: 'loading',
      title: 'Creating Your Account',
      message: 'Please wait while we process your registration...'
    });
    
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/register/`, {
        email,
        password,
        first_name: firstName,
        last_name: lastName
      });

      if (response.data.success) {
        // Show success modal
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Registration Successful!',
          message: response.data.message || 'Your account has been created successfully. Please wait for admin approval to access your account. You will receive an email notification once approved.'
        });
        
        // Reset form
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        
        // Switch back to login after 4 seconds
        setTimeout(() => {
          setIsRegister(false);
        }, 4000);
      }
    } catch (err) {
      // Show error modal
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
      <div style={{
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
        <div style={{
          flex: '1',
          background: 'linear-gradient(135deg, #002035 0%, #003049 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative background elements */}
          <div style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(255,113,32,0.2) 0%, transparent 70%)',
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
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{
                margin: '0 auto',
                filter: 'drop-shadow(0 10px 30px rgba(255,113,32,0.3))'
              }}>
                <circle cx="50" cy="50" r="48" fill="#FF7120" opacity="0.1"/>
                <circle cx="50" cy="50" r="40" fill="#FF7120"/>
                <path d="M32 50L43 61L68 36" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ 
              fontSize: '48px',
              fontWeight: '300',
              color: 'white',
              lineHeight: '1.2',
              marginBottom: '16px',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              Tracking Progress,<br/>Building Futures
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '18px',
              marginBottom: '48px',
              fontWeight: '300'
            }}>
              Streamlined attendance management for your OJT program
            </p>
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
              <span style={{
                width: '40px',
                height: '4px',
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: '2px'
              }}></span>
              <span style={{
                width: '60px',
                height: '4px',
                backgroundColor: '#FF7120',
                borderRadius: '2px'
              }}></span>
              <span style={{
                width: '40px',
                height: '4px',
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: '2px'
              }}></span>
            </div>
          </div>
        </div>

        {/* Right Side - Form Section */}
        <div style={{
          flex: '1',
          backgroundColor: '#021B2C',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
            <h2 style={{ 
              color: 'white', 
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '8px',
              letterSpacing: '-0.5px'
            }}>
              {isRegister ? 'Create an account' : 'Welcome Back'}
            </h2>
            
            <p style={{
              color: '#9CA3AF',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              {isRegister ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setRegisterError('');
                      setRegisterSuccess('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#FF7120',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    Log in
                  </button>
                </span>
              ) : (
                <span>
                  Sign in to your TGGG Accounting account
                </span>
              )}
            </p>

            <form onSubmit={isRegister ? handleRegister : handleSubmit}>
              {isRegister && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      backgroundColor: '#002035',
                      border: '2px solid rgba(255,113,32,0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF7120';
                      e.target.style.backgroundColor = '#003049';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,113,32,0.2)';
                      e.target.style.backgroundColor = '#002035';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      backgroundColor: '#002035',
                      border: '2px solid rgba(255,113,32,0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF7120';
                      e.target.style.backgroundColor = '#003049';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,113,32,0.2)';
                      e.target.style.backgroundColor = '#002035';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                    required
                  />
                </div>
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  backgroundColor: '#002035',
                  border: '2px solid rgba(255,113,32,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF7120';
                  e.target.style.backgroundColor = '#003049';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,113,32,0.2)';
                  e.target.style.backgroundColor = '#002035';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                }}
                required
              />

              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 50px 14px 16px',
                    backgroundColor: '#002035',
                    border: '2px solid rgba(255,113,32,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF7120';
                    e.target.style.backgroundColor = '#003049';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.1)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,113,32,0.2)';
                    e.target.style.backgroundColor = '#002035';
                    e.target.style.boxShadow = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#FF7120'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#9CA3AF'}
                >
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
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#EF4444',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              {registerError && isRegister && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#EF4444',
                  fontSize: '14px'
                }}>
                  {registerError}
                </div>
              )}

              {registerSuccess && !isRegister && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  color: '#10B981',
                  fontSize: '14px'
                }}>
                  {registerSuccess}
                </div>
              )}

              {isRegister && (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#9CA3AF',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#FF7120'
                    }}
                  />
                  <span>
                    I agree to the{' '}
                    <span style={{ color: '#FF7120' }}>Terms & Conditions</span>
                  </span>
                </label>
              )}
              
              <button 
                type="submit" 
                disabled={isLoading || (isRegister && !agreeTerms)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #FF7120 0%, #e55a1f 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(255,113,32,0.3)',
                  marginBottom: '24px',
                  letterSpacing: '0.5px',
                  opacity: (isLoading || (isRegister && !agreeTerms)) ? 0.7 : 1
                }}
                onMouseOver={(e) => {
                  if (!isLoading) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(255,113,32,0.5)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isLoading) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255,113,32,0.3)';
                  }
                }}
              >
                {isLoading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create account' : 'Sign in')}
              </button>
            </form>

            {!isRegister && (
              <div style={{
                marginTop: '12px',
                color: '#9CA3AF',
                fontSize: '14px'
              }}>
                Don’t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FF7120',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600
                  }}
                >
                  Create account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
    </>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('employee');
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchPendingUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/accounts/departments/');
      setDepartments(res.data);
    } catch (err) {
      setMessage('Failed to load departments');
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('No authentication token found. Please login again.');
        return;
      }
      const res = await axios.get('http://localhost:8000/api/accounts/pending/');
      setPendingUsers(res.data);
      setMessage('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load pending users';
      setMessage(`Error: ${errorMsg}`);
    }
  };

  const approveUser = async (userId) => {
    if (!selectedDept) {
      setMessage('Select a department');
      return;
    }
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/api/accounts/approve/', {
        user_id: parseInt(userId),
        department_id: parseInt(selectedDept),
        role: selectedRole,
        permissions: selectedPerms
      });
      setMessage('User approved successfully');
      fetchPendingUsers();
      setSelectedDept('');
      setSelectedRole('employee');
      setSelectedPerms([]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to approve user';
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Admin Panel - Verify Users</h1>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      {message && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: message.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: `1px solid ${message.includes('Failed') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, borderRadius: '8px', color: message.includes('Failed') ? '#EF4444' : '#10B981' }}>
          {message}
        </div>
      )}
      <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '12px' }}>
        <h2>Pending User Approvals</h2>
        {pendingUsers.length === 0 ? (
          <p>No pending users</p>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {pendingUsers.map(u => (
              <div key={u.id} style={{ backgroundColor: '#002035', padding: '15px', marginBottom: '15px', borderRadius: '8px', border: '1px solid rgba(255,113,32,0.2)' }}>
                <p><strong>{u.first_name} {u.last_name}</strong> ({u.email})</p>
                <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Joined: {new Date(u.created_at).toLocaleString()}</p>
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ padding: '8px', backgroundColor: '#1a2332', border: '1px solid #47545E', borderRadius: '4px', color: 'white' }}>
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ padding: '8px', backgroundColor: '#1a2332', border: '1px solid #47545E', borderRadius: '4px', color: 'white' }}>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="employee">Employee</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <button onClick={() => approveUser(u.id)} disabled={loading} style={{ marginTop: '12px', width: '100%', padding: '10px', backgroundColor: '#FF7120', border: 'none', borderRadius: '4px', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Approving...' : 'Approve & Send Email'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#021B2C', color: 'white' }}>Loading...</div>;
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Route to admin dashboard if user is admin or manager
  if (user.role === 'admin' || user.role === 'manager') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  // Route to department dashboard based on department_name
  const departmentName = user.department_name?.toLowerCase() || '';

  switch (departmentName) {
    case 'accounting department':
      return <AccountingDashboard user={user} onLogout={handleLogout} />;
    case 'design department':
      return <DesignDashboard user={user} onLogout={handleLogout} />;
    case 'engineering department':
      return <EngineeringDashboard user={user} onLogout={handleLogout} />;
    case 'planning department':
      return <PlanningDashboard user={user} onLogout={handleLogout} />;
    case 'it department':
      return <ITDashboard user={user} onLogout={handleLogout} />;
    default:
      return (
        <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1>No Department Assigned</h1>
          <p>Please contact your administrator to assign you to a department.</p>
          <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' }}>
            Logout
          </button>
        </div>
      );
  }
}