import React, { useState } from 'react';
import workDocumentationService from '../../../../services/workDocumentationService';
import './WorkDocumentationUpload.css';

const WorkDocumentationUpload = ({ attendanceId, onSuccess, onCancel }) => {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!note.trim()) {
      setError('Work documentation note is required');
      return;
    }

    setLoading(true);
    setError('');

    const result = await workDocumentationService.uploadWorkDocumentation(
      attendanceId,
      file,
      note
    );

    setLoading(false);

    if (result.success) {
      // Reset form
      setFile(null);
      setNote('');
      // Notify parent
      if (onSuccess) {
        onSuccess(result.data);
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="work-documentation-upload">
      <div className="upload-header">
        <h3>Add Work Documentation</h3>
        {onCancel && (
          <button className="close-btn" onClick={onCancel}>
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Note Field */}
        <div className="form-group">
          <label htmlFor="note">
            Work Documentation Note <span className="required">*</span>
          </label>
          <textarea
            id="note"
            className="form-control"
            placeholder="Describe the work completed today..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <small className="form-text text-muted">Required - describe what work was completed</small>
        </div>

        {/* File Upload Field */}
        <div className="form-group">
          <label htmlFor="file">
            Attach Files <span className="optional">(Optional)</span>
          </label>

          <div
            className={`file-drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              id="file"
              type="file"
              className="file-input"
              onChange={handleFileChange}
              disabled={loading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
            />

            {file ? (
              <div className="file-preview">
                <span className="file-icon">📄</span>
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => {
                    setFile(null);
                    setError('');
                  }}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="drop-prompt">
                <span className="drop-icon">📁</span>
                <p>Drag and drop a file here, or click to select</p>
                <small>Supported: PDF, Word, Excel, Images (max 25MB)</small>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Action Buttons */}
        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Save Documentation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkDocumentationUpload;
