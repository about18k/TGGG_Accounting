import React from 'react';

const ProfilePictureUploader = ({
  profile,
  setProfile,
  profilePic,
  setProfilePic,
  isUploading,
  uploadProfilePic,
  showAlert
}) => {
  return (
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
  );
};

export default ProfilePictureUploader;
