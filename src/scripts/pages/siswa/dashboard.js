import { getData } from '../../utils/api.js';

// --- DOM ELEMENTS ---
const els = {
    headerName: document.getElementById('headerName'),
    headerClass: document.getElementById('headerClass'),
    welcomeText: document.getElementById('welcomeText'),
    searchInput: document.getElementById('searchInput'),
    taskGrid: document.getElementById('taskGrid'),
    loadingState: document.getElementById('loadingState'),
    emptyState: document.getElementById('emptyState'),
    noClassState: document.getElementById('noClassState'),
    errorState: document.getElementById('errorState'),
    filterSection: document.getElementById('filterSection'),
    taskCount: document.getElementById('taskCount'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    errorMsg: document.getElementById('errorMsg')
};

// --- STATE ---
let allTasks = [];
let currentFilter = 'all';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const token = localStorage.getItem('token');
        if(!token) { window.location.href = '/'; return; }

        // 1. Ambil Profil
        const profileRes = await getData('/student/dashboard');
        if (profileRes.ok) {
            const { nama, kelas } = profileRes.data.data;
            
            // Tampilkan Nama & Kelas
            if(els.headerName) els.headerName.innerText = nama;
            if(els.headerClass) els.headerClass.innerText = kelas || "-";
            
            // Sapaan personal
            if(els.welcomeText) {
                const firstName = nama.split(' ')[0];
                els.welcomeText.innerText = `Halo, ${firstName}! 👋`;
            }
        } else if(profileRes.status === 401) {
            alert("Sesi habis."); window.location.href = '/'; return;
        }

        // 2. Ambil Tugas
        const taskRes = await getData('/student/tasks');

        if(els.loadingState) els.loadingState.classList.add('hidden');

        if (taskRes.ok) {
            allTasks = taskRes.data.data || [];
            if(els.filterSection) els.filterSection.classList.remove('hidden');
            renderTasks(allTasks);
        } else {
            // Handle Specific Errors
            if (taskRes.status === 400 && taskRes.data.message.includes("Belum masuk kelas")) {
                if(els.noClassState) {
                    els.noClassState.classList.remove('hidden');
                    els.noClassState.style.display = 'flex';
                }
                if(els.headerClass) els.headerClass.innerText = "Tanpa Kelas";
                if(els.filterSection) els.filterSection.classList.add('hidden');
            } else if (taskRes.status === 401) {
                window.location.href = '/';
            } else {
                if(els.errorState) {
                    els.errorState.classList.remove('hidden');
                    els.errorState.style.display = 'flex';
                }
                if(els.errorMsg) els.errorMsg.innerText = taskRes.data.message || "Kesalahan Server";
            }
        }
    } catch (error) {
        console.error(error);
        if(els.loadingState) els.loadingState.classList.add('hidden');
        if(els.errorState) {
            els.errorState.classList.remove('hidden');
            els.errorState.style.display = 'flex';
        }
    }
}

// --- RENDER LOGIC ---
function renderTasks(tasks) {
    els.taskGrid.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        els.taskGrid.classList.add('hidden');
        if(els.emptyState) {
            els.emptyState.classList.remove('hidden');
            els.emptyState.style.display = 'flex';
        }
        if(els.taskCount) els.taskCount.innerText = "0";
        return;
    }

    if(els.emptyState) els.emptyState.classList.add('hidden');
    els.taskGrid.classList.remove('hidden');
    if(els.taskCount) els.taskCount.innerText = `${tasks.length}`;

    tasks.forEach((task, index) => {
        const isQuiz = task.jenis_tugas === 'quiz';
        const isDone = task.status === 'Dikumpulkan';
        
        let iconClass = isQuiz ? 'fa-list-check' : 'fa-file-arrow-up';
        let iconBg = isQuiz ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700';
        let statusBadge = '';

        if (isDone) {
            iconClass = 'fa-check';
            iconBg = 'bg-emerald-100 text-emerald-700';
            statusBadge = `<div class="absolute top-3 right-3"><span class="badge badge-xs bg-emerald-500 border-none text-white shadow-md">Selesai</span></div>`;
        } else if (task.deadline && new Date() > new Date(task.deadline)) {
             iconBg = 'bg-red-100 text-red-700';
             statusBadge = `<div class="absolute top-3 right-3"><span class="badge badge-xs bg-red-500 border-none text-white shadow-md animate-pulse">Telat</span></div>`;
        }

        const dateStr = task.deadline 
            ? new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            : 'Tanpa Batas';

        const card = document.createElement('div');
        // Gunakan styling yang sama dengan Astro original
        card.className = "card bg-gray-50 shadow-sm border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer active:scale-95 group";
        card.style.animation = `fadeInUp 0.5s ease-out ${index * 0.05}s backwards`;
        
        card.onclick = () => window.location.href = `/siswa/tugas/${task.id}`;
        
        card.innerHTML = `
            <div class="card-body p-4 relative h-full flex flex-col justify-between">
                ${statusBadge}
                
                <div class="mb-2">
                    <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center text-lg mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    
                    <h4 class="font-bold text-gray-800 text-sm line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-primary transition-colors">
                        ${task.nama_tugas}
                    </h4>
                </div>
                
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <div class="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold bg-white px-2 py-1 rounded-md border border-gray-100">
                        <i class="fa-regular fa-clock"></i> ${dateStr}
                    </div>
                    <div class="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                        ${isQuiz ? 'QUIZ' : 'UPLOAD'}
                    </div>
                </div>
            </div>
        `;
        els.taskGrid.appendChild(card);
    });
}

// --- FILTER & SEARCH ---
function filterTasks() {
    const keyword = els.searchInput.value.toLowerCase();
    const filtered = allTasks.filter(task => {
        const matchName = task.nama_tugas.toLowerCase().includes(keyword);
        let matchType = true;
        if (currentFilter === 'pending') matchType = task.status !== 'Dikumpulkan';
        if (currentFilter === 'done') matchType = task.status === 'Dikumpulkan';
        return matchName && matchType;
    });
    renderTasks(filtered);
}

// Event Listeners
if(els.searchInput) {
    els.searchInput.addEventListener('input', filterTasks);
}

els.filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Reset style semua tombol
        els.filterBtns.forEach(b => {
            b.className = "btn btn-xs h-8 rounded-full px-5 font-medium bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all filter-btn";
        });
        
        // Aktifkan tombol yang diklik
        e.target.className = "btn btn-xs h-8 rounded-full px-5 font-bold shadow-md shadow-emerald-100 transition-all hover:shadow-lg filter-btn btn-primary text-white border-none transform scale-105";
        
        currentFilter = e.target.dataset.filter;
        filterTasks();
    });
});