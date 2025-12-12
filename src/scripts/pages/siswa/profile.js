import { getData, putData } from '../../utils/api.js';
import { API_CONFIG } from '../../config.js'; 

const els = {
    displayName: document.getElementById('displayName'),
    displayClass: document.getElementById('displayClass'),
    inputNama: document.getElementById('inputNama'),
    inputNisn: document.getElementById('inputNisn'),
    profileImage: document.getElementById('profileImage'),
    fileInput: document.getElementById('fileInput'),
    imageLoading: document.getElementById('imageLoading'),
    passwordForm: document.getElementById('passwordForm'),
    btnSavePass: document.getElementById('btnSavePass'),
    btnLogout: document.getElementById('btnLogout')
};

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    setupEventListeners();
});

// --- GLOBAL FUNCTION (Untuk HTML onclick) ---
window.togglePass = (id) => {
    const input = document.getElementById(id);
    if(input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        // Optional: Toggle icon class (eye vs eye-slash) bisa ditambahkan disini
    }
};

// --- DATA LOADING ---
async function loadProfile() {
    try {
        const res = await getData('/student/dashboard');
        if (res.ok) {
            const { nama, nisn, kelas, foto_profil } = res.data.data;
            
            // Update Text
            if(els.displayName) els.displayName.innerText = nama;
            if(els.inputNama) els.inputNama.value = nama;
            if(els.inputNisn) els.inputNisn.value = nisn;
            if(els.displayClass) els.displayClass.innerText = kelas || "Belum ada kelas";

            // Update Image
            if (els.profileImage) {
                if (foto_profil) {
                    // Normalisasi URL gambar (hapus /api dari base url jika ada)
                    let rootUrl = API_CONFIG.BASE_URL.replace(/\/api$/, '');
                    els.profileImage.src = `${rootUrl}/${foto_profil}`;
                } else {
                    els.profileImage.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=10b981&color=fff`;
                }
            }
        } else {
            // Jika Unauthorized, lempar ke login
            if(res.status === 401) window.location.href = '/';
        }
    } catch (error) {
        console.error(error);
        if(typeof showToast === 'function') showToast('Gagal memuat profil', 'error');
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    
    // 1. Upload Foto
    if(els.fileInput) {
        els.fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validasi Ukuran (2MB)
            if (file.size > 2 * 1024 * 1024) {
                showToast('Ukuran foto maksimal 2MB', 'warning');
                return;
            }

            const formData = new FormData();
            formData.append('foto', file);

            // Show Loading
            els.imageLoading.classList.remove('hidden');
            els.imageLoading.style.display = 'flex';

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_CONFIG.BASE_URL}/student/upload-photo`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }, // Jangan set Content-Type untuk FormData
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showToast('Foto berhasil diperbarui!', 'success');
                    loadProfile(); // Refresh gambar
                } else {
                    showToast(result.message || 'Gagal upload foto', 'error');
                }
            } catch (error) {
                console.error(error);
                showToast('Terjadi kesalahan jaringan', 'error');
            } finally {
                els.imageLoading.classList.add('hidden');
                els.fileInput.value = ''; 
            }
        });
    }

    // 2. Ganti Password
    if(els.passwordForm) {
        els.passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPass = document.getElementById('newPassword').value;
            const confirmPass = document.getElementById('confirmPassword').value;

            if (newPass !== confirmPass) {
                showToast('Konfirmasi password tidak cocok!', 'warning');
                return;
            }

            els.btnSavePass.disabled = true;
            els.btnSavePass.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

            try {
                const res = await putData('/student/update-password', { password: newPass });
                
                if (res.ok) {
                    showToast('Password berhasil diubah!', 'success');
                    els.passwordForm.reset();
                } else {
                    showToast(res.data.message || 'Gagal mengubah password', 'error');
                }
            } catch (error) {
                showToast('Error Server', 'error');
            } finally {
                els.btnSavePass.disabled = false;
                els.btnSavePass.innerHTML = '<i class="fa-solid fa-key"></i> Simpan Password';
            }
        });
    }

    // 3. Logout
    if(els.btnLogout) {
        els.btnLogout.addEventListener('click', async () => {
            const confirmed = await showConfirm(
                'Keluar Aplikasi?', 
                'Sesi Anda akan berakhir.', 
                'Keluar', 
                'danger'
            );

            if (confirmed) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        });
    }
}