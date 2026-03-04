/**
 * Profile service — get/update profile, photo upload, password change
 */
import api from './api';

export async function getProfile() {
    const { data } = await api.get('/profile');
    return data;
}

export async function updateProfile(profileData) {
    const { data } = await api.put('/profile', profileData);
    return data;
}

export async function uploadProfilePicture(formData) {
    const { data } = await api.post('/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function changePassword(newPassword) {
    const { data } = await api.put('/profile/password', { password: newPassword });
    return data;
}
