// src/scripts/pages/admin/management.js
import { getData, postData, putData, deleteData } from '../../utils/api.js';

// --- STATE ---
let allGuru = [];
let allKelas = [];

// --- DOM ELEMENTS ---
const elements = {
    contentGuru: document.getElementById('content-guru'),
    contentKelas: document.getElementById('content-kelas'),
    tabGuru: document.getElementById('tab-guru'),
    tabKelas: document.getElementById('tab-kelas'),
    guruTableBody: document.getElementById('guru-table-body'),
    kelasGrid: document.getElementById('kelas-grid-container'),
    emptyKelas: document.getElementById('empty-kelas'),
    
    // Search
    searchGuru: document.getElementById('search-guru'),
    searchKelas: document.getElementById('search-kelas'),

    // Modals
    modalGuru: document.getElementById('modal_guru'),
    modalKelas: document.getElementById('modal_kelas'),
    
    // Forms
    formGuru: document.getElementById('form-guru'),
    formKelas: document.getElementById('form-kelas'),
    
    // Inputs Guru
    guruId: document.getElementById('guru-id'),
    guruNama: document.getElementById('nama'),
    guruEmail: document.getElementById('email'),
    guruPass: document.getElementById('password'),
    modalTitleGuru: document.getElementById('modal-title-guru'),
    mapelContainer: document.getElementById('mapel-container'),

    // Inputs Kelas
    kelasId: document.getElementById('kelas-id'),
    kelasNama: document.getElementById('nama_kelas'),
    kelasTahun: document.getElementById('tahun_ajaran'),
    modalTitleKelas: document.getElementById('modal-title-kelas'),
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataGuru();
    loadDataKelas();
    setupListeners();
});

function setupListeners() {
    // Search Listeners
    if(elements.searchGuru) elements.searchGuru.addEventListener('input', handleSearchGuru);
    if(elements.searchKelas) elements.searchKelas.addEventListener('input', handleSearchKelas);

    // Form Submit Listeners
    if(elements.formGuru) elements.formGuru.addEventListener('submit', handleSaveGuru);
    if(elements.formKelas) elements.formKelas.addEventListener('submit', handleSaveKelas);
}

// --- TAB LOGIC ---
// Di-expose ke window karena dipanggil via onclick di HTML
window.switchTab = (tab) => {
    if (tab === 'guru') {
        elements.contentGuru.classList.remove('hidden');
        elements.contentKelas.classList.add('hidden');
        elements.tabGuru.classList.add('tab-active', 'bg-white', 'text-primary');
        elements.tabKelas.classList.remove('tab-active', 'bg-white', 'text-primary');
    } else {
        elements.contentGuru.classList.add('hidden');
        elements.contentKelas.classList.remove('hidden');
        elements.tabKelas.classList.add('tab-active', 'bg-white', 'text-primary');
        elements.tabGuru.classList.remove('tab-active', 'bg-white', 'text-primary');
    }
};

// --- DATA LOADING & RENDERING ---

async function loadDataGuru() {
    const res = await getData('/admin/guru');
    if (res.ok && res.data.data) {
        allGuru = res.data.data;
        renderGuruTable(allGuru);
    }
}

async function loadDataKelas() {
    const res = await getData('/admin/guru/classes');
    if (res.ok && res.data.data) {
        allKelas = res.data.data;
        renderKelasGrid(allKelas);
    }
}

function renderGuruTable(data) {
    if (data.length === 0) {
        elements.guruTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-400">Data kosong</td></tr>`;
        return;
    }
    
    elements.guruTableBody.innerHTML = data.map(g => {
        const mapelBadges = g.mengajar && g.mengajar.length > 0
            ? g.mengajar.map(m => `<span class="badge badge-ghost badge-sm mr-1 mb-1 border-gray-300 bg-white">${m.mapel} (${m.nama_kelas})</span>`).join('')
            : '<span class="text-xs text-gray-400 italic"> - </span>';

        // Escape quote untuk JSON string di onclick
        const mapelJson = JSON.stringify(g.mengajar || []).replace(/"/g, '&quot;');

        return `
        <tr class="hover">
            <td><div class="font-bold text-gray-800">${g.nama}</div></td>
            <td class="text-sm text-gray-600">${g.email}</td>
            <td>${mapelBadges}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-square btn-ghost text-blue-600" onclick="editGuru('${g.id}', '${g.nama}', '${g.email}', '${mapelJson}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-sm btn-square btn-ghost text-red-500" onclick="deleteGuru('${g.id}', '${g.nama}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderKelasGrid(data) {
    if (data.length === 0) {
        elements.kelasGrid.innerHTML = '';
        elements.emptyKelas.classList.remove('hidden');
        return;
    }

    elements.emptyKelas.classList.add('hidden');
    elements.kelasGrid.innerHTML = data.map(c => `
        <div class="card bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all group">
            <div class="card-body p-5 flex flex-row justify-between items-center">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">${c.nama_kelas}</h3>
                    <p class="text-sm text-gray-500 font-mono">${c.tahun_ajaran}</p>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn btn-square btn-sm btn-ghost text-warning" onclick="editKelas('${c.id}', '${c.nama_kelas}', '${c.tahun_ajaran}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-square btn-sm btn-ghost text-error" onclick="deleteKelas('${c.id}', '${c.nama_kelas}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- SEARCH HANDLERS ---
function handleSearchGuru(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allGuru.filter(g => g.nama.toLowerCase().includes(term));
    renderGuruTable(filtered);
}

function handleSearchKelas(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allKelas.filter(c => c.nama_kelas.toLowerCase().includes(term));
    renderKelasGrid(filtered);
}

// --- MODAL & FORM LOGIC: GURU ---

// Expose ke window
window.openModalGuru = () => {
    elements.formGuru.reset();
    elements.guruId.value = '';
    elements.modalTitleGuru.innerText = "Tambah Guru Baru";
    elements.mapelContainer.innerHTML = '';
    window.addMapelRow(); // Tambah 1 row kosong default
    elements.modalGuru.showModal();
};

window.editGuru = (id, nama, email, mapelJson) => {
    elements.guruId.value = id;
    elements.guruNama.value = nama;
    elements.guruEmail.value = email;
    elements.guruPass.value = ''; // Password dikosongkan saat edit
    elements.modalTitleGuru.innerText = "Edit Data Guru";

    let mapelList = [];
    try { mapelList = JSON.parse(mapelJson); } catch (e) {}
    
    elements.mapelContainer.innerHTML = '';
    if (mapelList.length > 0) {
        mapelList.forEach(m => window.addMapelRow(m.id_kelas, m.mapel));
    } else {
        window.addMapelRow();
    }

    elements.modalGuru.showModal();
};

window.addMapelRow = (selectedClassId = '', mapelName = '') => {
    const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    // Generate Options Kelas
    let options = `<option value="" disabled ${!selectedClassId ? 'selected' : ''}>Pilih Kelas...</option>`;
    allKelas.forEach(c => {
        options += `<option value="${c.id}" ${c.id === selectedClassId ? 'selected' : ''}>${c.nama_kelas}</option>`;
    });

    const rowHtml = `
        <div class="flex gap-2 items-end mapel-row animate-fade-in" id="row-${uniqueId}">
            <div class="form-control w-1/3">
                <label class="label py-0 text-xs">Kelas</label>
                <select class="select select-bordered select-sm w-full mapel-kelas-select bg-white">${options}</select>
            </div>
            <div class="form-control w-2/3">
                <label class="label py-0 text-xs">Mapel</label>
                <input type="text" class="input input-bordered input-sm w-full mapel-name-input" value="${mapelName}" placeholder="Matematika" />
            </div>
            <button type="button" class="btn btn-square btn-sm btn-ghost text-red-400" onclick="document.getElementById('row-${uniqueId}').remove()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;
    elements.mapelContainer.insertAdjacentHTML('beforeend', rowHtml);
};

async function handleSaveGuru(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-guru');
    btn.disabled = true; btn.innerText = "Menyimpan...";

    const id = elements.guruId.value;
    const pwd = elements.guruPass.value;

    const payload = {
        nama: elements.guruNama.value,
        email: elements.guruEmail.value,
        mapel_list: []
    };
    if (pwd) payload.password = pwd;

    // Collect Mapel Data
    document.querySelectorAll('.mapel-row').forEach(row => {
        const id_kelas = row.querySelector('.mapel-kelas-select').value;
        const mata_pelajaran = row.querySelector('.mapel-name-input').value;
        if (id_kelas && mata_pelajaran) {
            payload.mapel_list.push({ id_kelas, mata_pelajaran });
        }
    });

    try {
        const endpoint = id ? `/admin/guru/${id}` : '/admin/guru/create';
        const method = id ? putData : postData;
        
        const res = await method(endpoint, payload);
        if (res.ok) {
            window.showToast('Data Guru Tersimpan!', 'success');
            elements.modalGuru.close();
            loadDataGuru();
        } else {
            window.showToast(res.data.message || 'Gagal', 'error');
        }
    } catch (e) {
        console.error(e);
        window.showToast('Error Sistem', 'error');
    } finally {
        btn.disabled = false; btn.innerText = "Simpan Guru";
    }
}

// --- MODAL & FORM LOGIC: KELAS ---

window.openModalKelas = () => {
    elements.formKelas.reset();
    elements.kelasId.value = '';
    elements.modalTitleKelas.innerText = "Buat Kelas Baru";
    elements.modalKelas.showModal();
};

window.editKelas = (id, nama, tahun) => {
    elements.kelasId.value = id;
    elements.kelasNama.value = nama;
    elements.kelasTahun.value = tahun;
    elements.modalTitleKelas.innerText = "Edit Data Kelas";
    elements.modalKelas.showModal();
};

async function handleSaveKelas(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-kelas');
    btn.disabled = true; btn.innerText = "Menyimpan...";

    const id = elements.kelasId.value;
    const payload = {
        nama_kelas: elements.kelasNama.value,
        tahun_ajaran: elements.kelasTahun.value
    };

    try {
        // Jika ID ada, gunakan PUT, jika tidak gunakan POST
        const endpoint = id ? `/admin/guru/classes/${id}` : '/admin/guru/classes';
        const method = id ? putData : postData;

        const res = await method(endpoint, payload);
        if (res.ok) {
            window.showToast(id ? 'Kelas berhasil diupdate!' : 'Kelas berhasil dibuat!', 'success');
            elements.modalKelas.close();
            loadDataKelas();
        } else {
            window.showToast(res.data.message || 'Gagal menyimpan kelas', 'error');
        }
    } catch (e) {
        console.error(e);
        window.showToast('Error Sistem', 'error');
    } finally {
        btn.disabled = false; btn.innerText = "Simpan Kelas";
    }
}

// --- DELETE HANDLERS ---

window.deleteGuru = async (id, nama) => {
    // Asumsi window.showConfirm tersedia secara global
    if (await window.showConfirm('Hapus Guru?', `Hapus ${nama}?`, 'Ya, Hapus', 'danger')) {
        const res = await deleteData(`/admin/guru/${id}`);
        if (res.ok) {
            window.showToast('Guru dihapus', 'success');
            loadDataGuru();
        } else {
            window.showToast('Gagal hapus guru', 'error');
        }
    }
};

window.deleteKelas = async (id, nama) => {
    if (await window.showConfirm('Hapus Kelas?', `Hapus kelas ${nama}? Data siswa di dalamnya akan ikut terhapus!`, 'Ya, Hapus', 'danger')) {
        const res = await deleteData(`/admin/guru/classes/${id}`);
        if (res.ok) {
            window.showToast('Kelas dihapus', 'success');
            loadDataKelas();
        } else {
            window.showToast('Gagal hapus kelas', 'error');
        }
    }
};