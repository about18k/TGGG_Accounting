import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { getMyAttendance } from '../services/attendanceService';
import * as profileService from '../services/profileService';
import { calcSessionMinutes } from '../utils/attendanceFormatters';

export function useProfile() {
  const [profile, setProfile] = useState({ full_name: '', email: '' });
  const [profilePic, setProfilePic] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState({ new: '', confirm: '' });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [showSignatureSection, setShowSignatureSection] = useState(false);
  const [showCharLimitModal, setShowCharLimitModal] = useState(false);

  const showAlert = useCallback((type, title, message) => {
    if (type === 'success') {
      toast.success(title, { description: message });
    } else if (type === 'error') {
      toast.error(title, { description: message });
    } else {
      toast(title, { description: message });
    }
  }, []);

  const fetchAttendanceHours = useCallback(async () => {
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
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchAttendanceHours()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProfile, fetchAttendanceHours]);

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
      await fetchProfile();

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
      await fetchProfile();
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

  return {
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
  };
}
