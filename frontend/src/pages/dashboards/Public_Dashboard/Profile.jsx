import React from 'react';
import { CardSkeleton } from '../../../components/SkeletonLoader.jsx';
import { useProfile } from '../../../hooks/useProfile';
import ProfilePictureUploader from '../../../components/profile/ProfilePictureUploader';
import ProfileForm from '../../../components/profile/ProfileForm';
import PasswordUpdater from '../../../components/profile/PasswordUpdater';
import SignatureUploader from '../../../components/profile/SignatureUploader';

function Profile({ token, user, onLogout }) {
  const {
    profile, setProfile,
    profilePic, setProfilePic,
    isEditing, setIsEditing,
    password, setPassword,
    showPasswordSection, setShowPasswordSection,
    totalHours,
    totalDeductions,
    loading,
    isUploading,
    isUploadingSignature, setIsUploadingSignature,
    showSignatureSection, setShowSignatureSection,
    showCharLimitModal, setShowCharLimitModal,
    showAlert,
    fetchProfile,
    updateProfile,
    uploadProfilePic,
    updatePassword
  } = useProfile();

  return (
    <div>
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
              <ProfilePictureUploader
                profile={profile}
                setProfile={setProfile}
                profilePic={profilePic}
                setProfilePic={setProfilePic}
                isUploading={isUploading}
                uploadProfilePic={uploadProfilePic}
                showAlert={showAlert}
              />

              <ProfileForm
                profile={profile}
                setProfile={setProfile}
                user={user}
                isEditing={isEditing}
                setShowCharLimitModal={setShowCharLimitModal}
                totalHours={totalHours}
                totalDeductions={totalDeductions}
              />

              <PasswordUpdater
                password={password}
                setPassword={setPassword}
                showPasswordSection={showPasswordSection}
                setShowPasswordSection={setShowPasswordSection}
                updatePassword={updatePassword}
              />

              <SignatureUploader
                profile={profile}
                isUploadingSignature={isUploadingSignature}
                setIsUploadingSignature={setIsUploadingSignature}
                showSignatureSection={showSignatureSection}
                setShowSignatureSection={setShowSignatureSection}
                fetchProfile={fetchProfile}
                showAlert={showAlert}
              />

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
