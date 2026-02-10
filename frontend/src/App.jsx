import { useState, useEffect } from 'react';
import axios from 'axios';
import StatusModal from './components/StatusModal';
// import AccountingDashboard from './pages/dashboards/AccountingDashboard';

import InternAttendanceDashboard from './pages/dashboards/Intern_Dashboard/AttendanceDashboard';
import InternOvertimePage from './pages/dashboards/Intern_Dashboard/OvertimePage';
import InternTodoPage from './pages/dashboards/Intern_Dashboard/TodoPage';
import InternProfilePage from './pages/dashboards/Intern_Dashboard/ProfilePage';
import EmployeeAttendanceDashboard from './pages/dashboards/Employee_Dashboard/AttendanceDashboard';
import EmployeeOvertimePage from './pages/dashboards/Employee_Dashboard/OvertimePage';
import EmployeeTodoPage from './pages/dashboards/Employee_Dashboard/TodoPage';
import EmployeeProfilePage from './pages/dashboards/Employee_Dashboard/ProfilePage';
import { DashboardLayout } from './pages/dashboards/Accounting_Department/DashboardLayout';
import { DashboardOverview } from './pages/dashboards/Accounting_Department/DashboardOverview';
import { EmployeeManagement } from './pages/dashboards/Accounting_Department/EmployeeManagement';
import { AttendanceLeave } from './pages/dashboards/Accounting_Department/AttendanceLeave';
import { PayrollManagement } from './pages/dashboards/Accounting_Department/PayrollManagement';
import { Settings } from './pages/dashboards/Accounting_Department/Settings';

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
          background: 'linear-gradient(135deg, rgba(0, 32, 53, 0.92) 0%, rgba(0, 48, 73, 0.4) 100%), url("https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?auto=format&fit=crop&w=1600&q=80") center/cover no-repeat',
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
              We’re in business to help develop the built environment and change the world.
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
            {!isRegister && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              </div>
            )}
            <h2 style={{ 
              color: 'white', 
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '8px',
              letterSpacing: '-0.5px'
            }}>
              {isRegister ? 'Create an account' : 'Sign In'}
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
                  Triple G (Design Studio + Construction)
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
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchPendingUsers();
    fetchUsers();
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

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await axios.get('http://localhost:8000/api/accounts/users/');
      setUsers(res.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load users';
      setUsersError(errorMsg);
    } finally {
      setUsersLoading(false);
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
    <div style={{ backgroundColor: '#021B2C', color: 'white', minHeight: '100vh', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>Admin Control Center</h1>
          <p style={{ color: '#9CA3AF', marginTop: '6px' }}>Verify users, manage accounts, and control access.</p>
        </div>
        <button onClick={onLogout} style={{ padding: '10px 20px', backgroundColor: '#FF7120', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: message.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: `1px solid ${message.includes('Failed') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, borderRadius: '8px', color: message.includes('Failed') ? '#EF4444' : '#10B981' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Pending User Approvals</h2>
            <span style={{ color: '#9CA3AF', fontSize: '13px' }}>{pendingUsers.length} waiting</span>
          </div>
          {pendingUsers.length === 0 ? (
            <p style={{ color: '#9CA3AF' }}>No pending users</p>
          ) : (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingUsers.map(u => (
                <div key={u.id} style={{ backgroundColor: '#002035', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,113,32,0.2)' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{u.first_name} {u.last_name} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({u.email})</span></p>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>Joined: {new Date(u.created_at).toLocaleString()}</p>
                  <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ padding: '8px', backgroundColor: '#1a2332', border: '1px solid #47545E', borderRadius: '6px', color: 'white' }}>
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ padding: '8px', backgroundColor: '#1a2332', border: '1px solid #47545E', borderRadius: '6px', color: 'white' }}>
                      <option value="admin">Admin</option>
                      <option value="employee">Employee</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <button onClick={() => approveUser(u.id)} disabled={loading} style={{ marginTop: '12px', width: '100%', padding: '10px', backgroundColor: '#FF7120', border: 'none', borderRadius: '6px', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Approving...' : 'Approve & Send Email'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#003049', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Manage Users</h2>
          <p style={{ color: '#9CA3AF', marginTop: '8px' }}>Add, edit, suspend, or remove accounts.</p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                backgroundColor: '#002035',
                border: '1px solid #47545E',
                borderRadius: '8px',
                color: 'white',
                outline: 'none'
              }}
            />
            <button style={{ padding: '10px 14px', backgroundColor: '#1f3b53', border: '1px solid #2c4d66', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
              Add Account
            </button>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
            {usersLoading && <div style={{ color: '#9CA3AF' }}>Loading users...</div>}
            {usersError && <div style={{ color: '#FCA5A5' }}>{usersError}</div>}
            {!usersLoading && !usersError && users.length === 0 && (
              <div style={{ color: '#9CA3AF' }}>No users found</div>
            )}
            {!usersLoading && !usersError && users
              .filter((u) => {
                const name = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
                const email = (u.email || '').toLowerCase();
                const term = searchTerm.toLowerCase();
                return name.includes(term) || email.includes(term);
              })
              .map((u) => (
                <div key={u.id} style={{ backgroundColor: '#002035', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '12px' }}>{u.email}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '12px' }}>
                      {u.role_name || u.role || 'No role'} • {u.department_name || 'No department'} • {u.is_active ? 'Active' : 'Suspended'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ padding: '6px 10px', backgroundColor: '#1f3b53', border: '1px solid #2c4d66', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button style={{ padding: '6px 10px', backgroundColor: '#263a34', border: '1px solid #2f5c4f', color: '#d1fae5', borderRadius: '6px', cursor: 'pointer' }}>
                      Suspend
                    </button>
                    <button style={{ padding: '6px 10px', backgroundColor: '#3b1f24', border: '1px solid #5f2a33', color: '#fecaca', borderRadius: '6px', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState('attendance');

  useEffect(() => {
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
    setCurrentPage('attendance');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
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

  const departmentName = user.department_name || 'Unassigned Department';
  const token = localStorage.getItem('token');

  // Intern Dashboard Routing
  if (user.role === 'intern') {
    if (currentPage === 'overtime') {
      return <InternOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
    if (currentPage === 'todo') {
      return <InternTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={() => {}} />;
    }
    if (currentPage === 'profile') {
      return <InternProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
    return <InternAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  // Employee Dashboard Routing
  if (user.role === 'employee') {
    if (currentPage === 'overtime') {
      return <EmployeeOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
    if (currentPage === 'todo') {
      return <EmployeeTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={() => {}} />;
    }
    if (currentPage === 'profile') {
      return <EmployeeProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
    return <EmployeeAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  // Route to department dashboard based on department_name (fallback)
  const departmentKey = (user.department_name || '').toLowerCase();

  // Accounting Department gets the full dashboard
  if (departmentKey === 'accounting department' || departmentKey === 'accounting') {
    const renderContent = () => {
      switch (activeTab) {
        case 'dashboard':
          return <DashboardOverview />;
        case 'employees':
          return <EmployeeManagement />;
        case 'attendance':
          return <AttendanceLeave />;
        case 'payroll':
          return <PayrollManagement />;
        case 'settings':
          return <Settings />;
        default:
          return <DashboardOverview />;
      }
    };

    return (
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
        {renderContent()}
      </DashboardLayout>
    );
  }

  // Fallback to Employee Dashboard for other roles
  if (currentPage === 'overtime') {
    return <EmployeeOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
  }
  if (currentPage === 'todo') {
    return <EmployeeTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={() => {}} />;
  }
  if (currentPage === 'profile') {
    return <EmployeeProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
  }
  
  return <EmployeeAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
}
