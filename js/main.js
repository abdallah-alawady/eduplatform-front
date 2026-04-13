/* ============================================================
   EDU PLATFORM — main.js
   Shared utilities, API layer, auth helpers, UI components
   ============================================================ */

/* ---------- Config ---------- */
const API_BASE = '/api';       // Swap to your real base URL

/* ============================================================
   AUTH HELPERS
   ============================================================ */

/** Retrieve stored user data from localStorage */
function getUser() {
  try { return JSON.parse(localStorage.getItem('edu_user')); }
  catch { return null; }
}

/** Retrieve stored JWT token */
function getToken() {
  return localStorage.getItem('edu_token');
}

/** Persist user + token after login */
function saveSession(user, token) {
  localStorage.setItem('edu_user', JSON.stringify(user));
  localStorage.setItem('edu_token', token);
}

/** Clear session and redirect to login */
function logout() {
  localStorage.removeItem('edu_user');
  localStorage.removeItem('edu_token');
  window.location.href = 'login.html';
}

/** Guard: redirect away from protected page if not logged in */
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/** Guard: redirect to correct dashboard if already logged in */
function redirectIfLoggedIn() {
  const token = getToken();
  if (token) redirectToDashboard();
}

/** Send user to their role-specific dashboard */
function redirectToDashboard() {
  const user = getUser();
  if (!user) { logout(); return; }
  window.location.href = 'dashboard.html';
}

/* ============================================================
   API LAYER
   All fetch() calls go through here for consistent auth +
   error handling.
   ============================================================ */

/**
 * Generic API request
 * @param {string} path     - e.g. '/courses'
 * @param {string} method   - GET | POST | PUT | DELETE
 * @param {object} [body]   - JSON payload for POST/PUT
 * @returns {Promise<object>}
 */
async function apiRequest(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  // Handle 401 Unauthorized globally
  if (res.status === 401) { logout(); return; }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || data.title || `Error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/* Convenience wrappers */
const api = {
  get:    (path)         => apiRequest(path, 'GET'),
  post:   (path, body)   => apiRequest(path, 'POST', body),
  put:    (path, body)   => apiRequest(path, 'PUT', body),
  delete: (path)         => apiRequest(path, 'DELETE'),
};

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
(function initToasts() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  window._toastContainer = container;
})();

/**
 * Show a toast notification
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 * @param {number} duration  ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { info: '💬', success: '✅', error: '❌' };
  toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
  window._toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================================================
   SIDEBAR HELPERS (dashboard pages)
   ============================================================ */

/** Populate sidebar user info from localStorage */
function populateSidebarUser() {
  const user = getUser();
  if (!user) return;

  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  const topNameEl = document.getElementById('topbar-user-name');

  const initials = (user.name || user.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (nameEl) nameEl.textContent = user.name || user.email;
  if (roleEl) roleEl.textContent = user.role || 'Student';
  if (avatarEl) avatarEl.textContent = initials;
  if (topNameEl) topNameEl.textContent = user.name || user.email;
}

/** Highlight current page in sidebar nav */
function setActiveNav() {
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.page === page) item.classList.add('active');
  });
}

/** Toggle mobile sidebar */
function initMobileSidebar() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.style.display = 'none';
    });
  }
}

/* ============================================================
   LOADING / SKELETON HELPERS
   ============================================================ */

/** Show skeleton loaders inside a container */
function showSkeletons(containerId, count = 3, type = 'card') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(count).fill(
    type === 'card'
      ? `<div class="skeleton skeleton-card"></div>`
      : `<div style="padding:16px;background:#fff;border-radius:8px;border:1px solid #e2e8f0">
           <div class="skeleton skeleton-text" style="width:60%"></div>
           <div class="skeleton skeleton-text" style="width:80%"></div>
           <div class="skeleton skeleton-text" style="width:40%"></div>
         </div>`
  ).join('');
}

/** Show a centered spinner in a container */
function showSpinner(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:64px">
      <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#f59e0b;border-radius:50%;animation:spin 0.7s linear infinite"></div>
    </div>`;
}

/** Show empty state */
function showEmpty(containerId, message = 'No data found', icon = '📭') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>Nothing here yet</h3>
      <p>${message}</p>
    </div>`;
}

/* ============================================================
   FORM VALIDATION HELPERS
   ============================================================ */

/**
 * Validate a form field
 * @param {HTMLElement} input
 * @param {string} rule  - 'required' | 'email' | 'min:N' | 'match:fieldId'
 * @returns {string|null} error message or null
 */
function validateField(input, rule) {
  const val = input.value.trim();
  if (rule === 'required' && !val) return 'This field is required.';
  if (rule === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
    return 'Enter a valid email address.';
  if (rule.startsWith('min:')) {
    const min = parseInt(rule.split(':')[1]);
    if (val.length < min) return `Must be at least ${min} characters.`;
  }
  if (rule.startsWith('match:')) {
    const otherId = rule.split(':')[1];
    const other = document.getElementById(otherId);
    if (other && val !== other.value.trim()) return 'Passwords do not match.';
  }
  return null;
}

/**
 * Mark a field as error or valid
 */
function setFieldError(input, message) {
  input.classList.toggle('error', !!message);
  const errEl = input.parentElement.querySelector('.field-error');
  if (errEl) {
    errEl.textContent = message || '';
    errEl.classList.toggle('visible', !!message);
  }
}

/** Show / hide the top-level alert box */
function showAlert(id, message, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} visible`;
  el.querySelector('.alert-msg').textContent = message;
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}

/* ============================================================
   URL PARAM HELPERS
   ============================================================ */
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/* ============================================================
   LOGOUT BUTTON — attach on all dashboard pages
   ============================================================ */
function initLogoutBtn() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', logout);
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
function initModalCloseButtons() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */

/**
 * Build a course card HTML string
 * @param {object} course
 */
function renderCourseCard(course) {
  const progress = course.progress ?? 0;
  const emoji = course.emoji || '📚';
  return `
    <div class="course-card" onclick="window.location.href='course-details.html?id=${course.id}'">
      <div class="course-card__thumb">
        <span style="position:relative;z-index:1">${emoji}</span>
        ${course.isNew ? '<span class="course-card__thumb-label">New</span>' : ''}
      </div>
      <div class="course-card__body">
        <div class="course-card__category">${course.category || 'General'}</div>
        <div class="course-card__title">${course.title}</div>
        <div class="course-card__meta">
          <span>📖 ${course.lessonsCount || 0} lessons</span>
          <span>⏱ ${course.duration || '—'}</span>
          <span>⭐ ${course.rating || '4.5'}</span>
        </div>
        <div class="course-card__progress-bar">
          <div class="course-card__progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="course-card__progress-label">
          <span>Progress</span><span>${progress}%</span>
        </div>
      </div>
      <div class="course-card__footer">
        <div class="course-card__author">
          <div class="course-card__avatar-sm">${(course.instructorName || 'T')[0]}</div>
          ${course.instructorName || 'Instructor'}
        </div>
        <span class="badge badge-amber">${course.level || 'All levels'}</span>
      </div>
    </div>`;
}

/**
 * Build an exam card HTML string
 */
function renderExamCard(exam) {
  const statusClass = { pending: 'badge-amber', completed: 'badge-green', missed: 'badge-red' }[exam.status] || 'badge-gray';
  return `
    <div class="exam-card">
      <div class="exam-card__icon">📝</div>
      <div class="exam-card__title">${exam.title}</div>
      <div class="exam-card__course">${exam.courseName || 'General'}</div>
      <div class="exam-card__details">
        <div class="exam-detail-row">⏱ Duration: <strong>${exam.duration || 'N/A'} min</strong></div>
        <div class="exam-detail-row">❓ Questions: <strong>${exam.questionsCount || 0}</strong></div>
        <div class="exam-detail-row">📅 Due: <strong>${exam.dueDate ? new Date(exam.dueDate).toLocaleDateString() : 'Open'}</strong></div>
        ${exam.score != null ? `<div class="exam-detail-row">🏆 Score: <strong>${exam.score}%</strong></div>` : ''}
      </div>
      <div class="exam-card__footer">
        <span class="badge ${statusClass}">${exam.status || 'pending'}</span>
        ${exam.status !== 'completed'
          ? `<button class="btn-amber" onclick="window.location.href='take-exam.html?id=${exam.id}'">Start</button>`
          : `<button class="btn-secondary">Review</button>`}
      </div>
    </div>`;
}

/* ============================================================
   INIT — runs on every page
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Animate page in
  document.body.classList.add('page-fade');

  // Wire up logout button
  initLogoutBtn();

  // Close modal buttons
  initModalCloseButtons();

  // Mobile sidebar toggle
  initMobileSidebar();
});
