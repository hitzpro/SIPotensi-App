import { getData } from '../../utils/api.js';
import { API_CONFIG } from '../../config.js';

// --- STATE & CONSTANTS ---
const els = {
    main: document.getElementById('main-content'),
    taskTitle: document.getElementById('task-title'),
    badgeJenis: document.getElementById('badge-jenis'),
    textDeadline: document.getElementById('text-deadline'),
    infoDesc: document.getElementById('info-desc'),
    metaContainer: document.getElementById('task-meta-container'),
    metaSkeleton: document.getElementById('task-meta-skeleton'),
    previewArea: document.getElementById('preview-soal-area'),
    submissionBody: document.getElementById('submission-body'),
    submissionCount: document.getElementById('submission-count'),
    modalEdit: document.getElementById('modal_edit_task'),
    formEdit: document.getElementById('form-edit-task'),
    modalPreview: document.getElementById('modal_preview'),
    previewContent: document.getElementById('preview-content'),
    editNama: document.getElementById('edit-nama'),
    editDeadline: document.getElementById('edit-deadline'),
    editDeskripsi: document.getElementById('edit-deskripsi'),
    editFileContainer: document.getElementById('edit-file-container')
};

let CLASS_ID = null;
let TASK_ID = null;
let currentTask = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (els.main) {
        CLASS_ID = els.main.dataset.classId;
        TASK_ID = els.main.dataset.taskId;
        
        loadPageData();
        setupEditForm();
    }

    window.previewFile = previewFile;
    window.openEditModal = openEditModal;
});

// --- DATA LOADING ---
async function loadPageData() {
    try {
        const resDetail = await getData(`/classes/tugas/${TASK_ID}/detail`);
        const resSub = await getData(`/classes/tugas/${TASK_ID}/submissions`);

        if(resDetail.ok) {
            currentTask = resDetail.data.data;
            renderTaskHeader(currentTask);
            renderSoalPreview(currentTask);
        }

        if(resSub.ok) {
            renderSubmissions(resSub.data.data);
        }
    } catch (error) {
        console.error("Gagal memuat data:", error);
        if(typeof showToast === 'function') showToast("Gagal memuat detail tugas", "error");
    }
}

// --- RENDER FUNCTIONS ---
function renderTaskHeader(task) {
    els.taskTitle.innerText = task.nama_tugas;
    els.taskTitle.classList.remove('skeleton');
    
    els.badgeJenis.innerText = task.jenis_tugas;
    els.textDeadline.innerText = new Date(task.deadline).toLocaleString('id-ID');
    els.infoDesc.innerText = task.deskripsi || '(Tidak ada deskripsi)';
    
    els.metaContainer.classList.remove('hidden');
    els.metaSkeleton.classList.add('hidden');
}

// [UPDATE] Logic Preview Soal yang Benar
function renderSoalPreview(task) {
    els.previewArea.innerHTML = '';

    // --- TOMBOL DOWNLOAD FILE ASLI ---
    let fileInfoHtml = '';
    if (task.file_soal) {
        // Path mentah dari DB (misal: C:/Users/Temp/file.pdf)
        const rawPath = task.file_soal;
        // URL Stream API untuk Download langsung
        const streamUrl = `${API_CONFIG.BASE_URL}/files/stream?path=${encodeURIComponent(rawPath)}`;
        
        const labelFile = task.jenis_tugas === 'quiz' ? 'File CSV Quiz' : 'File Soal';
        const iconFile = task.jenis_tugas === 'quiz' ? 'fa-file-csv text-green-600' : 'fa-file-pdf text-red-600';

        fileInfoHtml = `
            <div class="alert shadow-sm border border-gray-200 bg-gray-50 mb-4 p-3 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center rounded-xl">
                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
                        <i class="fa-solid ${iconFile} text-xl"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-xs truncate">${labelFile} Tersimpan</div>
                        <div class="text-[10px] text-gray-500 truncate">Klik lihat untuk preview/download</div>
                    </div>
                </div>
                <div class="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                    <a href="${streamUrl}" target="_blank" download class="btn btn-xs btn-outline flex-1 sm:flex-none">Download</a>
                    ${task.jenis_tugas === 'upload' ? `<button class="btn btn-xs btn-primary text-white flex-1 sm:flex-none" onclick="previewFile('${encodeURIComponent(rawPath)}')">Preview</button>` : ''}
                </div>
            </div>
        `;
    }
    els.previewArea.insertAdjacentHTML('beforeend', fileInfoHtml);

    // --- CONTENT PREVIEW ---
    if (task.jenis_tugas === 'quiz') {
        renderQuizTable(task);
    } else if (task.jenis_tugas === 'upload') {
        if (!task.file_soal && !task.deskripsi) {
            els.previewArea.insertAdjacentHTML('beforeend', `<div class="text-sm text-gray-400 italic text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">Tidak ada file soal maupun deskripsi.</div>`);
        }
    }
}

function renderQuizTable(task) {
    const soalList = task.soal_list || [];
    
    if (soalList.length === 0) {
        els.previewArea.insertAdjacentHTML('beforeend', `
            <div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                <i class="fa-solid fa-triangle-exclamation text-warning text-2xl mb-2"></i>
                <p class="text-sm font-bold text-gray-600">Soal belum ter-extract ke Database</p>
                <p class="text-xs text-gray-400 mt-1 max-w-xs mx-auto">File CSV mungkin sudah ada, tapi belum terbaca.</p>
                <button class="btn btn-xs btn-primary mt-3 shadow-md" onclick="openEditModal()">Upload Ulang CSV</button>
            </div>
        `);
        return;
    }

    let rows = soalList.map((s, i) => `
        <tr class="hover group">
            <th class="text-center text-gray-500 font-medium">${i+1}</th>
            <td class="text-xs">
                <div class="font-bold mb-2 text-gray-800 leading-snug">${s.pertanyaan}</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
                    <div class="p-1.5 rounded border ${s.kunci_jawaban=='a'?'bg-green-50 border-green-200 text-green-700 font-semibold shadow-sm':'border-gray-100 bg-white'}">A. ${s.pilihan_a}</div>
                    <div class="p-1.5 rounded border ${s.kunci_jawaban=='b'?'bg-green-50 border-green-200 text-green-700 font-semibold shadow-sm':'border-gray-100 bg-white'}">B. ${s.pilihan_b}</div>
                    <div class="p-1.5 rounded border ${s.kunci_jawaban=='c'?'bg-green-50 border-green-200 text-green-700 font-semibold shadow-sm':'border-gray-100 bg-white'}">C. ${s.pilihan_c}</div>
                    <div class="p-1.5 rounded border ${s.kunci_jawaban=='d'?'bg-green-50 border-green-200 text-green-700 font-semibold shadow-sm':'border-gray-100 bg-white'}">D. ${s.pilihan_d}</div>
                </div>
            </td>
        </tr>
    `).join('');

    els.previewArea.insertAdjacentHTML('beforeend', `
        <div class="overflow-x-auto max-h-[500px] border border-gray-200 rounded-xl bg-white shadow-sm custom-scrollbar">
            <table class="table table-xs table-pin-rows">
                <thead class="bg-gray-50 text-gray-500"><tr><th class="w-10">No</th><th>Pertanyaan & Kunci Jawaban</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `);
}

function renderSubmissions(subs) {
    els.submissionCount.innerText = subs.length;
    els.submissionBody.innerHTML = '';

    if(subs.length === 0) {
        els.submissionBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-400">Belum ada submission.</td></tr>`;
        return;
    }

    subs.forEach(s => {
        let btnAction = '-';
        if (s.file_download_url) {
            // Encode Raw Path
            const encodedPath = encodeURIComponent(s.file_download_url);
            btnAction = `<button class="btn btn-xs btn-outline btn-info" onclick="previewFile('${encodedPath}')"><i class="fa-solid fa-eye"></i></button>`;
        }

        const row = `
            <tr class="hover">
                <td>
                    <div class="font-bold text-sm text-gray-800">${s.siswa.nama}</div>
                    <div class="text-xs text-gray-400 font-mono">${s.siswa.nisn}</div>
                </td>
                <td><span class="badge badge-success badge-xs font-semibold px-2">Dikumpulkan</span></td>
                <td class="font-bold text-gray-700 text-center">${s.nilai_sekarang ?? '-'}</td>
                <td class="text-center">${btnAction}</td>
            </tr>
        `;
        els.submissionBody.insertAdjacentHTML('beforeend', row);
    });
}

// --- INTERACTION ---
function openEditModal() {
    if(!currentTask) return;

    els.editNama.value = currentTask.nama_tugas;
    els.editDeskripsi.value = currentTask.deskripsi || '';
    
    const d = new Date(currentTask.deadline);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    els.editDeadline.value = d.toISOString().slice(0,16);

    const fileInput = els.editFileContainer.querySelector('input[type="file"]');
    const labelFile = els.editFileContainer.querySelector('.label.font-semibold');
    const labelHelp = els.editFileContainer.querySelector('.label.text-xs');

    els.editFileContainer.classList.remove('hidden');

    if(currentTask.jenis_tugas === 'quiz') {
        labelFile.innerText = "Update File CSV Quiz (Opsional)";
        labelHelp.innerText = "Upload CSV baru untuk menimpa semua soal lama.";
        fileInput.accept = ".csv";
    } else {
        labelFile.innerText = "Update File Soal PDF/Gambar (Opsional)";
        labelHelp.innerText = "Upload file baru untuk mengganti file lama.";
        fileInput.accept = ".pdf,.jpg,.jpeg,.png";
    }

    els.modalEdit.showModal();
}

function setupEditForm() {
    els.formEdit.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(els.formEdit);
        const btn = els.formEdit.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        
        btn.disabled = true; btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_CONFIG.BASE_URL}/classes/tugas/${TASK_ID}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: fd
            });
            const result = await res.json();

            if(res.ok) {
                if(typeof showToast === 'function') showToast('Tugas Berhasil Diupdate', 'success');
                els.modalEdit.close();
                loadPageData(); 
            } else {
                if(typeof showToast === 'function') showToast(result.message || 'Gagal update', 'error');
            }
        } catch(err) {
            console.error(err);
            if(typeof showToast === 'function') showToast('Terjadi kesalahan', 'error');
        } finally {
            btn.disabled = false; btn.innerText = originalText;
        }
    }
}

// --- [UPDATE] PREVIEW FILE HELPER (STREAM API) ---
async function previewFile(encodedRawPath) {
    if (!els.previewContent) return;
    
    const rawPath = decodeURIComponent(encodedRawPath);
    
    // UI Loading
    els.previewContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 gap-3">
            <span class="loading loading-spinner loading-lg text-primary"></span> 
            <span class="text-sm text-gray-500 animate-pulse">Mengunduh & Memproses File...</span>
        </div>`;
    els.modalPreview.showModal();

    try {
        const token = localStorage.getItem('token');
        const apiUrl = `${API_CONFIG.BASE_URL}/files/stream?path=${encodeURIComponent(rawPath)}`;

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Gagal mengambil file stream");

        const originalBlob = await response.blob();
        
        // --- DETEKSI HEADER HEX ---
        const arrayBuffer = await originalBlob.slice(0, 4).arrayBuffer();
        const header = new Uint8Array(arrayBuffer);
        let headerHex = "";
        for (let i = 0; i < header.length; i++) {
            headerHex += header[i].toString(16).toUpperCase();
        }

        let finalType = '';
        if (headerHex.startsWith('25504446')) {
            finalType = 'application/pdf';
        } else if (headerHex.startsWith('FFD8FF')) {
            finalType = 'image/jpeg';
        } else if (headerHex.startsWith('89504E47')) {
            finalType = 'image/png';
        } else {
            finalType = originalBlob.type || 'application/octet-stream';
        }

        const fixedBlob = new Blob([originalBlob], { type: finalType });
        const objectUrl = URL.createObjectURL(fixedBlob);

        // --- RENDER CONTENT ---
        let content = '';
        if (finalType.startsWith('image/')) {
            content = `
                <div class="w-full h-full flex items-center justify-center bg-gray-900/5 rounded-lg overflow-hidden">
                    <img src="${objectUrl}" class="max-w-full max-h-full object-contain shadow-sm" alt="Preview">
                </div>
            `;
        } else if (finalType === 'application/pdf') {
            content = `
                <iframe src="${objectUrl}" class="w-full h-full border-0 rounded-lg bg-white shadow-inner"></iframe>
            `;
        } else {
            content = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300 m-4">
                    <i class="fa-solid fa-file-circle-question text-6xl mb-4 text-gray-300"></i>
                    <p class="font-semibold text-gray-600">Format tidak didukung preview</p>
                    <p class="text-xs mt-1">Header: ${headerHex}</p>
                </div>
            `;
        }

        els.previewContent.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex-1 overflow-hidden relative bg-gray-100 rounded-lg">
                    ${content}
                </div>
                <div class="flex justify-between items-center pt-4 px-1 shrink-0">
                    <div class="flex items-center gap-2">
                        <span class="badge badge-ghost badge-sm font-mono text-[10px]">${finalType}</span>
                        <span class="text-xs text-gray-400 hidden sm:inline">Size: ${(originalBlob.size/1024).toFixed(1)} KB</span>
                    </div>
                    <a href="${apiUrl}" target="_blank" download class="btn btn-primary btn-sm text-white shadow-md gap-2">
                        <i class="fa-solid fa-download"></i> <span class="hidden sm:inline">Download Asli</span>
                    </a>
                </div>
            </div>
        `;

    } catch (error) {
        console.error(error);
        els.previewContent.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-error bg-red-50 rounded-lg m-4 border border-red-100">
                <i class="fa-solid fa-circle-exclamation text-4xl mb-2"></i>
                <p class="font-bold">Gagal Memuat File</p>
                <p class="text-xs text-red-400 mt-1">${error.message}</p>
                <a href="${API_CONFIG.BASE_URL}/files/stream?path=${encodeURIComponent(rawPath)}" target="_blank" class="btn btn-xs btn-outline btn-error mt-4">Coba Link Langsung</a>
            </div>`;
    }
}