import { getData, deleteData, putData, postData } from '../../utils/api.js';
import { API_CONFIG } from '../../config.js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- STATE MANAGEMENT ---
let CLASS_ID = null;
let className = "Kelas";
let allStudents = [];
let filteredStudents = [];
let currentPage = 1;
let rowsPerPage = 10;
let selectedIds = new Set(); // Menyimpan ID siswa yang dicentang

// --- DOM ELEMENTS ---
const els = {
    mainContent: document.getElementById('main-content'),
    tableBody: document.getElementById('students-table-body'),
    titleEl: document.getElementById('class-name-title'),
    emptyState: document.getElementById('empty-state-siswa'),
    searchInput: document.getElementById('table-search-input'),
    rowLimitSelect: document.getElementById('table-row-limit'),
    
    // Checkbox & Bulk Actions
    checkAll: document.getElementById('check-all'),
    btnBulkDelete: document.getElementById('btn-bulk-delete'),
    selectedCountSpan: document.getElementById('selected-count'),

    // Pagination
    paginationContainer: document.getElementById('table-pagination'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnPrevMobile: document.getElementById('btn-prev-mobile'),
    btnNextMobile: document.getElementById('btn-next-mobile'),
    
    // Modals
    modalImport: document.getElementById('modal_import_csv'),
    modalAdd: document.getElementById('modal_tambah_siswa'),
    modalEdit: document.getElementById('modal_edit_siswa')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (els.mainContent) {
        CLASS_ID = els.mainContent.dataset.classId;
        if (!CLASS_ID) return;
        
        loadClassData();
        setupTableControls();
        setupBulkDelete();
        setupForms();
        setupCSVLogic();
        
        // Attach Global Functions for HTML onClick
        window.exportToExcel = exportToExcel;
        window.exportToPDF = exportToPDF;
        window.handleDeleteSiswa = handleDeleteSiswa;
        window.openEditModal = openEditModal;
        window.resetPreview = resetPreview;
    }
});

// --- DATA LOADING ---
async function loadClassData() {
    try {
        // 1. Get Class Info
        const classesRes = await getData('/classes');
        if(classesRes.ok) {
            const cls = classesRes.data.data.find(c => String(c.id) === String(CLASS_ID));
            if(cls) { 
                els.titleEl.innerText = cls.nama_kelas; 
                els.titleEl.classList.remove('skeleton'); 
                className = cls.nama_kelas; 
            }
        }

        // 2. Get Students
        const studentsRes = await getData(`/classes/${CLASS_ID}/students`);
        if (studentsRes.ok && studentsRes.data.status === 'success') {
            allStudents = studentsRes.data.data;
            filteredStudents = [...allStudents];
            renderTable();
        } else { 
            allStudents = []; 
            renderTable(); 
        }
    } catch (error) { 
        console.error("Gagal memuat data:", error); 
    }
}

// --- RENDER TABLE ---
function renderTable() {
    els.tableBody.innerHTML = '';
    
    // Reset state checkbox "Select All" visual (bukan datanya)
    els.checkAll.checked = false;

    // Pagination Logic
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayData = filteredStudents.slice(startIndex, endIndex);

    // Warning jika ada data kosong (sekali saja muncul)
    const notReadyCount = allStudents.filter(s => !s.nilai_uts || !s.nilai_uas || s.nilai_tugas == 0).length;
    if (!window.hasShownWarning && notReadyCount > 0) {
        showToast(`Perhatian: ${notReadyCount} siswa belum melengkapi data nilai!`, 'warning');
        window.hasShownWarning = true;
    }

    // Check "Select All" logic for current page
    if (displayData.length > 0) {
        const allPageSelected = displayData.every(s => selectedIds.has(String(s.id)));
        els.checkAll.checked = allPageSelected;
    }

    // Empty State Handling
    if (filteredStudents.length === 0) {
        els.tableBody.classList.add('hidden');
        els.emptyState.classList.remove('hidden');
        els.emptyState.classList.add('flex');
        els.paginationContainer.classList.add('hidden');
        return;
    }

    els.tableBody.classList.remove('hidden');
    els.emptyState.classList.add('hidden');
    els.emptyState.classList.remove('flex');
    els.paginationContainer.classList.remove('hidden');

    // Generate Rows
    displayData.forEach((s, index) => {
        const realNo = startIndex + index + 1;
        const sId = String(s.id);
        const isChecked = selectedIds.has(sId) ? 'checked' : '';
        const isIncomplete = !s.nilai_uts || !s.nilai_uas || s.nilai_tugas == 0;
        const redDot = isIncomplete 
            ? `<span class="tooltip" data-tip="Data Nilai Belum Lengkap"><span class="w-2 h-2 rounded-full bg-red-500 inline-block ml-2 animate-pulse"></span></span>` 
            : '';

        const detailUrl = `/guru/kelas/${CLASS_ID}/siswa/${s.id}`;
        
        const row = `
            <tr class="hover ${isChecked ? 'bg-base-200' : ''}">
                <th>
                    <label>
                        <input type="checkbox" class="checkbox checkbox-sm row-checkbox" 
                        data-id="${s.id}" ${isChecked} />
                    </label>
                </th>
                <th>${realNo}</th>
                <td class="font-mono text-gray-600">${s.nisn}</td>
                <td>
                    <div class="flex items-center font-bold text-gray-700">
                        ${s.nama}
                        ${redDot}
                    </div>
                </td>
                <td class="text-center">
                    <span class="badge ${s.nilai_tugas >= 75 ? 'badge-success text-white' : 'badge-warning'} badge-sm">
                        ${s.nilai_tugas}
                    </span>
                </td>
                <td class="text-center text-gray-600">${s.nilai_uts || '-'}</td>
                <td class="text-center text-gray-600">${s.nilai_uas || '-'}</td>
                <td class="text-center">
                    <div class="join">
                        <button class="btn btn-xs btn-info text-white join-item" onclick="window.location.href='${detailUrl}'">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-xs btn-warning text-white join-item" onclick="openEditModal('${s.id}', '${s.nama.replace(/'/g, "\\'")}', '${s.nisn}')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-xs btn-error text-white join-item" onclick="handleDeleteSiswa('${s.id}', '${s.nama.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        els.tableBody.insertAdjacentHTML('beforeend', row);
    });

    setupRowCheckboxes();
    updatePaginationUI(startIndex, endIndex);
}

// --- CHECKBOX & BULK DELETE ---
function setupRowCheckboxes() {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = String(e.target.dataset.id);
            if (e.target.checked) selectedIds.add(id);
            else selectedIds.delete(id);
            
            updateBulkDeleteUI();
        });
    });
}

// Handle "Select All" toggle
if(els.checkAll) {
    els.checkAll.addEventListener('change', (e) => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const displayData = filteredStudents.slice(startIndex, endIndex);
    
        if (e.target.checked) {
            displayData.forEach(s => selectedIds.add(String(s.id)));
        } else {
            displayData.forEach(s => selectedIds.delete(String(s.id)));
        }
        renderTable(); 
        updateBulkDeleteUI();
    });
}

function updateBulkDeleteUI() {
    els.selectedCountSpan.innerText = selectedIds.size;
    if (selectedIds.size > 0) {
        els.btnBulkDelete.classList.remove('hidden');
        els.btnBulkDelete.classList.add('flex');
    } else {
        els.btnBulkDelete.classList.add('hidden');
        els.btnBulkDelete.classList.remove('flex');
    }
}

function setupBulkDelete() {
    els.btnBulkDelete.onclick = async () => {
        const count = selectedIds.size;
        const ok = await showConfirm(
            'Hapus Masal?', 
            `Yakin ingin menghapus <b>${count} siswa</b> yang dipilih? Data nilai mereka juga akan hilang permanen.`, 
            `Hapus ${count} Data`, 
            'danger'
        );

        if(ok) {
            const idsArray = Array.from(selectedIds);
            try {
                const res = await postData(`/classes/${CLASS_ID}/students/bulk-delete`, {
                    studentIds: idsArray
                });

                if(res.ok) {
                    showToast(`Berhasil menghapus ${count} siswa`, 'success');
                    selectedIds.clear();
                    updateBulkDeleteUI();
                    loadClassData();
                } else {
                    showToast(res.data.message || 'Gagal menghapus', 'error');
                }
            } catch(e) {
                showToast('Error koneksi', 'error');
            }
        }
    };
}

// --- CONTROLS & PAGINATION ---
function setupTableControls() {
    if(els.searchInput) {
        els.searchInput.addEventListener('keyup', (e) => {
            const keyword = e.target.value.toLowerCase();
            filteredStudents = allStudents.filter(s => s.nama.toLowerCase().includes(keyword) || String(s.nisn).includes(keyword));
            currentPage = 1; 
            renderTable();
        });
    }

    if(els.rowLimitSelect) {
        els.rowLimitSelect.addEventListener('change', (e) => {
            rowsPerPage = parseInt(e.target.value); 
            currentPage = 1; 
            renderTable();
        });
    }

    const prevAction = () => { if(currentPage > 1) { currentPage--; renderTable(); } };
    const nextAction = () => { const maxPage = Math.ceil(filteredStudents.length / rowsPerPage); if(currentPage < maxPage) { currentPage++; renderTable(); } };
    
    if(els.btnPrev) els.btnPrev.onclick = prevAction;
    if(els.btnNext) els.btnNext.onclick = nextAction;
    if(els.btnPrevMobile) els.btnPrevMobile.onclick = prevAction;
    if(els.btnNextMobile) els.btnNextMobile.onclick = nextAction;
}

function updatePaginationUI(start, end) {
    const total = filteredStudents.length;
    const maxPage = Math.ceil(total / rowsPerPage);
    
    document.getElementById('pag-start').innerText = total === 0 ? 0 : start + 1;
    document.getElementById('pag-end').innerText = end > total ? total : end;
    document.getElementById('pag-total').innerText = total;
    document.getElementById('pag-current-mobile').innerText = `${currentPage} / ${maxPage}`;
    
    els.btnPrev.disabled = currentPage === 1;
    els.btnNext.disabled = currentPage === maxPage || total === 0;
    els.btnPrevMobile.disabled = els.btnPrev.disabled;
    els.btnNextMobile.disabled = els.btnNext.disabled;
    
    const numContainer = document.getElementById('pagination-numbers');
    if(numContainer) {
        numContainer.innerHTML = '';
        // Simple pagination logic for brevity
        let pages = [];
        if (maxPage <= 5) {
            pages = Array.from({length: maxPage}, (_, i) => i + 1);
        } else {
            pages = [1, currentPage - 1, currentPage, currentPage + 1, maxPage].filter(p => p > 0 && p <= maxPage);
            pages = [...new Set(pages)].sort((a,b) => a-b);
        }

        pages.forEach(p => {
            const btn = document.createElement('button');
            btn.className = `relative inline-flex items-center px-4 py-2 border text-sm font-medium ${p === currentPage ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`;
            btn.innerText = p; 
            btn.onclick = () => { currentPage = p; renderTable(); };
            numContainer.appendChild(btn);
        });
    }
}

// --- CRUD SINGLE ---
async function handleDeleteSiswa(id, nama) {
    const ok = await showConfirm('Hapus?', `Hapus <b>${nama}</b>?`, 'Hapus', 'danger');
    if(ok) { 
        await deleteData(`/classes/${CLASS_ID}/students/${id}`); 
        loadClassData(); 
        showToast('Siswa dihapus', 'success');
    }
}

function openEditModal(id, n, i) {
    document.getElementById('edit-student-id').value = id;
    document.getElementById('edit-nama').value = n;
    document.getElementById('edit-nisn').value = i;
    els.modalEdit.showModal();
}

function setupForms() {
    // Form Tambah
    const formTambah = document.querySelector('#modal_tambah_siswa form');
    if(formTambah) {
        formTambah.onsubmit = async (e) => {
            e.preventDefault();
            // Workaround: Gunakan endpoint import untuk single add agar backend konsisten
            const fd = new FormData(formTambah);
            const csvContent = `nama,nisn\n${fd.get('nama')},${fd.get('nisn')}`;
            const file = new File([csvContent], "single_add.csv", {type:"text/csv"});
            
            const ud = new FormData(); 
            ud.append('file', file);

            const token = localStorage.getItem('token');
            const res = await fetch(`${API_CONFIG.BASE_URL}/classes/${CLASS_ID}/import-students`, {
                method:'POST',
                headers:{'Authorization':`Bearer ${token}`},
                body:ud
            });

            if(res.ok) {
                els.modalAdd.close();
                formTambah.reset();
                loadClassData();
                showToast('Siswa berhasil ditambahkan', 'success');
            } else {
                showToast('Gagal menambahkan siswa', 'error');
            }
        };
    }

    // Form Edit
    const formEdit = document.querySelector('#modal_edit_siswa form');
    if(formEdit) {
        formEdit.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-student-id').value;
            const nama = document.getElementById('edit-nama').value;
            const nisn = document.getElementById('edit-nisn').value;

            // Fix endpoint path
            const res = await putData(`/classes/students/${id}`, { nama, nisn });
            
            if(res.ok) {
                showToast('Update berhasil', 'success');
                els.modalEdit.close(); 
                loadClassData();
            } else {
                showToast(res.data.message || 'Gagal update', 'error');
            }
        };
    }
}

// --- EXPORT & IMPORT ---
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(allStudents.map((s,i) => ({
        No: i+1,
        NISN: s.nisn,
        Nama: s.nama,
        Tugas: s.nilai_tugas,
        UTS: s.nilai_uts,
        UAS: s.nilai_uas
    })));
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");
    XLSX.writeFile(wb, `Data_Siswa_${className}.xlsx`);
}

function exportToPDF() {
    const doc = new jsPDF();
    doc.text(`Data Siswa - ${className}`, 14, 15);
    autoTable(doc, {
        head: [["No","NISN","Nama","Tugas","UTS","UAS"]],
        body: allStudents.map((s,i)=>[i+1,s.nisn,s.nama,s.nilai_tugas,s.nilai_uts||'-',s.nilai_uas||'-']),
        startY: 25
    });
    doc.save(`Data_Siswa_${className}.pdf`);
}

function setupCSVLogic() {
    const fileInput = document.getElementById('file-csv-input');
    const btnUpload = document.getElementById('btn-process-upload');
    let validBlob = null;

    if(fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;

            Papa.parse(file, {
                header: true, 
                skipEmptyLines: true, 
                complete: (res) => {
                    const tbody = document.getElementById('preview-body'); 
                    tbody.innerHTML = '';
                    const validRows = [];
                    
                    document.getElementById('preview-container').classList.remove('hidden');
                    
                    res.data.forEach(r => {
                        const n = r.nama || r.Nama; 
                        const i = r.nisn || r.NISN;
                        let st = 'valid';
                        if(!n || !i) st = 'error';
                        
                        if(st === 'valid') validRows.push(`${n},${i}`);
                        
                        tbody.insertAdjacentHTML('beforeend', `
                            <tr class="${st === 'valid' ? 'bg-green-50' : 'bg-red-50'}">
                                <td>${st}</td><td>${n}</td><td>${i}</td><td>-</td>
                            </tr>
                        `);
                    });

                    if(validRows.length) { 
                        validBlob = new Blob(["nama,nisn\n" + validRows.join("\n")], {type:'text/csv'}); 
                        btnUpload.disabled = false; 
                    } else {
                        btnUpload.disabled = true;
                    }
                }
            });
        });
    }

    if(btnUpload) {
        btnUpload.onclick = async () => {
            if(!validBlob) return;
            const fd = new FormData(); 
            fd.append('file', new File([validBlob], "upload.csv", {type:'text/csv'}));
            
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_CONFIG.BASE_URL}/classes/${CLASS_ID}/import-students`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: fd
            });
            
            if(res.ok) {
                showToast('Import berhasil!', 'success');
                els.modalImport.close(); 
                loadClassData();
            } else {
                showToast('Gagal import data', 'error');
            }
        };
    }
}

function resetPreview() { 
    const fileInput = document.getElementById('file-csv-input');
    if(fileInput) fileInput.value = ''; 
    document.getElementById('preview-container').classList.add('hidden'); 
    const btn = document.getElementById('btn-process-upload');
    if(btn) btn.disabled = true; 
}