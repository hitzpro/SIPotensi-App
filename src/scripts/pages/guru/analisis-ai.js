import { getData, postData } from '../../utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Definisi Elemen DOM
    const els = {
        classSelect: document.getElementById('classSelect'),
        loadingValidation: document.getElementById('loadingValidation'),
        studentSection: document.getElementById('studentSection'),
        studentTableBody: document.getElementById('studentTableBody'),
        readinessCount: document.getElementById('readinessCount'),
        btnPredict: document.getElementById('btnPredict'),
        aiOverlay: document.getElementById('aiProcessingOverlay'),
        
        // Modal & Splash Elements
        resultModal: document.getElementById('resultModal'),
        splashScreen: document.getElementById('splashScreen'),
        splashStudentName: document.getElementById('splashStudentName'),
        splashStatusContainer: document.getElementById('splashStatusContainer'),
        
        resultClassName: document.getElementById('resultClassName'),
        resultCardContainer: document.getElementById('resultCardContainer'),
        
        // Tombol Simpan (Pengganti PDF)
        btnSaveData: document.getElementById('btnSaveData'),
    };

    let selectedClassId = null;
    let selectedClassName = '';
    let lastPredictionData = []; 

    // --- 1. DATA LOADING (Tetap Sama) ---
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
        } catch (error) { console.error(error); }
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
                if (res.ok) renderReadinessTable(res.data.data);
            } catch (err) { console.error(err); } 
            finally {
                els.loadingValidation.classList.add('hidden');
                els.studentSection.classList.remove('hidden');
            }
        });
    }

    function renderReadinessTable(students) {
        els.studentTableBody.innerHTML = '';
        let readyCount = 0;
        if (!students || students.length === 0) {
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
            els.readinessCount.innerText = `0 / ${total} Siap`;
            els.btnPredict.disabled = true;
        }
    }

    // --- 2. PREDIKSI & SPLASH SCREEN LOGIC ---
    if (els.btnPredict) {
        els.btnPredict.addEventListener('click', async () => {
            if (!selectedClassId) return;
            
            els.aiOverlay.classList.remove('hidden');
            els.aiOverlay.style.display = 'flex';
            
            try {
                // Request ke Backend -> Backend OTOMATIS SIMPAN (Upsert)
                const res = await postData('/classes/predict-bulk', { id_kelas: selectedClassId });
                
                els.aiOverlay.classList.add('hidden');
                els.aiOverlay.style.display = 'none';

                if (res.ok) {
                    lastPredictionData = res.data.data;
                    
                    // Render kartu
                    renderResultCards(lastPredictionData);
                    els.resultModal.showModal();

                    // Putar Animasi Splash Screen
                    playSplashScreen(lastPredictionData);

                } else {
                    if(window.showToast) window.showToast(res.data.message || "Gagal memproses AI", "error");
                }
            } catch (err) {
                els.aiOverlay.classList.add('hidden');
                els.aiOverlay.style.display = 'none';
                console.error(err);
                if(window.showToast) window.showToast("Terjadi kesalahan koneksi", "error");
            }
        });
    }

    function playSplashScreen(data) {
        const splash = els.splashScreen;
        splash.classList.remove('hidden'); // Tampilkan Splash Putih

        // Ambil Data Teaser (Siswa pertama atau General)
        const teaserName = data.length > 0 ? data[0].student_name : "KELAS";
        const teaserStatus = data.length > 0 ? (data[0].prediction.status_ui || "SELESAI") : "SELESAI";

        // Set Nama
        els.splashStudentName.innerText = teaserName;

        // Set Badge Status dengan Warna yang sesuai
        let badgeColorClass = "badge-ghost";
        if(teaserStatus === 'Aman') badgeColorClass = "bg-emerald-500 text-white border-none shadow-lg shadow-emerald-200";
        else if(teaserStatus === 'Pantau') badgeColorClass = "bg-yellow-400 text-white border-none shadow-lg shadow-yellow-200";
        else badgeColorClass = "bg-red-500 text-white border-none shadow-lg shadow-red-200";

        els.splashStatusContainer.innerHTML = `
            <div class="badge badge-lg px-8 py-6 text-2xl font-black ${badgeColorClass}">
                ${teaserStatus}
            </div>
        `;

        // === TIMING LOGIC ===
        // Total durasi animasi sekitar 3.5 detik (Wait Text 1 -> Text 2 -> Loading Bar -> Finish)
        
        setTimeout(() => {
            // Sembunyikan Splash
            splash.classList.add('hidden'); 
        }, 3500); 
    }

    // --- 3. RENDER CARD (Tetap Sama dengan Wireframe) ---
    function renderResultCards(data) {
        els.resultClassName.innerText = selectedClassName;
        els.resultCardContainer.innerHTML = '';

        data.forEach(item => {
            const pred = item.prediction;
            if (!pred) return;

            const label = pred.label || '-'; 
            const statusUI = pred.status_ui || '-'; 
            const recommendation = pred.recommendation || '-';
            const scores = item.scores || { rata_tugas: 0, nilai_uts: 0, nilai_uas: 0 };
            const confidence = pred.confidence_percent || { aman: 0, pantau: 0, bimbingan: 0 };

            let themeColor = ''; 
            let confidenceScore = 0;

            if (statusUI === 'Aman') {
                themeColor = 'text-emerald-600';
                confidenceScore = confidence.aman || 85; 
            } else if (statusUI === 'Pantau') {
                themeColor = 'text-yellow-600';
                confidenceScore = confidence.pantau || 65;
            } else {
                themeColor = 'text-red-600';
                confidenceScore = confidence.bimbingan || 40;
            }

            const nilaiAkhir = ((scores.rata_tugas + scores.nilai_uts + scores.nilai_uas) / 3).toFixed(1);

            const cardHTML = `
            <div class="flex flex-col gap-4 break-inside-avoid">
                <div class="bg-white rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Potensi - ${item.student_name} -</p>
                    <h2 class="text-3xl font-black text-gray-800 uppercase tracking-wide">
                        HASIL PREDIKSI <span class="${themeColor}">${statusUI}</span>
                    </h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[180px]">
                        <div class="radial-progress ${themeColor}" style="--value:${confidenceScore}; --size:6rem; --thickness: 8px;" role="progressbar">
                            <span class="text-lg font-bold text-gray-700">${confidenceScore}%</span>
                        </div>
                        <span class="text-xs text-gray-400 mt-3 font-bold uppercase">Tingkat Keyakinan AI</span>
                    </div>

                    <div class="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-center min-h-[180px] space-y-4">
                        <div>
                            <div class="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>TUGAS</span> <span>${scores.rata_tugas}</span></div>
                            <progress class="progress progress-primary w-full h-3" value="${scores.rata_tugas}" max="100"></progress>
                        </div>
                        <div>
                            <div class="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>UTS</span> <span>${scores.nilai_uts}</span></div>
                            <progress class="progress progress-info w-full h-3" value="${scores.nilai_uts}" max="100"></progress>
                        </div>
                        <div>
                            <div class="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>UAS</span> <span>${scores.nilai_uas}</span></div>
                            <progress class="progress progress-secondary w-full h-3" value="${scores.nilai_uas}" max="100"></progress>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-700 rounded-2xl p-6 shadow-md text-white">
                    <h3 class="text-sm font-bold uppercase tracking-widest mb-4 opacity-90 border-b border-gray-600 pb-2">
                        Kesimpulan dan Rekomendasi
                    </h3>
                    
                    <div class="bg-white text-gray-800 rounded-xl p-5">
                        <div class="grid grid-cols-2 gap-y-4 gap-x-8 text-sm mb-6">
                            <div>
                                <span class="block text-xs font-bold text-gray-400">Nama Siswa</span>
                                <span class="font-semibold text-base">${item.student_name}</span>
                            </div>
                            <div class="text-right">
                                <span class="block text-xs font-bold text-gray-400">Nilai Akhir</span>
                                <span class="font-semibold text-base">${nilaiAkhir}</span>
                            </div>
                            <div>
                                <span class="block text-xs font-bold text-gray-400">Kelas</span>
                                <span class="font-semibold text-base">${selectedClassName}</span>
                            </div>
                            <div class="text-right">
                                <span class="block text-xs font-bold text-gray-400">Potensi</span>
                                <span class="badge ${themeColor === 'text-emerald-600' ? 'badge-success' : themeColor === 'text-yellow-600' ? 'badge-warning' : 'badge-error'} text-white font-bold mt-1">
                                    ${label}
                                </span>
                            </div>
                        </div>

                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                            <p class="text-xs font-bold text-gray-400 uppercase mb-2">Rekomendasi</p>
                            <p class="text-sm italic text-gray-600 leading-relaxed">
                                "${recommendation}"
                            </p>
                        </div>
                    </div>
                </div>
                <div class="divider my-8"></div>
            </div>
            `;
            els.resultCardContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // --- 4. TOMBOL SIMPAN (Action: Tutup Modal & Show Toast) ---
    if (els.btnSaveData) {
        els.btnSaveData.addEventListener('click', () => {
            // Karena Backend SUDAH menyimpan (Upsert) saat request 'predict-bulk',
            // Tombol ini hanya bertugas memberi Feedback UX + Menutup Modal.
            
            // 1. Tampilkan Toast
            if (window.showToast) {
                window.showToast("Data hasil prediksi berhasil disimpan ke Database!", "success");
            }

            // 2. Tutup Modal
            els.resultModal.close();

            // 3. (Opsional) Refresh halaman jika ingin reset status
            // location.reload(); 
        });
    }

    // Init
    loadClasses();
});