import React, { useState, useEffect } from 'react';
import workDocumentationService from '../../../../services/workDocumentationService';
import './WorkDocumentationModal.css';

const WorkDocumentationModal = ({ attendanceId, onClose }) => {
  const [workDocs, setWorkDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchWorkDocs = async () => {
      setLoading(true);
      const result = await workDocumentationService.getWorkDocumentation(attendanceId);
      if (result.success) {
        setWorkDocs(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    fetchWorkDocs();
  }, [attendanceId]);

  const handleDeleteFile = async (fileIndex) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setDeleting(true);
    const result = await workDocumentationService.deleteWorkDocumentationFile(
      attendanceId,
      fileIndex
    );

    if (result.success) {
      // Update local state
      const updatedDocs = { ...workDocs };
      updatedDocs.work_doc_file_paths.splice(fileIndex, 1);
      updatedDocs.file_count--;
      setWorkDocs(updatedDocs);
    } else {
      setError(result.error);
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="work-documentation-modal">
        <div className="modal-content">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading documentation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="work-documentation-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Work Documentation</h2>
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-documentation-modal">
      <div className="modal-content">
        <div className="modal-header">
          <div className="header-titles">
            <h2>Work Documentation</h2>
            <p className="sub-date">
              {workDocs?.date ? new Date(workDocs.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }) : ''}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Note Section */}
          {workDocs?.work_doc_note ? (
            <div className="note-section">
              <h3>📝 Documentation Note</h3>
              <div className="note-content">
                <p>{workDocs.work_doc_note}</p>
              </div>
              {workDocs?.work_doc_uploaded_at && (
                <p className="upload-info">
                  Uploaded on {new Date(workDocs.work_doc_uploaded_at).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="no-note">
              <p>No documentation note provided.</p>
            </div>
          )}

          {/* Files Section */}
          {workDocs?.work_doc_file_paths && workDocs.work_doc_file_paths.length > 0 ? (
            <div className="files-section">
              <h3>📎 Attached Files ({workDocs.file_count})</h3>
              <div className="files-list">
                {workDocs.work_doc_file_paths.map((fileData, index) => (
                  <div key={index} className="file-item">
                    <div className="file-item-left">
                      <span className="file-icon">📄</span>
                      <div className="file-details">
                        <a
                          href={fileData.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-name"
                        >
                          {fileData.filename}
                        </a>
                        {fileData.uploaded_at && (
                          <p className="file-date">
                            {new Date(fileData.uploaded_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="file-item-right">
                      <a
                        href={fileData.file_url}
                        download
                        className="btn btn-sm btn-primary"
                        title="Download file"
                      >
                        ⬇️ Download
                      </a>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteFile(index)}
                        disabled={deleting}
                        title="Delete file"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-files">
              <p>No files attached.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkDocumentationModal;
