import { getData, postData, deleteData } from '../../utils/api.js';
import { API_CONFIG } from '../../config.js';
import Papa from 'papaparse';

// State Management
let classesData = [];
let allTasks = [];
let quizBlob = null; 

document.addEventListener('DOMContentLoaded', () => {
    loadClasses();
    setupForms();
    setupQuizLogic();
    setupFilters();
});

// --- GLOBAL FUNCTIONS (Attached to Window for HTML onclick) ---

window.switchTab = (tabName) => {
    const btnKelas = document.getElementById('btn-tab-kelas');
    const btnTugas = document.getElementById('btn-tab-tugas');
    const contentKelas = document.getElementById('content-kelas');
    const contentTugas = document.getElementById('content-tugas');

    const activeClass = "shadow-sm bg-white text-primary font-bold";
    const inactiveClass = "text-gray-500 hover:text-gray-700 font-medium";

    if(tabName === 'kelas') {
        btnKelas.className = `px-6 py-2 rounded-full text-sm transition-all duration-300 ${activeClass}`;
        btnTugas.className = `px-6 py-2 rounded-full text-sm transition-all duration-300 ${inactiveClass}`;
        contentKelas.classList.remove('hidden');
        contentTugas.classList.add('hidden');
    } else {
        btnKelas.className = `px-6 py-2 rounded-full text-sm transition-all duration-300 ${inactiveClass}`;
        btnTugas.className = `px-6 py-2 rounded-full text-sm transition-all duration-300 ${activeClass}`;
        contentKelas.classList.add('hidden');
        contentTugas.classList.remove('hidden');
    }
};

window.openModalTask = () => {
    const form = document.getElementById('form-create-task');
    if(form) form.reset();
    
    window.toggleTaskType('upload');
    
    const preview = document.getElementById('quiz-preview');
    if(preview) preview.classList.add('hidden');
    
    quizBlob = null;
    
    const modal = document.getElementById('modal_create_task');
    if(modal) modal.showModal();
};

window.toggleTaskType = (type) => {
    const sectionUpload = document.getElementById('section-upload');
    const sectionQuiz = document.getElementById('section-quiz');

    if(type === 'upload') {
        if(sectionUpload) sectionUpload.classList.remove('hidden');
        if(sectionQuiz) sectionQuiz.classList.add('hidden');
    } else {
        if(sectionUpload) sectionUpload.classList.add('hidden');
        if(sectionQuiz) sectionQuiz.classList.remove('hidden');
    }
};

window.downloadQuizTemplate = (e) => {
    e.preventDefault();
    const csv = "pertanyaan,a,b,c,d,kunci\nIbukota Indonesia?,Jakarta,Bandung,Surabaya,Medan,a\n1+1=?,2,3,4,5,a";
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a'); 
    a.href = window.URL.createObjectURL(blob); 
    a.download = 'template_quiz.csv'; 
    a.click();
};

// --- FUNGSI HAPUS KELAS DIHAPUS (GURU READ ONLY) ---

window.handleDeleteTask = async (id, nama) => {
    if(confirm(`Hapus tugas "${nama}"?`)) {
        try {
            const res = await deleteData(`/classes/tugas/${id}`);
            if(res.ok) { 
                loadAllTasks(classesData); 
                showToast('Tugas Berhasil Dihapus', 'success');
            } else {
                showToast(res.data.message || 'Gagal', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan saat menghapus', 'error');
        }
    }
};

// --- DATA LOADERS ---

async function loadClasses() {
    try {
        const res = await getData('/classes');
        const tbody = document.getElementById('table-kelas-body');
        const selectTask = document.getElementById('select-kelas-tugas');
        const filterTask = document.getElementById('filter-kelas-tugas');
        const emptyState = document.getElementById('empty-kelas');
        
        if (!tbody) return;

        tbody.innerHTML = '';
        if(selectTask) selectTask.innerHTML = '<option value="" disabled selected>-- Pilih Kelas --</option>';
        if(filterTask) filterTask.innerHTML = '<option value="all">Semua Kelas</option>';

        if (res.ok && res.data.data && res.data.data.length > 0) {
            classesData = res.data.data;
            if(emptyState) emptyState.classList.add('hidden');

            classesData.forEach((c, i) => {
                // Populate Table - TANPA TOMBOL DELETE
                tbody.insertAdjacentHTML('beforeend', `
                    <tr class="hover group transition-colors">
                        <th class="text-center text-gray-500">${i+1}</th>
                        <td><div class="font-bold text-gray-800">${c.nama_kelas}</div></td>
                        <td class="font-mono text-gray-500 text-xs">${c.tahun_ajaran}</td>
                        <td class="text-center"><span class="badge badge-sm badge-ghost font-medium">${c.jumlah_siswa || 0} Siswa</span></td>
                        <td class="text-center"><span class="badge badge-sm badge-ghost font-medium">${c.jumlah_tugas || 0} Tugas</span></td>
                        </tr>
                `);
                
                // Populate Select Options
                const optionHTML = `<option value="${c.id}">${c.nama_kelas}</option>`;
                if(selectTask) selectTask.insertAdjacentHTML('beforeend', optionHTML);
                if(filterTask) filterTask.insertAdjacentHTML('beforeend', optionHTML);
            });
            
            loadAllTasks(classesData);
        } else {
            if(emptyState) emptyState.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Failed loading classes", error);
    }
}

async function loadAllTasks(classes) {
    const container = document.getElementById('task-list-container');
    if(!container) return;

    allTasks = [];
    container.innerHTML = '<div class="col-span-full py-20 flex justify-center"><span class="loading loading-spinner loading-md text-primary"></span></div>';

    try {
        // Fetch tasks for all classes in parallel
        const promises = classes.map(c => getData(`/classes/${c.id}/tugas`));
        const results = await Promise.all(promises);

        results.forEach((res, idx) => {
            if(res.ok && res.data.data) {
                const tasksWithClassInfo = res.data.data.map(t => ({
                    ...t,
                    nama_kelas: classes[idx].nama_kelas,
                    id_kelas: classes[idx].id
                }));
                allTasks = [...allTasks, ...tasksWithClassInfo];
            }
        });
        renderTasks(allTasks);
    } catch(e) { 
        console.error(e); 
        container.innerHTML = '<div class="col-span-full text-center text-error">Gagal memuat tugas.</div>';
    }
}

function renderTasks(tasks) {
    const container = document.getElementById('task-list-container');
    const emptyState = document.getElementById('empty-tugas');
    
    if(!container) return;
    container.innerHTML = '';
    
    if(!tasks || tasks.length === 0) {
        if(emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    if(emptyState) emptyState.classList.add('hidden');
    
    // Sort by deadline descending (terbaru diatas)
    tasks.sort((a,b) => new Date(b.deadline) - new Date(a.deadline));

    tasks.forEach(t => {
        const isQuiz = t.jenis_tugas === 'quiz';
        const typeBadge = isQuiz 
            ? '<span class="badge badge-warning text-xs gap-1"><i class="fa-solid fa-list-ol"></i> Quiz</span>' 
            : '<span class="badge badge-primary text-white text-xs gap-1"><i class="fa-solid fa-upload"></i> Upload</span>';
        
        const dateObj = new Date(t.deadline);
        const isLate = new Date() > dateObj;
        const statusColor = isLate ? 'text-error' : 'text-gray-500';

        // Escape helper untuk nama tugas yang mungkin mengandung karakter aneh
        const safeName = t.nama_tugas.replace(/'/g, "\\'"); 

        const card = `
            <div class="card bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 group">
                <div class="card-body p-5">
                    <div class="flex justify-between items-start mb-2">
                        ${typeBadge}
                        <div class="dropdown dropdown-end">
                            <label tabindex="0" class="btn btn-circle btn-ghost btn-xs text-gray-400"><i class="fa-solid fa-ellipsis-vertical"></i></label>
                            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-gray-100">
                                <li><a href="/guru/kelas/${t.id_kelas}/tugas/${t.id}" class="text-xs">Detail</a></li>
                                <li><a onclick="handleDeleteTask('${t.id}', '${safeName}')" class="text-xs text-error">Hapus</a></li>
                            </ul>
                        </div>
                    </div>
                    <h2 class="card-title text-base font-bold text-gray-800 line-clamp-2 min-h-[3rem] mb-1 leading-snug">${t.nama_tugas}</h2>
                    <div class="text-xs text-gray-500 mb-4 flex items-center gap-1">
                        <i class="fa-solid fa-chalkboard-user"></i> Kelas: <span class="font-semibold text-gray-700">${t.nama_kelas}</span>
                    </div>
                    <div class="pt-3 border-t border-gray-100 flex justify-between items-center mt-auto">
                        <div class="flex flex-col">
                            <span class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Deadline</span>
                            <span class="text-xs font-medium ${statusColor} flex items-center gap-1">
                                <i class="fa-regular fa-clock"></i> ${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                            </span>
                        </div>
                        <a href="/guru/kelas/${t.id_kelas}/tugas/${t.id}" class="btn btn-sm btn-ghost bg-gray-50 hover:bg-primary hover:text-white transition-colors">Lihat <i class="fa-solid fa-arrow-right text-xs"></i></a>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

// --- LOGIC SETUP ---

function setupForms() {
    // 1. Form Create Task
    const formTask = document.getElementById('form-create-task');
    if (formTask) {
        formTask.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const fd = new FormData(formTask);
            const data = Object.fromEntries(fd);
            const btn = document.getElementById('btn-submit-task');
            const originalBtnText = btn.innerHTML;
            
            // Validasi Client Side
            if(data.jenis_tugas === 'upload') {
                const file = fd.get('file_soal');
                const hasFile = file && file.size > 0;
                if(!data.deskripsi && !hasFile) return showToast('Wajib isi Deskripsi atau Upload Soal!', 'warning');
            } else if(data.jenis_tugas === 'quiz' && !quizBlob) {
                return showToast('Upload File CSV Quiz Terlebih Dahulu!', 'warning');
            }

            // UI Loading
            btn.disabled = true; 
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Menyimpan...';

            try {
                const token = localStorage.getItem('token');
                const payload = new FormData();
                payload.append('id_kelas', data.id_kelas);
                payload.append('nama_tugas', data.nama_tugas);
                payload.append('jenis_tugas', data.jenis_tugas);
                payload.append('deadline', data.deadline);
                if(data.deskripsi) payload.append('deskripsi', data.deskripsi);
                
                // Handle File Upload Soal
                if(data.jenis_tugas === 'upload' && fd.get('file_soal').size > 0) {
                    payload.append('file_soal', fd.get('file_soal'));
                }

                // 1. Create Task Base
                const resTask = await fetch(`${API_CONFIG.BASE_URL}/classes/tugas`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: payload
                });
                
                const resultTask = await resTask.json();

                if(resTask.ok) {
                    const taskId = resultTask.data.id;
                    
                    // 2. If Quiz, Import Questions
                    if(data.jenis_tugas === 'quiz' && taskId && quizBlob) {
                        btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Mengupload Soal...';
                        const qfd = new FormData(); 
                        qfd.append('file', quizBlob);
                        
                        const resQuiz = await fetch(`${API_CONFIG.BASE_URL}/classes/tugas/${taskId}/import-quiz`, {
                            method:'POST', 
                            headers:{'Authorization':`Bearer ${token}`}, 
                            body:qfd
                        });
                        
                        if(!resQuiz.ok) throw new Error("Gagal mengimport soal quiz");
                    }

                    showToast('Tugas Berhasil Dibuat & Didistribusikan!', 'success');
                    document.getElementById('modal_create_task').close();
                    loadAllTasks(classesData); // Refresh
                } else {
                    showToast(resultTask.message || 'Gagal membuat tugas', 'error');
                }
            } catch(err){ 
                console.error(err); 
                showToast('Terjadi kesalahan sistem', 'error');
            } finally { 
                btn.disabled = false; 
                btn.innerHTML = originalBtnText;
            }
        });
    }

    // LISTENER FORM CREATE CLASS DIHAPUS KARENA SUDAH TIDAK ADA HTML-NYA
}

function setupQuizLogic() {
    const fileInput = document.getElementById('file-quiz-csv');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; 
            if(!file) return;
            
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (res) => {
                    const rows = res.data;
                    const tbody = document.getElementById('quiz-preview-body');
                    const previewContainer = document.getElementById('quiz-preview');
                    
                    if(tbody) tbody.innerHTML = '';
                    
                    if(rows.length > 0) {
                        if(previewContainer) previewContainer.classList.remove('hidden');
                        
                        const previewRows = rows.slice(0, 5);
                        previewRows.forEach((r, i) => {
                            // Support berbagai format header (case insensitive sort of)
                            const soal = r.pertanyaan || r.Pertanyaan || '-';
                            const kunci = r.kunci || r.Kunci || r.jawaban || '-';
                            
                            tbody.insertAdjacentHTML('beforeend', `
                                <tr>
                                    <td class="text-center">${i+1}</td>
                                    <td class="whitespace-normal min-w-[200px]">${soal}</td>
                                    <td class="font-bold text-success uppercase text-center">${kunci}</td>
                                </tr>
                            `);
                        });
                        quizBlob = file; 
                    } else {
                        showToast('File CSV Kosong atau Format Salah', 'warning');
                        quizBlob = null;
                        if(previewContainer) previewContainer.classList.add('hidden');
                    }
                },
                error: () => showToast('Gagal membaca CSV', 'error')
            });
        });
    }
}

function setupFilters() {
    // Search Kelas
    const searchKelas = document.getElementById('search-kelas');
    if(searchKelas) {
        searchKelas.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#table-kelas-body tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    // Filter & Search Tugas
    const filterSelect = document.getElementById('filter-kelas-tugas');
    const searchTugas = document.getElementById('search-tugas');
    
    const applyTaskFilter = () => {
        const classId = filterSelect ? filterSelect.value : 'all';
        const term = searchTugas ? searchTugas.value.toLowerCase() : '';

        const filtered = allTasks.filter(t => {
            const matchClass = classId === 'all' || t.id_kelas == classId;
            const matchText = t.nama_tugas.toLowerCase().includes(term);
            return matchClass && matchText;
        });
        
        renderTasks(filtered);
    };

    if(filterSelect) filterSelect.addEventListener('change', applyTaskFilter);
    if(searchTugas) searchTugas.addEventListener('keyup', applyTaskFilter);
}