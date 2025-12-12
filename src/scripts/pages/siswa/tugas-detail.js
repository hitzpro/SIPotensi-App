import { getData } from '../../utils/api.js';
import { API_CONFIG } from '../../config.js';

// --- DOM ELEMENTS ---
const els = {
    taskId: document.getElementById('taskId'),
    loading: document.getElementById('loadingState'),
    detailSection: document.getElementById('detailSection'),
    quizSection: document.getElementById('quizSection'),
    uploadSection: document.getElementById('uploadSection'),
    
    // Header & Info
    headerTitle: document.getElementById('headerTitle'),
    taskTitle: document.getElementById('taskTitle'),
    taskDesc: document.getElementById('taskDesc'),
    taskTypeBadge: document.getElementById('taskTypeBadge'),
    taskDeadline: document.getElementById('taskDeadline'),
    
    // Actions & Alerts
    btnBack: document.getElementById('btnBack'),
    btnStart: document.getElementById('btnStart'),
    actionContainer: document.getElementById('actionContainer'),
    deadlineAlert: document.getElementById('deadlineAlert'),
    
    // History
    historySection: document.getElementById('historySection'),
    historyDate: document.getElementById('historyDate'),
    historyScore: document.getElementById('historyScore'),
    uploadFeedback: document.getElementById('uploadFeedback'),
    
    // Quiz Elements
    questionsContainer: document.getElementById('questionsContainer'),
    quizProgress: document.getElementById('quizProgress'),
    btnSubmitQuiz: document.getElementById('btnSubmitQuiz'),
    
    // Upload Elements
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    filePreview: document.getElementById('filePreview'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    btnRemoveFile: document.getElementById('btnRemoveFile'),
    btnSubmitUpload: document.getElementById('btnSubmitUpload'),
};

// --- STATE ---
let taskData = null;
let quizAnswers = {};
let selectedFile = null;
let isWorking = false; 

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (els.taskId) {
        init();
        setupEventListeners();
    }
    
    // Expose global function for HTML event attributes (onchange="handleAnswer...")
    window.handleAnswer = handleAnswer;
});

async function init() {
    try {
        const id = els.taskId.value;
        const res = await getData(`/student/tasks/${id}`);
        
        if (res.ok) {
            taskData = res.data.data;
            renderDetail();
        } else {
            if(typeof showToast === 'function') showToast("Gagal memuat tugas.", "error");
            setTimeout(() => window.location.href = '/siswa', 1000);
        }
    } catch (error) {
        console.error(error);
        if(typeof showToast === 'function') showToast("Error koneksi.", "error");
    } finally {
        els.loading.classList.add('hidden');
    }
}

// --- RENDER LOGIC ---
function renderDetail() {
    els.detailSection.classList.remove('hidden');
    els.detailSection.classList.add('flex');
    
    // Basic Info
    els.headerTitle.innerText = taskData.nama_tugas;
    els.taskTitle.innerText = taskData.nama_tugas;
    els.taskDesc.innerText = taskData.deskripsi || "Tidak ada deskripsi.";
    
    // Badge & Button Label
    if (taskData.jenis_tugas === 'quiz') {
        els.taskTypeBadge.innerText = "QUIZ";
        els.btnStart.innerHTML = '<i class="fa-solid fa-list-ol"></i> Mulai Quiz';
    } else {
        els.taskTypeBadge.innerText = "UPLOAD";
        els.btnStart.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Tugas';
    }

    // Logic Deadline & Status
    const isSubmitted = taskData.submission !== null;
    let isLate = false;

    if(taskData.deadline) {
        const date = new Date(taskData.deadline);
        els.taskDeadline.innerText = `Deadline: ${date.toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}`;
        
        if (!isSubmitted && new Date() > date) {
            isLate = true;
            els.taskDeadline.classList.add('text-red-500', 'bg-red-50', 'border-red-100');
            els.taskDeadline.innerHTML += ' <span class="font-bold ml-1">(Berakhir)</span>';
        }
    } else {
        els.taskDeadline.innerText = "Tanpa Batas Waktu";
    }

    // UI Decision
    if (isSubmitted) {
        els.btnStart.classList.add('hidden');
        els.deadlineAlert.classList.add('hidden');
        renderHistory(taskData.submission);
    } else if (isLate) {
        els.btnStart.classList.add('hidden');
        els.deadlineAlert.classList.remove('hidden');
    } else {
        els.btnStart.disabled = false;
    }
}

function renderHistory(submission) {
    els.historySection.classList.remove('hidden');
    
    const date = new Date(submission.tanggal_kumpul);
    els.historyDate.innerText = date.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
    });

    if (taskData.jenis_tugas === 'quiz') {
        els.historyScore.innerText = submission.nilai !== null ? submission.nilai : '0';
    } else {
        els.uploadFeedback.classList.remove('hidden');
        if (submission.nilai !== null) {
            els.historyScore.innerText = submission.nilai;
        } else {
            els.historyScore.innerText = "Menunggu Penilaian";
            els.historyScore.className = "text-sm font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded";
        }
    }
}

// --- QUIZ LOGIC ---
function startQuiz() {
    els.quizSection.classList.remove('hidden'); 
    els.quizSection.classList.add('flex');
    
    const questions = taskData.soal || [];
    els.questionsContainer.innerHTML = '';
    els.quizProgress.innerText = `0 / ${questions.length}`;

    questions.forEach((q, index) => {
        const qEl = document.createElement('div');
        qEl.className = "card bg-white border border-gray-200 p-4 rounded-xl shadow-sm";
        qEl.innerHTML = `
            <div class="flex gap-3 mb-3">
                <span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${index + 1}</span>
                <p class="text-gray-800 font-medium leading-relaxed">${q.pertanyaan}</p>
            </div>
            <div class="flex flex-col gap-2 ml-9">
                ${renderOption(q.id, 'a', q.pilihan_a)}
                ${renderOption(q.id, 'b', q.pilihan_b)}
                ${renderOption(q.id, 'c', q.pilihan_c)}
                ${renderOption(q.id, 'd', q.pilihan_d)}
            </div>
        `;
        els.questionsContainer.appendChild(qEl);
    });
}

function renderOption(qId, key, text) {
    if (!text) return '';
    return `
        <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all has-[:checked]:bg-blue-50 has-[:checked]:border-blue-200">
            <input type="radio" name="q_${qId}" value="${key}" class="radio radio-primary radio-sm" onchange="handleAnswer('${qId}', '${key}')" />
            <span class="text-sm text-gray-600">${key.toUpperCase()}. ${text}</span>
        </label>
    `;
}

function handleAnswer(qId, val) {
    quizAnswers[qId] = val;
    const total = taskData.soal.length;
    const answered = Object.keys(quizAnswers).length;
    els.quizProgress.innerText = `${answered} / ${total}`;
}

// --- UPLOAD LOGIC ---
function startUpload() {
    els.uploadSection.classList.remove('hidden'); 
    els.uploadSection.classList.add('flex');
}

function handleFileSelect(file) {
    if(!file) return;
    
    if(file.size > 5*1024*1024) { 
        if(typeof showToast === 'function') showToast("Max file 5MB", "error"); 
        return; 
    }
    
    selectedFile = file;
    els.fileName.innerText = file.name;
    els.fileSize.innerText = (file.size/1024/1024).toFixed(2) + " MB";
    
    els.dropZone.classList.add('hidden'); 
    els.filePreview.classList.remove('hidden');
    els.btnSubmitUpload.disabled = false;
}

// --- SUBMISSION HANDLER ---
async function doSubmit(body, headers, type) {
    const token = localStorage.getItem('token');
    const taskId = els.taskId.value;
    
    try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/student/tasks/${taskId}/submit`, {
            method: 'POST',
            headers: { ...headers, 'Authorization': `Bearer ${token}` },
            body: body
        });
        const result = await res.json();
        
        isWorking = false; // Matikan navigation guard
        
        if(res.ok) {
            if(type === 'quiz') {
                if(typeof showConfirm === 'function') {
                    await showConfirm(
                        'Selesai', 
                        `Nilai Anda: <br><span class="text-4xl text-primary font-bold">${result.nilai}</span>`, 
                        'OK', 
                        'success'
                    );
                }
            } else {
                if(typeof showToast === 'function') showToast('Tugas berhasil dikirim', 'success');
                await new Promise(r => setTimeout(r, 1000));
            }
            window.location.reload(); 
        } else {
            if(typeof showToast === 'function') showToast(result.message || 'Gagal mengirim', 'error');
            isWorking = true; // Nyalakan lagi jika gagal
        }
    } catch(e) { 
        console.error(e);
        if(typeof showToast === 'function') showToast('Kesalahan Jaringan', 'error');
        isWorking = true;
    }
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
    // Navigation Guard (Prevent accidental exit)
    window.addEventListener('beforeunload', (e) => {
        if (isWorking) { e.preventDefault(); e.returnValue = ''; }
    });

    els.btnBack.addEventListener('click', async () => {
        if (isWorking) {
            const confirmLeave = await showConfirm('Batalkan?', 'Progres Anda akan <b>HILANG</b> jika keluar sekarang.', 'Keluar', 'danger');
            if (!confirmLeave) return;
        }
        window.location.href = '/siswa';
    });

    els.btnStart.addEventListener('click', () => {
        isWorking = true;
        els.detailSection.classList.add('hidden');
        if (taskData.jenis_tugas === 'quiz') startQuiz();
        else startUpload();
    });

    // Quiz Submit
    els.btnSubmitQuiz.addEventListener('click', async () => {
        const answered = Object.keys(quizAnswers).length;
        const total = taskData.soal.length;
        
        if(answered < total) {
            const ok = await showConfirm('Belum Selesai', `Anda baru menjawab <b>${answered} dari ${total}</b> soal. Yakin ingin mengumpulkan?`, 'Ya, Kumpul', 'warning');
            if(!ok) return;
        } else {
            const ok = await showConfirm('Kumpulkan?', 'Pastikan semua jawaban sudah benar.', 'Kumpulkan', 'primary');
            if(!ok) return;
        }
        
        const payload = JSON.stringify({ jenis_pengerjaan: 'quiz', jawaban_siswa: quizAnswers });
        doSubmit(payload, {'Content-Type':'application/json'}, 'quiz');
    });

    // Upload Events
    els.fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    
    // Drag & Drop Visuals
    els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropZone.classList.add('bg-blue-50'); });
    els.dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); els.dropZone.classList.remove('bg-blue-50'); });
    els.dropZone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        els.dropZone.classList.remove('bg-blue-50'); 
        handleFileSelect(e.dataTransfer.files[0]); 
    });

    els.btnRemoveFile.addEventListener('click', () => {
        selectedFile = null; 
        els.fileInput.value = '';
        els.dropZone.classList.remove('hidden'); 
        els.filePreview.classList.add('hidden');
        els.btnSubmitUpload.disabled = true;
    });

    els.btnSubmitUpload.addEventListener('click', async () => {
        const ok = await showConfirm('Kirim Tugas?', `File: <b>${selectedFile.name}</b>`, 'Kirim', 'primary');
        if(ok) {
            const fd = new FormData();
            fd.append('jenis_pengerjaan', 'upload');
            fd.append('file', selectedFile);
            // Jangan set Content-Type header manual untuk FormData
            doSubmit(fd, {}, 'upload');
        }
    });
}