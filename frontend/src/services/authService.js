/**
 * Auth service — login & registration
 */
import api from './api';

export async function login(email, password) {
    const { data } = await api.post('/accounts/login/', { email, password });
    return data;
}

export async function register({ email, password, firstName, lastName }) {
    const { data } = await api.post('/accounts/register/', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
    });
    return data;
}
