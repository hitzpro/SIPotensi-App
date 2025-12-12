import { getData, postData } from '../../utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    const els = {
        classSelect: document.getElementById('classSelect'),
        loadingValidation: document.getElementById('loadingValidation'),
        studentSection: document.getElementById('studentSection'),
        studentTableBody: document.getElementById('studentTableBody'),
        readinessCount: document.getElementById('readinessCount'),
        btnPredict: document.getElementById('btnPredict'),
        aiOverlay: document.getElementById('aiProcessingOverlay'),
        resultModal: document.getElementById('resultModal'),
        resultTableBody: document.getElementById('resultTableBody'),
        
        // UI Stats
        statSafe: document.getElementById('statSafe'),
        statWarning: document.getElementById('statWarning'),
        statDanger: document.getElementById('statDanger'),
        resultClassName: document.getElementById('resultClassName'),
        
        // PDF Elements (Template Hidden)
        btnDownloadPDF: document.getElementById('btnDownloadPDF'),
        pdfTemplate: document.getElementById('pdf-template'), // Tidak dipakai langsung, tapi pastikan ada
        pdfClassName: document.getElementById('pdf-class-name'),
        pdfPrintDate: document.getElementById('pdf-print-date'),
        pdfStatSafe: document.getElementById('pdf-stat-safe'),
        pdfStatWarning: document.getElementById('pdf-stat-warning'),
        pdfStatDanger: document.getElementById('pdf-stat-danger'),
        pdfTableBody: document.getElementById('pdf-table-body')
    };

    let selectedClassId = null;
    let selectedClassName = '';
    let lastPredictionData = []; 

    // --- 1. DATA LOADING & UI ---
    async function loadClasses() {
        try {
            const res = await getData('/classes');
            if (res.ok && res.data.data) {
                res.data.data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.text = `${c.nama_kelas} (${c.tahun_ajaran})`;
                    els.classSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error(error);
            if(typeof showToast === 'function') showToast("Gagal memuat data kelas", "error");
        }
    }

    if (els.classSelect) {
        els.classSelect.addEventListener('change', async (e) => {
            selectedClassId = e.target.value;
            selectedClassName = e.target.options[e.target.selectedIndex].text;
            if (!selectedClassId) return;
    
            els.studentSection.classList.add('hidden');
            els.loadingValidation.classList.remove('hidden');
            els.btnPredict.disabled = true;
    
            try {
                const res = await getData(`/classes/${selectedClassId}/check-readiness`);
                if (res.ok) {
                    renderReadinessTable(res.data.data);
                } else {
                    if(typeof showToast === 'function') showToast(res.data.message, "error");
                }
            } catch (err) {
                if(typeof showToast === 'function') showToast("Koneksi Error", "error");
            } finally {
                els.loadingValidation.classList.add('hidden');
                els.studentSection.classList.remove('hidden');
            }
        });
    }

    function renderReadinessTable(students) {
        els.studentTableBody.innerHTML = '';
        let readyCount = 0;
        if (!students || students.length === 0) {
            els.studentTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Tidak ada siswa.</td></tr>';
            els.readinessCount.innerHTML = `<span class="text-gray-400">0 Siswa</span>`;
            return;
        }
        students.forEach((s, i) => {
            if (s.is_ready) readyCount++;
            const statusBadge = s.is_ready 
                ? `<span class="badge badge-success text-white gap-1"><i class="fa-solid fa-check"></i> SIAP</span>`
                : `<span class="badge badge-ghost text-gray-400 gap-1"><i class="fa-solid fa-clock"></i> BELUM</span>`;
            
            els.studentTableBody.insertAdjacentHTML('beforeend', `
                <tr class="hover">
                    <td class="text-center">${i + 1}</td>
                    <td><strong>${s.nama}</strong></td>
                    <td class="text-xs text-gray-500">${s.nisn}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-xs ${s.is_ready ? "text-gray-400" : "text-error"}">${s.message}</td>
                </tr>
            `);
        });
        const total = students.length;
        if (readyCount > 0) {
            els.readinessCount.className = "badge badge-lg badge-primary text-white font-bold";
            els.readinessCount.innerText = `${readyCount} / ${total} Siap`;
            els.btnPredict.disabled = false;
        } else {
            els.readinessCount.className = "badge badge-lg badge-error text-white font-bold";
            els.readinessCount.innerText = `0 / ${total} Siap`;
            els.btnPredict.disabled = true;
        }
    }

    if (els.btnPredict) {
        els.btnPredict.addEventListener('click', async () => {
            if (!selectedClassId) return;
            els.aiOverlay.classList.remove('hidden');
            els.aiOverlay.style.display = 'flex';
            try {
                const res = await postData('/classes/predict-bulk', { id_kelas: selectedClassId });
                if (res.ok) {
                    lastPredictionData = res.data.data; // SAVE STATE
                    renderResultModal(lastPredictionData);
                    els.resultModal.showModal();
                } else {
                    if(typeof showToast === 'function') showToast(res.data.message || "Gagal", "error");
                }
            } catch (err) {
                if(typeof showToast === 'function') showToast("Koneksi Putus", "error");
            } finally {
                els.aiOverlay.classList.add('hidden');
                els.aiOverlay.style.display = 'none';
            }
        });
    }

    function generateAdvice(label, scores) {
        if (label.includes('Tinggi')) return `<span class="text-success font-medium">✨ Kinerja sangat baik.</span>`;
        const { tugas, uts, uas } = scores;
        let lowest = Math.min(tugas, uts, uas);
        if (lowest === tugas) return "Tingkatkan kedisiplinan pengumpulan tugas.";
        if (lowest === uts) return "Perkuat materi paruh pertama semester.";
        if (lowest === uas) return "Persiapan ujian akhir kurang maksimal.";
        return "Perlu pendampingan intensif.";
    }

    // Advice untuk versi Text/PDF (Tanpa HTML tag)
    function generatePdfTextAdvice(label, scores) {
        if (label.includes('Tinggi')) return "Kinerja sangat baik. Pertahankan.";
        const { tugas, uts, uas } = scores;
        let lowest = Math.min(tugas, uts, uas);
        if (lowest === tugas) return "Tingkatkan kedisiplinan tugas.";
        if (lowest === uts) return "Perkuat materi awal semester.";
        if (lowest === uas) return "Fokus materi ujian akhir.";
        return "Pendampingan intensif.";
    }

    function renderResultModal(data) {
        els.resultClassName.innerText = selectedClassName;
        els.resultTableBody.innerHTML = '';
        let cTinggi = 0, cSedang = 0, cRendah = 0;

        data.forEach(item => {
            const label = item.risk_label || '';
            const scores = item.scores || { tugas: 0, uts: 0, uas: 0 };
            
            let badgeClass = '', statusText = '';
            if (label.includes('Tinggi')) { cTinggi++; badgeClass = 'badge-success text-white'; statusText = 'Aman'; }
            else if (label.includes('Cukup') || label.includes('Sedang')) { cSedang++; badgeClass = 'badge-warning text-white'; statusText = 'Pantau'; }
            else { cRendah++; badgeClass = 'badge-error text-white'; statusText = 'Bimbingan'; }

            els.resultTableBody.insertAdjacentHTML('beforeend', `
                <tr class="hover border-b">
                    <td class="pl-4 py-3">
                        <div class="font-bold text-sm">${item.student_name}</div>
                        <div class="text-[10px] text-gray-400 font-mono">${item.nisn}</div>
                    </td>
                    <td class="text-center text-xs text-gray-500">${label}</td>
                    <td class="text-center"><span class="badge ${badgeClass} text-[10px]">${statusText}</span></td>
                    <td class="text-xs text-gray-600">${generateAdvice(label, scores)}</td>
                </tr>
            `);
        });

        els.statSafe.innerText = cTinggi;
        els.statWarning.innerText = cSedang;
        els.statDanger.innerText = cRendah;
    }

    // --- 2. NATIVE PRINT FUNCTION ---
    
    // Fungsi ini hanya mengisi data ke tabel template yang tersembunyi
    function populatePdfTemplate() {
        els.pdfClassName.innerText = selectedClassName;
        els.pdfPrintDate.innerText = new Date().toLocaleString('id-ID');
        els.pdfTableBody.innerHTML = '';

        let cSafe = 0, cWarn = 0, cDanger = 0;

        lastPredictionData.forEach((item, index) => {
            const label = item.risk_label || '';
            const scores = item.scores || {tugas:0, uts:0, uas:0};
            let statusText = '', color = '#000';

            // Menggunakan HEX Color agar aman
            if (label.includes('Tinggi')) { cSafe++; statusText='AMAN'; color='#166534'; }
            else if (label.includes('Cukup') || label.includes('Sedang')) { cWarn++; statusText='PANTAU'; color='#854d0e'; }
            else { cDanger++; statusText='BIMBINGAN'; color='#991b1b'; }

            els.pdfTableBody.insertAdjacentHTML('beforeend', `
                <tr style="border-bottom: 1px solid #ccc;">
                    <td style="padding:8px; border:1px solid #999; text-align:center;">${index+1}</td>
                    <td style="padding:8px; border:1px solid #999;">
                        <strong>${item.student_name}</strong><br>
                        <span style="color:#666;">${item.nisn}</span>
                    </td>
                    <td style="padding:8px; border:1px solid #999; text-align:center;">${label}</td>
                    <td style="padding:8px; border:1px solid #999; text-align:center; font-weight:bold; color:${color};">${statusText}</td>
                    <td style="padding:8px; border:1px solid #999;">${generatePdfTextAdvice(label, scores)}</td>
                </tr>
            `);
        });

        els.pdfStatSafe.innerText = cSafe;
        els.pdfStatWarning.innerText = cWarn;
        els.pdfStatDanger.innerText = cDanger;
    }

    if (els.btnDownloadPDF) {
        els.btnDownloadPDF.addEventListener('click', () => {
            // 1. Masukkan data (Populate)
            populatePdfTemplate();

            // 2. TRIK ANTI BLANK: Pindahkan Template ke Root Body
            // Ini memastikan template tidak terpengaruh oleh layout Dashboard (flex/grid/overflow)
            document.body.appendChild(els.pdfTemplate);

            // 3. Print
            // Browser akan memblokir eksekusi JS sampai jendela print ditutup
            window.print();

            // 4. (Opsional) Kembalikan scroll bar jika hilang (kadang efek print)
            document.body.style.overflow = 'auto';
            
            // Note: Kita tidak perlu memindahkan balik templatenya, 
            // karena toh sudah hidden lagi di layar biasa.
        });
    }

    loadClasses();
});