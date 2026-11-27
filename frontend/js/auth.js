/* auth.js — Handles login, register, logout, and token management */

const API_BASE = '/api';

/* ---------- Token helpers ---------- */
function getToken() { return localStorage.getItem('tg_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('tg_user') || 'null'); }

function saveSession(token, user) {
  localStorage.setItem('tg_token', token);
  localStorage.setItem('tg_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_user');
}

/* ---------- Auth header for API calls ---------- */
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

function redirectTo(path) {
  window.location.href = path.startsWith('/') ? path.slice(1) : path;
}

/* ---------- Guard: redirect if not logged in ---------- */
function requireAuth() {
  if (!getToken()) {
    redirectTo('login.html');
    return false;
  }
  return true;
}

/* ---------- Logout ---------- */
function authLogout() {
  clearSession();
  redirectTo('login.html');
}

/* ---------- Toggle password visibility ---------- */
function togglePassword(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

/* ============================================================
   LOGIN FORM
   ============================================================ */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  // If already logged in, skip to map
  if (getToken()) redirectTo('index.html');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl  = document.getElementById('loginError');
    const btnText  = document.querySelector('#loginBtn .btn-text');
    const btnLoad  = document.querySelector('#loginBtn .btn-loader');

    errorEl.classList.add('hidden');
    btnText.classList.add('hidden');
    btnLoad.classList.remove('hidden');

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');

      saveSession(data.token, data.user);
      redirectTo('index.html');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
    }
  });
}

/* ============================================================
   REGISTER FORM
   ============================================================ */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  if (getToken()) window.location.href = '/index.html';

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl   = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');
    const btnText   = document.querySelector('#registerBtn .btn-text');
    const btnLoad   = document.querySelector('#registerBtn .btn-loader');

    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');
    btnText.classList.add('hidden');
    btnLoad.classList.remove('hidden');

    const name            = document.getElementById('name').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.classList.remove('hidden');
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
      return;
    }

    try {
      const res  = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Registration failed');

      saveSession(data.token, data.user);
      successEl.textContent = `Welcome, ${data.user.name}! Redirecting…`;
      successEl.classList.remove('hidden');
      setTimeout(() => { redirectTo('index.html'); }, 1200);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      btnText.classList.remove('hidden');
      btnLoad.classList.add('hidden');
    }
  });
}

/* Expose helpers to other scripts */
window.getToken    = getToken;
window.getUser     = getUser;
window.authHeaders = authHeaders;
window.requireAuth = requireAuth;
window.authLogout  = authLogout;
window.togglePassword = togglePassword;
