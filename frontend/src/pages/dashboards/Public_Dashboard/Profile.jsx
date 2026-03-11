import React, { useState, useEffect } from 'react';
import Alert from '../../../components/Alert.jsx';
import { CardSkeleton } from '../../../components/SkeletonLoader.jsx';
import { getMyAttendance } from '../../../services/attendanceService';
import * as profileService from '../../../services/profileService';
import { calcSessionMinutes } from '../../../utils/attendanceFormatters';

function Profile({ token, user, onLogout }) {
  const [profile, setProfile] = useState({ full_name: '', email: '' });
  const [profilePic, setProfilePic] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState({ new: '', confirm: '' });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showCharLimitModal, setShowCharLimitModal] = useState(false);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchAttendanceHours()]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAttendanceHours = async () => {
    try {
      const data = await getMyAttendance();
      let totalMinutes = 0;
      let totalDeductMins = 0;

      data.forEach(a => {
        totalMinutes += calcSessionMinutes(a);
        totalDeductMins += Math.round(parseFloat(a.late_deduction_hours || 0) * 60);
      });

      setTotalHours(totalMinutes);
      setTotalDeductions(totalDeductMins);
    } catch (err) {
      console.error('Failed to compute total hours', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const updateProfile = async () => {
    try {
      await profileService.updateProfile(profile);
      showAlert('success', 'Profile Updated', 'Your profile has been updated successfully.');
      setIsEditing(false);
    } catch (err) {
      showAlert('error', 'Update Failed', 'Failed to update profile.');
    }
  };

  const uploadProfilePic = async () => {
    if (!profilePic || isUploading) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (profilePic.size > maxSize) {
      showAlert('error', 'File Too Large', 'Image must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('profile_pic', profilePic);

    try {
      const response = await profileService.uploadProfilePicture(formData);
      showAlert('success', 'Picture Updated', 'Profile picture updated successfully.');
      setProfilePic(null);
      fetchProfile();

      // Update local storage so the new picture is reflected across the app if they use it in App.jsx
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
          storedUser.profile_picture = response.profile_picture;
          localStorage.setItem('user', JSON.stringify(storedUser));
          window.dispatchEvent(new Event('userUpdated'));
        }
      } catch (e) {
        console.error("Could not update local storage user");
      }

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to upload profile picture.';
      showAlert('error', 'Upload Failed', errorMsg);
      setProfilePic(null);
      fetchProfile();
    } finally {
      setIsUploading(false);
    }
  };

  const updatePassword = async () => {
    if (password.new !== password.confirm) {
      showAlert('error', 'Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.new.length < 6) {
      showAlert('error', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      await profileService.changePassword(password.new);
      showAlert('success', 'Password Set', 'Your password has been set successfully.');
      setPassword({ new: '', confirm: '' });
      setShowPasswordSection(false);
    } catch (err) {
      showAlert('error', 'Update Failed', err.response?.data?.error || 'Failed to set password.');
    }
  };

  return (
    <div>
      {alert && (
        <Alert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {showCharLimitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#00273C',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '400px',
            border: '2px solid #FF7120',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#FF7120', marginBottom: '1rem' }}>Character Limit Reached</h3>
            <p style={{ color: '#e8eaed', marginBottom: '1.5rem' }}>Full name cannot exceed 24 characters.</p>
            <button
              onClick={() => setShowCharLimitModal(false)}
              style={{
                background: '#FF7120',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.75rem 2rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="dashboard">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {loading ? (
            <CardSkeleton />
          ) : (
            <div className="checkin-form">
              <h3>Profile Information</h3>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  minWidth: '100px',
                  minHeight: '100px',
                  borderRadius: '50%',
                  background: '#00273C',
                  border: '3px solid #FF7120',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt="Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF7120" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>

                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.size > 5 * 1024 * 1024) {
                        showAlert('error', 'File Too Large', 'Image must be less than 5MB.');
                        e.target.value = '';
                        return;
                      }
                      if (file) {
                        const objectUrl = URL.createObjectURL(file);
                        setProfile(prev => ({ ...prev, profile_picture: objectUrl }));
                        setProfilePic(file);
                      }
                      e.target.value = '';
                    }}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                    id="profile-pic-upload"
                  />
                  <label
                    htmlFor="profile-pic-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.5rem 1rem',
                      background: isUploading ? 'rgba(255, 113, 32, 0.5)' : '#FF7120',
                      color: 'white',
                      borderRadius: '6px',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    Change Picture
                  </label>
                </div>

                {profilePic && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ color: '#FF7120', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      Selected: {profilePic.name}
                    </p>
                    <button
                      onClick={uploadProfilePic}
                      disabled={isUploading}
                      style={{
                        background: isUploading ? 'rgba(255, 113, 32, 0.5)' : '#FF7120',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isUploading) {
                          e.currentTarget.style.background = '#e66310';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUploading) {
                          e.currentTarget.style.background = '#FF7120';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Picture'}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => {
                    if (e.target.value.length >= 24) {
                      setShowCharLimitModal(true);
                    }
                    setProfile({ ...profile, full_name: e.target.value });
                  }}
                  disabled={!isEditing}
                  maxLength={24}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isEditing ? '#00273C' : '#001a2b',
                    color: '#e8eaed',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#001a2b',
                    color: '#6b7280',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
                  Role
                </label>
                <input
                  type="text"
                  value={user.role_name || user.role || 'No role assigned'}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#001a2b',
                    color: '#6b7280',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {user.role !== 'coordinator' && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: '#00273C',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 113, 32, 0.2)',
                  color: '#e8eaed',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#e8eaed' }}>Total Hours</h4>
                    <p style={{ margin: 0, color: '#a0a4a8', fontSize: '0.9rem' }}>
                      Based on attendance, deductions, and overtime.
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFB36B' }}>
                      {Math.floor(totalHours / 60)}h {totalHours % 60}m
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#00273C', borderRadius: '8px', border: '1px solid rgba(255, 113, 32, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPasswordSection ? '1rem' : '0' }}>
                  <div>
                    <h4 style={{ color: '#e8eaed', fontSize: '1rem', marginBottom: '0.25rem' }}>Password</h4>
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>Set a password for your account</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'transparent',
                      color: '#FF7120',
                      border: '1px solid rgba(255, 113, 32, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {showPasswordSection ? 'Cancel' : 'Set Password'}
                  </button>
                </div>

                {showPasswordSection && (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
                        New Password
                      </label>
                      <input
                        type="password"
                        value={password.new}
                        onChange={(e) => setPassword({ ...password, new: e.target.value })}
                        placeholder="Enter new password"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: '#001a2b',
                          color: '#e8eaed',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={password.confirm}
                        onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                        placeholder="Confirm new password"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: '#001a2b',
                          color: '#e8eaed',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <button
                      onClick={updatePassword}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#FF7120',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        width: '100%',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e66310';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FF7120';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Update Password
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#FF7120',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e66310';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FF7120';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={onLogout}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'transparent',
                        color: '#FF7120',
                        border: '1px solid rgba(255, 113, 32, 0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 113, 32, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={updateProfile}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#FF7120',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e66310';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FF7120';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        fetchProfile();
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'transparent',
                        color: '#a0a4a8',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
