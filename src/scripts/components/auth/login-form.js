import { postData } from '../../utils/api.js';

const els = {
    loginForm: document.getElementById('loginForm'),
    tabGuru: document.getElementById('tab-guru'),
    tabSiswa: document.getElementById('tab-siswa'),
    formGuru: document.getElementById('form-guru'),
    formSiswa: document.getElementById('form-siswa'),
    roleInput: document.getElementById('role-input'),
    hintSiswa: document.getElementById('hint-siswa'),
    alertBox: document.getElementById('alert-box'),
    alertTitle: document.getElementById('alert-title'),
    alertMessage: document.getElementById('alert-message'),
    btnSubmit: document.getElementById('btn-submit'),
    emailInput: document.getElementById('email'),
    nisnInput: document.getElementById('nisn'),
    passwordInput: document.getElementById('password')
};

// Class Utilities for Tabs
const activeClasses = ['bg-white', 'text-primary', 'shadow-sm'];
const inactiveClasses = ['text-gray-500', 'hover:bg-gray-200', 'hover:text-gray-700'];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// --- 1. AUTO REDIRECT (CHECK AUTH) ---
function checkAuth() {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (token && userString) {
        try {
            const user = JSON.parse(userString);
            if (user.role === 'guru') window.location.href = '/guru';
            else if (user.role === 'siswa') window.location.href = '/siswa';
        } catch (e) {
            console.error("Session invalid", e);
            localStorage.clear();
        }
    }
}

// --- 2. TAB LOGIC ---
function switchTab(role) {
    if(els.alertBox) els.alertBox.classList.add('hidden');

    if (role === 'guru') {
        // Tab Styles
        els.tabGuru.classList.add(...activeClasses);
        els.tabGuru.classList.remove(...inactiveClasses);
        els.tabSiswa.classList.remove(...activeClasses);
        els.tabSiswa.classList.add(...inactiveClasses);

        // Visibility
        els.formGuru.classList.remove('hidden');
        els.formSiswa.classList.add('hidden');
        els.hintSiswa.classList.add('hidden');
        
        // Values
        els.roleInput.value = 'guru';
        els.nisnInput.value = ''; 

    } else {
        // Tab Styles
        els.tabSiswa.classList.add(...activeClasses);
        els.tabSiswa.classList.remove(...inactiveClasses);
        els.tabGuru.classList.remove(...activeClasses);
        els.tabGuru.classList.add(...inactiveClasses);

        // Visibility
        els.formSiswa.classList.remove('hidden');
        els.formGuru.classList.add('hidden');
        els.hintSiswa.classList.remove('hidden');
        
        // Values
        els.roleInput.value = 'siswa';
        els.emailInput.value = '';
    }
}

// --- 3. SUBMIT LOGIC ---
async function handleLogin(e) {
    e.preventDefault();
    
    const originalText = els.btnSubmit.innerHTML;
    els.btnSubmit.disabled = true;
    els.btnSubmit.innerHTML = `<span class="loading loading-spinner loading-sm"></span>`;

    const role = els.roleInput.value;
    const password = els.passwordInput.value;
    let payload = { password };

    if (role === 'guru') payload.email = els.emailInput.value;
    else payload.nisn = els.nisnInput.value;

    try {
        const result = await postData('/auth/login', payload);

        if (result.ok) {
            showAlert('success', 'Login Berhasil', 'Mengalihkan ke dashboard...');
            
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('user', JSON.stringify(result.data.user));

            // Redirect berdasarkan role dari server (lebih aman)
            const userRole = result.data.user.role || role;

            setTimeout(() => {
                if (userRole === 'guru') window.location.href = '/guru';
                else if (userRole === 'siswa') window.location.href = '/siswa';
                else window.location.href = '/';
            }, 1000);

        } else {
            throw new Error(result.data.message || 'Cek kembali data Anda');
        }
    } catch (error) {
        showAlert('error', 'Login Gagal', error.message);
        els.btnSubmit.disabled = false;
        els.btnSubmit.innerHTML = originalText;
    }
}

// --- 4. ALERT SYSTEM ---
function showAlert(type, title, message) {
    if(!els.alertBox) return;

    els.alertBox.classList.remove('hidden', 'alert-success', 'alert-error');
    
    if (type === 'success') {
        els.alertBox.classList.add('alert-success', 'bg-emerald-50', 'border', 'border-emerald-200', 'text-emerald-900');
    } else {
        els.alertBox.classList.add('alert-error', 'bg-red-50', 'border', 'border-red-200', 'text-red-900');
    }
    
    els.alertTitle.innerText = title;
    els.alertMessage.innerText = message;
}

function setupEventListeners() {
    if(els.tabGuru) els.tabGuru.addEventListener('click', () => switchTab('guru'));
    if(els.tabSiswa) els.tabSiswa.addEventListener('click', () => switchTab('siswa'));
    if(els.loginForm) els.loginForm.addEventListener('submit', handleLogin);
}