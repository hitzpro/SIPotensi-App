// src/scripts/pages/admin/dashboard.js
import { getData } from '../../utils/api.js';

// --- DOM ELEMENTS ---
const classSelect = document.getElementById('classSelect');
const tableBody = document.getElementById('tableBody');
const btnDownloadPDF = document.getElementById('btnDownloadPDF');
const confirmModal = document.getElementById('confirmModal');
const btnConfirmPrint = document.getElementById('btnConfirmPrint');

// Stats Elements
const statGuru = document.getElementById('stat-guru');
const statSiswa = document.getElementById('stat-siswa');
const statKelas = document.getElementById('stat-kelas');

// --- STATE ---
let currentClassData = [];
let currentClassName = '';

// --- INITIALIZATION ---
async function initDashboard() {
    // 1. Load Stats
    const stats = await getData('/admin/guru/stats');
    if (stats.ok) {
        statGuru.innerText = stats.data.data.total_guru;
        statSiswa.innerText = stats.data.data.total_siswa;
        statKelas.innerText = stats.data.data.total_kelas;
    }

    // 2. Load Classes Dropdown
    const classes = await getData('/classes/all');
    if (classes.ok) {
        classes.data.data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.text = `${c.nama_kelas} (${c.tahun_ajaran})`;
            classSelect.appendChild(opt);
        });
    } else {
        console.error("Gagal load kelas:", classes);
    }
}

// --- EVENT LISTENERS ---

// 1. Handle Class Change (Load Table)
if (classSelect) {
    classSelect.addEventListener('change', async (e) => {
        const classId = e.target.value;
        currentClassName = e.target.options[e.target.selectedIndex].text;

        if (!classId) return;

        // Loading State
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="loading loading-dots"></span></td></tr>';
        btnDownloadPDF.disabled = true;

        // Fetch Data
        const res = await getData(`/admin/guru/predictions/${classId}`);

        if (res.ok) {
            currentClassData = res.data.data;
            renderTable(currentClassData);
            // Enable tombol download jika ada siswa yang sudah diprediksi
            btnDownloadPDF.disabled = currentClassData.filter(s => s.is_predicted).length === 0;
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-error">Gagal memuat data.</td></tr>';
        }
    });
}

// 2. Handle Modal & Print
if (btnDownloadPDF) {
    btnDownloadPDF.addEventListener('click', () => {
        confirmModal.showModal();
    });
}

if (btnConfirmPrint) {
    btnConfirmPrint.addEventListener('click', () => {
        prepareAndPrintPDF();
    });
}

// --- HELPER FUNCTIONS ---

function renderTable(data) {
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Belum ada siswa di kelas ini.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    data.forEach((s, index) => {
        const opacityClass = s.is_predicted ? '' : 'opacity-50 bg-gray-50';
        const statusBadge = s.is_predicted
            ? `<span class="badge badge-sm ${getBadgeColor(s.status_ui)} text-white">${s.status_ui}</span>`
            : '<span class="text-xs italic text-gray-400">Belum diprediksi</span>';

        const recShort = s.recommendation.length > 50 ? s.recommendation.substring(0, 50) + '...' : s.recommendation;

        const row = `
            <tr class="${opacityClass}">
                <td class="font-bold text-gray-500">${index + 1}</td>
                <td>
                    <div class="font-bold">${s.nama}</div>
                    <div class="text-[10px] text-gray-400">${s.nisn}</div>
                </td>
                <td class="text-center font-mono text-xs">${s.nilai_akhir || '-'}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-gray-600">${s.is_predicted ? recShort : '-'}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function prepareAndPrintPDF() {
    // Populate Data Header
    document.getElementById('pdf-class-name').innerText = currentClassName;
    document.getElementById('pdf-date').innerText = new Date().toLocaleString('id-ID');

    // Filter Data (Hanya yang sudah diprediksi)
    const predictedStudents = currentClassData.filter(s => s.is_predicted);
    document.getElementById('pdf-total-students').innerText = predictedStudents.length;

    // Hitung Stats untuk PDF
    document.getElementById('pdf-count-aman').innerText = predictedStudents.filter(s => s.status_ui === 'Aman').length;
    document.getElementById('pdf-count-pantau').innerText = predictedStudents.filter(s => s.status_ui === 'Pantau').length;
    document.getElementById('pdf-count-bimbingan').innerText = predictedStudents.filter(s => s.status_ui === 'Bimbingan').length;

    // Render Table Body PDF
    const pdfBody = document.getElementById('pdf-table-body');
    pdfBody.innerHTML = '';

    predictedStudents.forEach((s, i) => {
        const shortRec = getShortRecommendation(s.status_ui, s.recommendation);

        pdfBody.insertAdjacentHTML('beforeend', `
            <tr>
                <td class="border border-black p-2 text-center">${i + 1}</td>
                <td class="border border-black p-2 font-bold">${s.nama}</td>
                <td class="border border-black p-2 text-center uppercase font-bold text-[10px]">${s.status_ui}</td>
                <td class="border border-black p-2 text-center">${s.nilai_akhir}</td>
                <td class="border border-black p-2 text-xs">${shortRec}</td> 
            </tr>
        `);
    });

    // Trigger Print (Delay sedikit agar DOM update selesai)
    setTimeout(() => {
        window.print();
    }, 300);
}

// --- UTILITIES ---

function getShortRecommendation(status, text) {
    if (!text) return "-";
    const t = text.toLowerCase();

    if (status === 'Aman') {
        if (t.includes('tugas')) return "Tingkatkan Kedisiplinan";
        return "Pertahankan & Pengayaan";
    }
    if (status === 'Pantau') {
        if (t.includes('tugas')) return "Perbanyak Latihan Tugas";
        if (t.includes('ujian') || t.includes('materi')) return "Review Ulang Materi";
        return "Pantau Perkembangan";
    }
    if (status === 'Bimbingan') {
        if (t.includes('disiplin')) return "Perbaiki Disiplin Belajar";
        if (t.includes('remedial') || t.includes('ujian')) return "Wajib Remedial & Les";
        return "Bimbingan Intensif";
    }
    return "Evaluasi Belajar";
}

function getBadgeColor(status) {
    if (status === 'Aman') return 'badge-success';
    if (status === 'Pantau') return 'badge-warning';
    return 'badge-error';
}

// Start Script
document.addEventListener('DOMContentLoaded', initDashboard);