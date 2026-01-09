import { getData } from '../../utils/api.js';

// --- DOM ELEMENTS ---
const els = {
    gridContainer: document.getElementById('class-grid'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    
    // Stats
    statTotalKelas: document.getElementById('stat-total-kelas'),
    statTotalSiswa: document.getElementById('stat-total-siswa'),
    statIncomplete: document.getElementById('stat-incomplete'),
};

// --- STATE ---
let allClasses = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (els.gridContainer) {
        loadDashboardData();
        setupEventListeners();
    }
});

// --- DATA LOADING ---
async function loadDashboardData() {
    try {
        // 1. Load Summary Stats
        const summaryRes = await getData('/dashboard/summary'); 
        if (summaryRes.ok && summaryRes.data.status === 'success') {
            updateStatsUI(summaryRes.data.data);
        }

        // 2. Load Class List
        // Menggunakan endpoint summary karena di controller summary juga mengembalikan daftar kelas
        // Atau kamu bisa buat endpoint khusus list kelas, tapi logic summary tadi sudah mengambil list kelas.
        // Agar konsisten, kita ambil dari dashboard summary saja (karena controller summary sudah hitung array classes)
        // TAPI: Dashboard Controller summary hanya return jumlah. 
        // JADI: Kita butuh endpoint khusus getMyClasses di classController atau pakai data kelas dari logic summary tadi kalau mau diedit.
        
        // Agar aman, kita pakai endpoint: GET /api/classes (yang mengarah ke classController.getMyClasses)
        // Pastikan Backend classController.getMyClasses logic-nya SAMA dengan DashboardModel.getClassesByGuru
        const classesRes = await getData('/classes'); 
        
        if (classesRes.ok && classesRes.data.status === 'success') {
            // Backend classController harusnya return { status: 'success', data: [...] }
            allClasses = classesRes.data.data; 
            renderClassList(allClasses);
        } else {
            renderClassList([]);
        }

    } catch (error) {
        console.error("Dashboard Load Error:", error);
    }
}

// --- RENDER FUNCTIONS ---
function updateStatsUI(data) {
    if(els.statTotalKelas) els.statTotalKelas.innerText = data.total_kelas || 0;
    if(els.statTotalSiswa) els.statTotalSiswa.innerText = data.total_siswa || 0;
    if(els.statIncomplete) els.statIncomplete.innerText = data.notifikasi_incomplete || 0;
}

function renderClassList(dataKelas) {
    els.gridContainer.innerHTML = ''; 

    if (!dataKelas || dataKelas.length === 0) {
        els.gridContainer.classList.add('hidden');
        els.emptyState.classList.remove('hidden');
        els.emptyState.classList.add('flex');
        return;
    }

    els.gridContainer.classList.remove('hidden');
    els.emptyState.classList.add('hidden');
    els.emptyState.classList.remove('flex');

    dataKelas.forEach(kelas => {
        // Hapus tombol Delete, Hapus tombol Edit, Sisakan tombol Masuk Kelas
        const cardHTML = `
            <div class="card bg-base-100 shadow-md hover:shadow-2xl transition-all duration-300 border border-base-200 group overflow-hidden">
                <div class="card-body p-0">
                    <div class="relative bg-gradient-to-br from-primary to-emerald-600 p-6 text-white text-center overflow-hidden">
                        <i class="fa-solid fa-graduation-cap absolute -right-6 -top-6 text-8xl text-white opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500"></i>
                        <i class="fa-solid fa-shapes absolute -left-4 -bottom-4 text-6xl text-white opacity-10"></i>

                        <h2 class="card-title justify-center text-xl font-bold mb-2 relative z-10 drop-shadow-sm">
                            ${kelas.nama_kelas}
                        </h2>
                        <div class="badge bg-white/20 border-0 text-white text-xs font-semibold backdrop-blur-sm relative z-10">
                            ${kelas.tahun_ajaran}
                        </div>
                    </div>

                    <div class="p-5">
                        <div class="flex justify-around items-center text-sm mb-6 border-b border-gray-100 pb-4">
                            <div class="text-center group-hover:-translate-y-1 transition-transform">
                                <div class="text-gray-400 mb-1"><i class="fa-solid fa-users text-lg"></i></div>
                                <p class="font-bold text-gray-800 text-lg">${kelas.jumlah_siswa || 0}</p>
                                <p class="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Siswa</p>
                            </div>
                            <div class="w-px h-10 bg-gray-200"></div>
                            <div class="text-center group-hover:-translate-y-1 transition-transform delay-75">
                                <div class="text-gray-400 mb-1"><i class="fa-solid fa-book-open text-lg"></i></div>
                                <p class="font-bold text-gray-800 text-lg">${kelas.jumlah_tugas || 0}</p>
                                <p class="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Tugas</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1">
                            <a href="/guru/kelas/${kelas.id}" 
                                class="btn btn-primary text-white btn-sm shadow-md group-hover:shadow-lg w-full">
                                Masuk Kelas <i class="fa-solid fa-arrow-right ml-1"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        els.gridContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// --- EVENT LISTENERS (Hanya Search) ---
function setupEventListeners() {
    if(els.searchInput) {
        els.searchInput.addEventListener('keyup', (e) => {
            const keyword = e.target.value.toLowerCase();
            const filtered = allClasses.filter(cls => 
                cls.nama_kelas.toLowerCase().includes(keyword) || 
                cls.tahun_ajaran.toLowerCase().includes(keyword)
            );
            renderClassList(filtered);
        });
    }
}