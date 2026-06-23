import React, { useState, useRef } from 'react';
import * as profileService from '../../services/profileService';

const SignatureUploader = ({
  profile,
  isUploadingSignature,
  setIsUploadingSignature,
  showSignatureSection,
  setShowSignatureSection,
  fetchProfile,
  showAlert
}) => {
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const startDrawing = (e) => {
    if (isUploadingSignature) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || isUploadingSignature) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const uploadSignature = async () => {
    if (!hasSigned || isUploadingSignature) return;

    setIsUploadingSignature(true);
    try {
      const canvas = sigCanvasRef.current;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });

      const formData = new FormData();
      formData.append('signature', file);

      const response = await profileService.uploadSignatureImage(formData);
      showAlert('success', 'Signature Updated', 'Signature uploaded successfully.');
      clearSignature();
      await fetchProfile();

      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
          storedUser.signature_image = response.signature_image;
          localStorage.setItem('user', JSON.stringify(storedUser));
          window.dispatchEvent(new Event('userUpdated'));
        }
      } catch (_error) {
        // no-op
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to upload signature image.';
      showAlert('error', 'Upload Failed', errorMsg);
      await fetchProfile();
    } finally {
      setIsUploadingSignature(false);
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#00273C', borderRadius: '8px', border: '1px solid rgba(255, 113, 32, 0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSignatureSection ? '1rem' : '0' }}>
        <div>
          <h4 style={{ color: '#e8eaed', fontSize: '1rem', marginBottom: '0.25rem' }}>Signature</h4>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>Add a signature for your account</p>
        </div>
        <button
          onClick={() => setShowSignatureSection(!showSignatureSection)}
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
          {showSignatureSection ? 'Cancel' : profile.signature_image ? 'Update Signature' : 'Set Signature'}
        </button>
      </div>

      {showSignatureSection && (
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              margin: '0 auto',
              borderRadius: '10px',
              border: '1px solid rgba(255, 113, 32, 0.45)',
              background: '#001a2b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden',
              padding: '10px'
            }}
          >
            <canvas
              ref={sigCanvasRef}
              width={400}
              height={120}
              style={{
                maxWidth: '100%',
                height: 'auto',
                background: '#FFFFFF',
                borderRadius: '6px',
                cursor: 'crosshair',
                touchAction: 'none'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
            />
            
            <div style={{ marginTop: '0.75rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={clearSignature}
                disabled={isUploadingSignature}
                style={{
                  padding: '0.4rem 1rem',
                  background: 'transparent',
                  color: '#FF7120',
                  border: '1px solid #FF7120',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Clear
              </button>
              <button
                onClick={async () => {
                  await uploadSignature();
                  setShowSignatureSection(false);
                }}
                disabled={!hasSigned || isUploadingSignature}
                style={{
                  background: (!hasSigned || isUploadingSignature) ? 'rgba(255, 113, 32, 0.45)' : '#FF7120',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 1rem',
                  cursor: (!hasSigned || isUploadingSignature) ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                {isUploadingSignature ? 'Saving...' : 'Save Signature'}
              </button>
            </div>
          </div>
          <p style={{ marginTop: '0.5rem', color: '#6b7280', textAlign: 'center', fontSize: '0.8rem' }}>Sign above to update your profile signature</p>
        </div>
      )}
    </div>
  );
};

export default SignatureUploader;
