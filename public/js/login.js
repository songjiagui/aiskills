/**
 * Login Page JavaScript
 */

const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const loginBtn = document.getElementById('login-btn');
const btnText = loginBtn.querySelector('.btn-text');
const btnLoading = loginBtn.querySelector('.btn-loading');

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
  errorMessage.style.display = 'none';
}

// Set loading state
function setLoading(loading) {
  loginBtn.disabled = loading;
  btnText.style.display = loading ? 'none' : 'block';
  btnLoading.style.display = loading ? 'block' : 'none';
}

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError('请输入用户名和密码');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || '登录失败');
    }

    // Login successful, redirect to main page
    window.location.href = '/';
  } catch (error) {
    showError(error.message || '登录失败，请重试');
  } finally {
    setLoading(false);
  }
});

// Check if already logged in
(async function checkAuth() {
  try {
    const response = await fetch('/api/auth/check');
    const data = await response.json();
    if (data.authenticated) {
      window.location.href = '/';
    }
  } catch (error) {
    // Not authenticated, stay on login page
  }
})();
