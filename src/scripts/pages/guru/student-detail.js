import { getData, postData } from '../../utils/api.js';
import { API_CONFIG } from '../../config.js';

// --- STATE & CONSTANTS ---
const els = {
    main: document.getElementById('student-detail-main'),
    headerNama: document.getElementById('header-nama'),
    infoNama: document.getElementById('info-nama'),
    infoNisn: document.getElementById('info-nisn'),
    checklistContainer: document.getElementById('checklist-container'),
    inputUts: document.getElementById('input-uts'),
    inputUas: document.getElementById('input-uas'),
    btnSaveUjian: document.getElementById('btn-save-ujian'),
    tugasBody: document.getElementById('tugas-table-body'),
    formEditTugas: document.querySelector('#modal_edit_tugas form'),
    modalEditTugas: document.getElementById('modal_edit_tugas'),
    modalQuiz: document.getElementById('modal_preview_quiz'),
    quizContent: document.getElementById('quiz-preview-content'),
    editIdTugas: document.getElementById('edit-id-tugas'),
    editNilaiTugas: document.getElementById('edit-nilai-tugas'),
    labelNamaTugas: document.getElementById('label-nama-tugas')
};

let CLASS_ID = null;
let STUDENT_ID = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (els.main) {
        CLASS_ID = els.main.dataset.classId;
        STUDENT_ID = els.main.dataset.studentId;
        
        if (CLASS_ID && STUDENT_ID) {
            fetchStudentDetails();
            setupEventListeners();
        }
    }

    // Expose global functions for HTML onclick attributes
    window.showPreviewImage = showPreviewImage;
    window.loadQuizPreview = loadQuizPreview;
    window.openEditTugas = openEditTugas;
});

// --- FETCH DATA ---
async function fetchStudentDetails() {
    try {
        // 1. Info Siswa
        const classRes = await getData(`/classes/${CLASS_ID}/students`);
        if (classRes.ok) {
            const s = classRes.data.data.find(item => String(item.id) === String(STUDENT_ID));
            if (s) {
                els.headerNama.innerText = s.nama;
                els.infoNama.innerText = s.nama;
                els.infoNisn.innerText = s.nisn;
                
                els.headerNama.classList.remove('skeleton', 'w-48', 'h-8', 'rounded');
                els.infoNama.classList.remove('skeleton', 'h-5', 'w-40');
                els.infoNisn.classList.remove('skeleton', 'h-5', 'w-24');
            }
        }

        // 2. History Nilai & Tugas
        const histRes = await getData(`/classes/${CLASS_ID}/students/${STUDENT_ID}/history`);
        if (histRes.ok) {
            const data = histRes.data.data;
            const uts = data.ujian?.nilai_uts || '';
            const uas = data.ujian?.nilai_uas || '';
            const tugasList = data.tugas || [];

            els.inputUts.value = uts;
            els.inputUas.value = uas;

            renderTugasTable(tugasList);
            checkReadiness(uts, uas, tugasList);
        }
    } catch (error) {
        console.error(error);
        if(typeof showToast === 'function') showToast('Gagal memuat data siswa', 'error');
    }
}

// --- RENDER FUNCTIONS ---
function renderTugasTable(tugas) {
    els.tugasBody.innerHTML = '';
    
    if (tugas.length === 0) {
        els.tugasBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-400">Belum ada tugas.</td></tr>`;
        return;
    }

    tugas.forEach(t => {
        const namaTugas = t.tugas?.nama_tugas || 'Tugas';
        const jenisTugas = t.tugas?.jenis_tugas || 'upload';
        const submission = t.submission;
        const tugasId = t.tugas?.id;
        
        let nilaiDisplay = submission ? (t.nilai !== null ? t.nilai : '-') : '<span class="text-gray-400">-</span>';
        let statusText = submission ? '<div class="text-[10px] text-success">Sudah dikerjakan</div>' : '<div class="text-[10px] text-gray-400">Belum dikerjakan</div>';

        // Logic Tombol Preview
        let btnPreview = '-';
        if (submission) {
            const btnClass = "btn btn-xs btn-outline";
            const icon = '<i class="fa-solid fa-eye"></i>';
            const label = `<span class="hidden sm:inline ml-1">Lihat</span>`;

            if(jenisTugas === 'upload' && submission.file_url) {
                // --- PERBAIKAN DI SINI ---
                // HAPUS logika const serverUrl = ...
                // HAPUS logika const fullUrl = ...
                
                // Gunakan path mentah langsung dari database
                // Contoh: "C:/Users/Lenovo/AppData/Local/Temp/file.pdf"
                const rawPath = submission.file_url; 
                
                // Encode agar aman masuk ke HTML string (mengatasi spasi/karakter aneh)
                const encodedPath = encodeURIComponent(rawPath);
                
                btnPreview = `
                    <button class="${btnClass} btn-info" 
                        onclick="showPreviewImage(decodeURIComponent('${encodedPath}'))" 
                        title="Lihat File">
                        ${icon} ${label}
                    </button>`;
            } else if (jenisTugas === 'quiz') {
                const jawabanStr = encodeURIComponent(JSON.stringify(submission.jawaban_siswa || {}));
                btnPreview = `
                    <button class="${btnClass} btn-primary" onclick="loadQuizPreview('${tugasId}', '${jawabanStr}')" title="Review Jawaban">
                        ${icon} ${label}
                    </button>`;
            }
        }

        const safeNamaTugas = namaTugas.replace(/'/g, "\\'");

        const row = `
            <tr class="hover">
                <td>
                    <div class="font-medium text-gray-700 text-sm md:text-base">${namaTugas}</div>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] badge badge-ghost badge-sm uppercase">${jenisTugas}</span>
                        ${statusText}
                    </div>
                </td>
                <td class="text-center font-bold text-lg">${nilaiDisplay}</td>
                <td class="text-center">${btnPreview}</td>
                <td class="text-center">
                    <button class="btn btn-xs btn-ghost border border-gray-300 hover:bg-gray-100 tooltip" 
                            data-tip="Edit Nilai"
                            onclick="openEditTugas('${tugasId}', '${safeNamaTugas}', '${t.nilai || 0}')">
                        <i class="fa-solid fa-pen text-warning"></i>
                    </button>
                </td>
            </tr>
        `;
        els.tugasBody.insertAdjacentHTML('beforeend', row);
    });
}

function checkReadiness(uts, uas, tugas) {
    const checklist = [];
    const hasUts = uts !== '' && uts !== null && Number(uts) >= 0;
    checklist.push({ label: 'Nilai UTS', valid: hasUts, msg: hasUts ? 'OK' : 'Kosong' });

    const hasUas = uas !== '' && uas !== null && Number(uas) >= 0;
    checklist.push({ label: 'Nilai UAS', valid: hasUas, msg: hasUas ? 'OK' : 'Kosong' });

    const gradedTasks = tugas.filter(t => t.nilai !== null).length;
    const minTasks = 3;
    const hasEnoughTasks = gradedTasks >= minTasks;
    checklist.push({ label: `Min ${minTasks} Tugas`, valid: hasEnoughTasks, msg: `${gradedTasks}/${minTasks}` });

    renderChecklist(checklist);
}

function renderChecklist(items) {
    els.checklistContainer.innerHTML = '';
    items.forEach(item => {
        const icon = item.valid ? '<i class="fa-solid fa-circle-check text-success"></i>' : '<i class="fa-solid fa-circle-xmark text-error"></i>';
        const li = `<li class="flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100">
                        <div class="flex gap-2 items-center text-gray-700 font-medium">${icon} ${item.label}</div>
                        <span class="text-xs ${item.valid?'text-success':'text-error'}">${item.msg}</span>
                    </li>`;
        els.checklistContainer.insertAdjacentHTML('beforeend', li);
    });
}

// --- INTERACTION LOGIC ---

function setupEventListeners() {
    if (els.btnSaveUjian) {
        els.btnSaveUjian.onclick = async () => {
            els.btnSaveUjian.disabled = true;
            try {
                const res = await postData('/classes/nilai-ujian', {
                    id_kelas: CLASS_ID, 
                    id_siswa: STUDENT_ID,
                    nilai_uts: parseFloat(els.inputUts.value), 
                    nilai_uas: parseFloat(els.inputUas.value)
                });
                
                if(res.ok) { 
                    if(typeof showToast === 'function') showToast('Nilai Ujian Disimpan', 'success'); 
                    fetchStudentDetails(); 
                } else { 
                    if(typeof showToast === 'function') showToast(res.data.message, 'error'); 
                }
            } catch(e) { 
                if(typeof showToast === 'function') showToast('Terjadi kesalahan', 'error'); 
            } finally { 
                els.btnSaveUjian.disabled = false; 
            }
        };
    }

    if (els.formEditTugas) {
        els.formEditTugas.onsubmit = async (e) => {
            e.preventDefault();
            const btn = els.formEditTugas.querySelector('button');
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span>';

            try {
                const res = await postData('/classes/nilai-tugas', {
                    id_kelas: CLASS_ID, 
                    id_siswa: STUDENT_ID,
                    id_tugas: els.editIdTugas.value,
                    nilai: parseFloat(els.editNilaiTugas.value)
                });
                
                if(res.ok) { 
                    if(typeof showToast === 'function') showToast('Nilai Tugas Diupdate', 'success'); 
                    els.modalEditTugas.close(); 
                    fetchStudentDetails(); 
                } else { 
                    if(typeof showToast === 'function') showToast(res.data.message, 'error'); 
                }
            } catch(e) { 
                if(typeof showToast === 'function') showToast('Terjadi kesalahan', 'error'); 
            } finally { 
                btn.disabled = false; 
                btn.innerHTML = originalText;
            }
        };
    }
}

// --- GLOBAL HELPERS ---

function openEditTugas(id, nama, nilai) {
    els.editIdTugas.value = id;
    els.labelNamaTugas.innerText = nama;
    els.editNilaiTugas.value = nilai;
    els.modalEditTugas.showModal();
}

/**
 * REFACTOR UTAMA DI SINI
 * Logika preview yang lebih cerdas untuk membedakan PDF dan Gambar
 */
async function showPreviewImage(rawPath) { 
    // rawPath harusnya: "C:/Users/Lenovo/AppData/Local/Temp/..."
    
    els.modalQuiz.showModal();
    els.quizContent.innerHTML = '<div class="flex justify-center py-10"><span class="loading loading-spinner text-primary"></span> Memuat File...</div>';

    try {
        const token = localStorage.getItem('token');
        
        // Panggil endpoint stream dengan raw path yang di-encode
        const apiUrl = `${API_CONFIG.BASE_URL}/files/stream?path=${encodeURIComponent(rawPath)}`;

        // Debugging (Cek di Console Browser)
        console.log("Request Stream URL:", apiUrl);

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Gagal mengambil file (Pastikan backend fileRoutes sudah terpasang)");

        const originalBlob = await response.blob();
        
        // --- DETEKSI TIPE MAGIC NUMBER ---
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

        // --- RENDER ---
        let content = '';
        if (finalType.startsWith('image/')) {
            content = `<div class="relative w-full h-[75vh] flex items-center justify-center bg-gray-900/5 rounded-lg">
                        <img src="${objectUrl}" class="max-w-full max-h-full object-contain shadow-sm" alt="Preview">
                       </div>`;
        } else if (finalType === 'application/pdf') {
            content = `<iframe src="${objectUrl}" class="w-full h-[75vh] border-0 rounded-lg bg-gray-100"></iframe>`;
        } else {
            content = `<div class="flex flex-col items-center justify-center h-64 text-gray-400">
                        <i class="fa-solid fa-file-circle-question text-6xl mb-4 text-gray-300"></i>
                        <p class="font-semibold text-gray-600">Format tidak didukung preview</p>
                       </div>`;
        }

        els.quizContent.innerHTML = `
            <div class="flex flex-col gap-4 h-full">
                <div class="flex-1 overflow-hidden min-h-[300px]">
                    ${content}
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-gray-100 shrink-0">
                    <div class="text-xs text-gray-400">Type: ${finalType}</div>
                    <a href="${apiUrl}" target="_blank" download class="btn btn-primary btn-sm text-white w-full sm:w-auto shadow-md gap-2">
                        <i class="fa-solid fa-download"></i> Download Asli
                    </a>
                </div>
            </div>
        `;

    } catch (error) {
        console.error(error);
        els.quizContent.innerHTML = `<div class="alert alert-error">Gagal memuat file: ${error.message}</div>`;
    }
}

async function loadQuizPreview(tugasId, jawabanStr) {
    els.modalQuiz.showModal();
    els.quizContent.innerHTML = '<div class="flex justify-center py-10"><span class="loading loading-spinner"></span></div>';
    
    try {
        const res = await getData(`/student/tasks/${tugasId}`); 
        
        if (res.ok && res.data.data.soal) {
            const soalList = res.data.data.soal;
            const jawabanSiswa = JSON.parse(decodeURIComponent(jawabanStr));
            renderQuizReview(soalList, jawabanSiswa);
        } else {
            els.quizContent.innerHTML = `<div class="alert alert-error">Gagal memuat soal.</div>`;
        }
    } catch(e) {
        els.quizContent.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
}

function renderQuizReview(soalList, jawabanSiswa) {
    els.quizContent.innerHTML = '';
    
    if(soalList.length === 0) {
        els.quizContent.innerHTML = '<p class="text-center text-gray-400">Tidak ada data soal.</p>';
        return;
    }

    soalList.forEach((q, index) => {
        const jawab = jawabanSiswa[q.id]; 
        const jawabText = jawab ? q['pilihan_' + jawab] : 'Tidak dijawab';
        
        const card = document.createElement('div');
        card.className = "card bg-white border border-gray-200 p-4 rounded-xl shadow-sm";
        
        card.innerHTML = `
            <div class="flex gap-3 mb-2">
                <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${index + 1}</span>
                <div class="w-full">
                    <p class="text-gray-800 font-medium mb-3 text-sm">${q.pertanyaan}</p>
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p class="text-[10px] text-gray-400 uppercase font-bold mb-1">Jawaban Siswa (${jawab ? jawab.toUpperCase() : '-'}):</p>
                        <p class="text-sm text-gray-700 font-medium">${jawabText}</p>
                    </div>
                </div>
            </div>
        `;
        els.quizContent.appendChild(card);
    });
}