import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Camera, Upload, ChevronDown, Calendar, FileText, User } from 'lucide-react';
import PublicNavigation from './PublicNavigation';

const AttendanceDashboard = ({ user, onLogout, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDoc, setWorkDoc] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [buttonLoading, setButtonLoading] = useState(false);

  const attendanceData = [
    {
      date: '2026-02-09',
      amIn: '08:00',
      amOut: '12:00',
      pmIn: '13:00',
      pmOut: '17:00',
      otIn: '-',
      otOut: '-',
      totalHours: '4h 0m',
      late: { afternoon: '0', total: '0' },
      workDone: 'Completed database design and implemented user authentication system...'
    },
    {
      date: '2026-02-08',
      amIn: '08:15',
      amOut: '12:00',
      pmIn: '13:00',
      pmOut: '17:00',
      otIn: '-',
      otOut: '-',
      totalHours: '3h 45m',
      late: { afternoon: '15', total: '15' },
      workDone: 'Attended team meeting, updated project documentation and reviewed code...'
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="attendance" user={user} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-1400px mx-auto px-2 sm:px-10 space-y-4 sm:space-y-8">
        {/* Welcome Section */}
        <div className="welcome" style={{ background: '#001f35', padding: '1rem 1rem', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ color: '#ffffff', fontSize: 'clamp(1rem, 4vw, 1.5rem)', fontWeight: '600', marginBottom: '0.25rem', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Welcome, this is employee dashboard {user?.first_name || 'Villamora'} {user?.last_name || 'Archie'}</h2>
              <p style={{ color: '#a0a4a8', fontSize: 'clamp(0.8rem, 3vw, 0.95rem)', fontWeight: '500' }}>Role: {user?.role || 'Intern'}</p>
            </div>
            <div style={{
              width: 'clamp(40px, 10vw, 50px)',
              height: 'clamp(40px, 10vw, 50px)',
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: '50%',
              border: '3px solid #FF7120',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: '#00273C',
              flexShrink: 0
            }}>
              <User className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: '#FF7120', strokeWidth: 2 }} />
            </div>
          </div>
        </div>

        {/* Attendance & Work Documentation */}
        <div className="intern-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
          <style>{`
            @media (min-width: 768px) {
              .intern-grid {
                grid-template-columns: 1fr 1fr !important;
                gap: 2rem !important;
                margin-bottom: 2rem !important;
              }
            }
          `}</style>
          {/* Attendance Card */}
          <div className="checkin-form" style={{ background: '#001f35', padding: '1rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', fontWeight: '600', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Attendance</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                Upload Photo (Required)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      alert('Image must be less than 5MB.');
                      e.target.value = '';
                      return;
                    }
                    setPhotoFile(file);
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0.75rem 1rem',
                    background: photoFile ? 'rgba(255, 113, 32, 0.1)' : '#00273C',
                    border: `2px dashed ${photoFile ? '#FF7120' : 'rgba(255, 113, 32, 0.3)'}`,
                    borderRadius: '8px',
                    color: photoFile ? '#FF7120' : '#a0a4a8',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                    fontWeight: '500'
                  }}
                >
                  <Camera className="h-4 w-4" />
                  {photoFile ? `Selected: ${photoFile.name}` : 'Choose Photo File'}
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                disabled={buttonLoading}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#FF7120',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
                  transition: 'all 0.2s',
                  opacity: buttonLoading ? 0.7 : 1,
                  width: '100%',
                  maxWidth: '200px'
                }}
                onMouseEnter={(e) => {
                  if (!buttonLoading) {
                    e.target.style.background = '#e66310';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!buttonLoading) {
                    e.target.style.background = '#FF7120';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {buttonLoading ? 'Processing...' : 'Time In'}
              </button>
            </div>
            <div style={{ color: '#a0a4a8', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', marginTop: '1rem', lineHeight: '1.4' }}>
              Time In available 5AM-12PM (counted 8AM-12PM), 12:40PM-5PM, and 6:50PM-10PM for overtime.
            </div>
          </div>

          {/* Work Documentation Card */}
          <div className="checkin-form" style={{ background: '#001f35', padding: '1rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', fontWeight: '600', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Work Documentation</h3>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
              What did you accomplish today? (Optional for morning)
            </label>
            <div style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: '#00273C',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1.25rem',
              minHeight: '100px'
            }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a0a4a8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    height: '24px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a0a4a8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    height: '24px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a0a4a8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    height: '24px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <u>U</u>
                </button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a0a4a8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    height: '24px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  title="Ordered List"
                >
                  1-2-3
                </button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a0a4a8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    height: '24px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  title="Bulleted List"
                >
                  •••
                </button>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a0a4a8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    height: '24px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  title="Clear Formatting"
                >
                  Tx
                </button>
              </div>
              <textarea
                className="w-full bg-transparent border-none outline-none resize-none text-sm"
                placeholder="Example: Completed database design and implemented user authentication system..."
                rows={4}
                value={workDoc}
                onChange={(e) => setWorkDoc(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '0.9rem',
                  color: '#e8eaed',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a4a8', fontSize: '0.9rem' }}>
                Attachments (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                  multiple
                  onChange={(e) => setAttachments(Array.from(e.target.files))}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                  id="attachment-upload"
                />
                <label
                  htmlFor="attachment-upload"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0.75rem 1rem',
                    background: attachments.length > 0 ? 'rgba(255, 113, 32, 0.1)' : '#00273C',
                    border: `2px dashed ${attachments.length > 0 ? '#FF7120' : 'rgba(255, 113, 32, 0.3)'}`,
                    borderRadius: '8px',
                    color: attachments.length > 0 ? '#FF7120' : '#a0a4a8',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  <Upload className="h-4 w-4" />
                  {attachments.length > 0 ? `${attachments.length} file(s) selected` : 'Attach files (PDF, Word, Excel, Images)'}
                </label>
              </div>
              {attachments.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                  {attachments.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📎 {file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              You can check out anytime
            </p>
            <div style={{ display: 'flex', gap: '20px', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                disabled={buttonLoading}
                style={{
                  padding: '0.75rem 1.75rem',
                  background: '#FF7120',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  opacity: buttonLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!buttonLoading) {
                    e.target.style.background = '#e66310';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!buttonLoading) {
                    e.target.style.background = '#FF7120';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {buttonLoading ? 'Processing...' : 'Time Out'}
              </button>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="attendance-table" style={{ background: '#001f35', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.75rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: '600', letterSpacing: '-0.01em' }}>My Attendance History</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#00273C',
                  color: '#e8eaed',
                  border: '1px solid rgba(255, 113, 32, 0.3)',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>
          <div className="table-wrapper" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>AM In</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>AM Out</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>PM In</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>PM Out</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>OT In</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>OT Out</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Total Hours</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Late (Min)</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'normal' }}>Work Done</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Attachments</th>
                  <th style={{ background: '#001a2b', color: '#a0a4a8', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Photo</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record, index) => (
                  <tr 
                    key={index} 
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: index % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 113, 32, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = index % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'transparent';
                    }}
                  >
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{record.date}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{record.amIn}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{record.amOut}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{record.pmIn}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{record.pmOut}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{record.otIn}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{record.otOut}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#28a745', fontSize: '0.9rem', fontWeight: 'medium', whiteSpace: 'nowrap' }}>{record.totalHours}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: record.late.afternoon !== '0' ? '#FF7120' : '#e8eaed', fontWeight: record.late.afternoon !== '0' ? 'medium' : 'normal' }}>A: {record.late.afternoon}</span>
                        <span style={{ color: record.late.total !== '0' ? '#FF7120' : '#e8eaed', fontWeight: record.late.total !== '0' ? 'medium' : 'normal' }}>Total: {record.late.total}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', maxWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.workDone}</span>
                        <button
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#FF7120',
                            cursor: 'pointer',
                            padding: '2px',
                            borderRadius: '4px'
                          }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>-</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#e8eaed', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;