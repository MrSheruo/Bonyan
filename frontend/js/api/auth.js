import { post } from './client.js';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export async function login(email, password) {
    const data = await post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
}

export async function register(name, email, password) {
    const data = await post('/auth/register', { name, email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
}

export async function logout() {
    try {
        await post('/auth/logout', {});
    } catch (err) {
        console.error(err);
    } finally {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
}

export function getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
}