// src/scripts/pages/admin/document.js
import { getData, postData } from '../../utils/api.js';

// --- STATE ---
let allGurus = [];
let selectedSet = new Set();
let fileSelected = false;
let historyData = [];

// --- DOM ELEMENTS ---
const elements = {
    form: document.getElementById('form-broadcast'),
    fileInput: document.getElementById('file-input'),
    filePreview: document.getElementById('file-preview-area'),
    fileNameDisplay: document.getElementById('file-name-display'),
    fileNameText: document.getElementById('file-name-text'),
    btnSend: document.getElementById('btn-send'),
    recipientCountLabel: document.getElementById('recipient-count'),
    selectedIdsInput: document.getElementById('selected-ids'),
    
    // Modal Recipient
    modalRecipient: document.getElementById('modal_recipient'),
    searchGuru: document.getElementById('search-guru'),
    listGuruContainer: document.getElementById('list-guru-container'),
    checkAll: document.getElementById('check-all'),
    btnCount: document.getElementById('btn-count'),
    
    // History
    historyList: document.getElementById('history-list'),
    historySearch: document.getElementById('history-search'),
    historyMonth: document.getElementById('history-month'),
    historyCount: document.getElementById('history-count'),
    modalHistoryDetail: document.getElementById('modal_history_detail'),
    detailRecipients: document.getElementById('detail-recipients')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([fetchGurus(), fetchHistory()]);
    setupFileUpload();
    setupSearch();
    setupHistoryUI();
    setupFormSubmit();
});

// --- BROADCAST / RECIPIENT LOGIC ---

async function fetchGurus() {
    const res = await getData('/admin/guru');
    if (res.ok && res.data && res.data.data) {
        allGurus = res.data.data;
        document.getElementById('total-guru-label').innerText = `Total: ${allGurus.length}`;
        renderGuruList(allGurus);
    }
}

function renderGuruList(gurus) {
    if (!elements.listGuruContainer) return;
    
    if (gurus.length === 0) {
        elements.listGuruContainer.innerHTML = `<div class="text-center py-4 text-gray-400 text-sm">Tidak ditemukan</div>`;
        return;
    }
    
    elements.listGuruContainer.innerHTML = gurus.map(g => `
        <label class="flex items-center gap-3 p-3 hover:bg-base-200 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
            <input type="checkbox" value="${g.id}" class="checkbox checkbox-sm checkbox-primary guru-checkbox" 
                ${selectedSet.has(g.id) ? 'checked' : ''} onchange="toggleGuru('${g.id}')" />
            <div class="flex-1">
                <div class="font-bold text-gray-800 text-sm">${g.nama}</div>
                <div class="text-xs text-gray-500">${g.email}</div>
            </div>
        </label>
    `).join('');
}

// Expose to Window for HTML onclick
window.openRecipientModal = () => {
    if (elements.searchGuru) elements.searchGuru.value = '';
    renderGuruList(allGurus);
    updateCheckAllState();
    elements.modalRecipient.showModal();
};

window.toggleGuru = (id) => {
    if (selectedSet.has(id)) selectedSet.delete(id);
    else selectedSet.add(id);
    
    updateCheckAllState();
    elements.btnCount.innerText = selectedSet.size;
};

window.saveSelection = () => {
    elements.recipientCountLabel.innerText = `${selectedSet.size} Guru Dipilih`;
    elements.selectedIdsInput.value = JSON.stringify(Array.from(selectedSet));
    elements.modalRecipient.close();
    validateForm();
};

// Check All Logic
if (elements.checkAll) {
    elements.checkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleGurus = getVisibleGurus();
        
        visibleGurus.forEach(g => {
            if (isChecked) selectedSet.add(g.id);
            else selectedSet.delete(g.id);
        });
        
        document.querySelectorAll('.guru-checkbox').forEach(cb => {
            if (visibleGurus.some(g => g.id === cb.value)) cb.checked = isChecked;
        });
        
        elements.btnCount.innerText = selectedSet.size;
    });
}

function getVisibleGurus() {
    const query = elements.searchGuru.value.toLowerCase();
    return allGurus.filter(g => g.nama.toLowerCase().includes(query) || g.email.toLowerCase().includes(query));
}

function updateCheckAllState() {
    const visibleGurus = getVisibleGurus();
    const allSelected = visibleGurus.length > 0 && visibleGurus.every(g => selectedSet.has(g.id));
    elements.checkAll.checked = allSelected;
}

function setupSearch() {
    if (elements.searchGuru) {
        elements.searchGuru.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allGurus.filter(g => 
                g.nama.toLowerCase().includes(query) || 
                g.email.toLowerCase().includes(query)
            );
            renderGuruList(filtered);
            updateCheckAllState();
        });
    }
}

// --- FILE UPLOAD & FORM LOGIC ---

function setupFileUpload() {
    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            elements.filePreview.classList.add('hidden');
            elements.fileNameDisplay.classList.remove('hidden');
            elements.fileNameDisplay.classList.add('flex');
            elements.fileNameText.innerText = file.name;
            fileSelected = true;
        } else {
            fileSelected = false;
        }
        validateForm();
    });
}

function validateForm() {
    if (fileSelected && selectedSet.size > 0) elements.btnSend.disabled = false;
    else elements.btnSend.disabled = true;
}

function setupFormSubmit() {
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const total = selectedSet.size;
        
        const confirm = await window.showConfirm(
            'Kirim Dokumen?', 
            `Anda akan mengirim file kepada <b>${total} guru</b>.`,
            'Ya, Kirim',
            'primary'
        );

        if (!confirm) return;

        const originalText = elements.btnSend.innerHTML;
        elements.btnSend.disabled = true;
        elements.btnSend.innerHTML = `<span class="loading loading-spinner"></span> Mengirim...`;

        const formData = new FormData(e.target);
        const token = localStorage.getItem('token');

        try {
            // Menggunakan fetch langsung karena FormData butuh handling khusus (multipart/form-data)
            const response = await fetch('https://sipotensi-api.vercel.app/api/admin/guru/broadcast-doc', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                window.showToast("Berhasil! " + result.message, 'success');
                resetForm();
                fetchHistory(); // Refresh history
            } else {
                window.showToast(result.message || "Gagal mengirim dokumen.", 'error');
            }

        } catch (error) {
            console.error(error);
            window.showToast("Terjadi kesalahan jaringan.", 'error');
        } finally {
            elements.btnSend.disabled = false;
            elements.btnSend.innerHTML = originalText;
        }
    });
}

function resetForm() {
    elements.form.reset();
    selectedSet.clear();
    window.saveSelection();
    
    elements.filePreview.classList.remove('hidden');
    elements.fileNameDisplay.classList.add('hidden');
    elements.fileNameDisplay.classList.remove('flex');
    fileSelected = false;
    validateForm();
}

// --- HISTORY LOGIC ---

async function fetchHistory() {
    try {
        const res = await getData('/admin/guru/history-doc');
        if (res.ok && res.data.data) {
            historyData = res.data.data;
            renderHistory(historyData.slice(0, 5)); // Default 5 latest
        }
    } catch (e) { console.error("History Error", e); }
}

function renderHistory(data) {
    if (!elements.historyList) return;
    elements.historyCount.innerText = data.length;
    
    if (data.length === 0) {
        elements.historyList.innerHTML = `<div class="text-center py-6 text-xs text-gray-400">Tidak ada riwayat.</div>`;
        return;
    }

    elements.historyList.innerHTML = data.map(item => {
        const date = new Date(item.created_at);
        const dateStr = date.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: '2-digit'});
        const recipientCount = item.recipients.length;
        const recipientsJson = JSON.stringify(item.recipients).replace(/"/g, '&quot;');

        return `
            <div onclick="openHistoryDetail('${item.judul}', '${item.created_at}', '${item.link_url}', '${recipientsJson}')" 
                 class="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer transition-all">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <i class="fa-solid fa-file-arrow-up text-xs"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-gray-700 truncate group-hover:text-primary transition-colors">${item.judul}</p>
                        <p class="text-[10px] text-gray-400 flex items-center gap-1">
                            <i class="fa-regular fa-calendar"></i> ${dateStr}
                        </p>
                    </div>
                </div>
                <span class="badge badge-xs badge-ghost text-[10px]">${recipientCount} <i class="fa-solid fa-user ml-1 text-[8px]"></i></span>
            </div>
        `;
    }).join('');
}

window.openHistoryDetail = async (judul, dateStr, link, recipientsJson) => {
    document.getElementById('detail-judul').innerText = judul;
    document.getElementById('detail-date').innerText = new Date(dateStr).toLocaleString('id-ID');
    document.getElementById('detail-link').href = link;
    
    const ids = JSON.parse(recipientsJson);
    elements.detailRecipients.innerHTML = '<span class="loading loading-spinner loading-sm text-primary mx-auto block"></span>';
    elements.modalHistoryDetail.showModal();

    try {
        const res = await postData('/admin/guru/history-recipients', { ids });
        if (res.ok && res.data.data) {
            const users = res.data.data;
            if (users.length === 0) {
                elements.detailRecipients.innerHTML = '<p class="text-xs text-gray-400 text-center">Data user tidak ditemukan.</p>';
            } else {
                elements.detailRecipients.innerHTML = users.map(u => `
                    <div class="flex items-center gap-2 p-1.5 border-b border-gray-100 last:border-0">
                        <div class="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold">
                            ${u.nama.charAt(0)}
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-gray-700 truncate">${u.nama}</p>
                            <p class="text-[9px] text-gray-400 truncate">${u.email}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        elements.detailRecipients.innerHTML = '<p class="text-xs text-error text-center">Gagal memuat penerima.</p>';
    }
};

function setupHistoryUI() {
    // Accordion Default State
    const toggle = document.getElementById('history-toggle');
    if (toggle) {
        toggle.checked = window.innerWidth >= 1024;
    }

    // Filter Logic
    const applyFilter = () => {
        const term = elements.historySearch.value.toLowerCase();
        const month = elements.historyMonth.value;

        let filtered = historyData.filter(item => {
            const matchesTerm = item.judul.toLowerCase().includes(term);
            const itemDate = new Date(item.created_at);
            const matchesMonth = month === 'all' || itemDate.getMonth().toString() === month;
            return matchesTerm && matchesMonth;
        });

        if (term === '' && month === 'all') {
            renderHistory(filtered.slice(0, 5));
        } else {
            renderHistory(filtered);
        }
    };

    if (elements.historySearch) elements.historySearch.addEventListener('input', applyFilter);
    if (elements.historyMonth) elements.historyMonth.addEventListener('change', applyFilter);
}