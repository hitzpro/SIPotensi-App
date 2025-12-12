import { getData, putData, postData } from '../../utils/api.js';
import { KEY } from '../../config.js';

const PUBLIC_VAPID_KEY = KEY.PUBLIC_VAPID_KEY; 

const els = {
    list: document.getElementById('notificationList'),
    loading: document.getElementById('loadingState'),
    empty: document.getElementById('emptyState'),
    btnMarkAll: document.getElementById('btnMarkAll'),
    togglePush: document.getElementById('toggle-push'),
    notifLabel: document.getElementById('notif-label')
};

document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
    checkSubscription();
    setupEventListeners();
});

// --- 1. CORE NOTIFICATION LOGIC ---

async function loadNotifications() {
    try {
        const res = await getData('/notifications');
        els.loading.classList.add('hidden');
        
        if(res.ok && res.data.data.length > 0) {
            renderList(res.data.data);
            els.list.classList.remove('hidden');
            // Enable button jika ada yang unread
            if(res.data.unread_count > 0) els.btnMarkAll.disabled = false;
        } else {
            els.empty.classList.remove('hidden');
            els.empty.style.display = 'flex';
        }
    } catch (error) {
        console.error("Gagal memuat notifikasi:", error);
    }
}

function renderList(notifications) {
    els.list.innerHTML = '';
    
    notifications.forEach(notif => {
        const style = getIcon(notif.tipe);
        const isUnread = !notif.is_read;
        
        // Visual distinction for unread items
        const cardBg = isUnread 
            ? 'bg-white border-l-4 border-l-primary shadow-sm' 
            : 'bg-gray-50 border border-gray-100 opacity-80';
        
        const item = document.createElement('div');
        item.className = `relative p-4 rounded-xl ${cardBg} transition-all active:scale-[0.98] cursor-pointer`;
        
        // Attach click event
        item.onclick = () => handleClick(notif.id, notif.link_url, notif.is_read);
        
        item.innerHTML = `
            ${isUnread ? '<span class="w-2 h-2 rounded-full bg-red-500 absolute top-4 right-4 animate-pulse"></span>' : ''}
            <div class="flex gap-4 items-start">
                <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg}">
                    <i class="fa-solid ${style.icon}"></i>
                </div>
                <div class="flex-1 pr-2">
                    <h4 class="${isUnread ? 'font-bold text-gray-800' : 'font-medium text-gray-600'} text-sm mb-1 line-clamp-2">${notif.judul}</h4>
                    <p class="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">${notif.pesan}</p>
                    <span class="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <i class="fa-regular fa-clock"></i> ${formatTime(notif.created_at)}
                    </span>
                </div>
            </div>`;
        els.list.appendChild(item);
    });
}

async function handleClick(id, url, isRead) {
    // Optimistic UI update (biar cepat)
    if(!isRead) {
        try {
            await putData(`/notifications/${id}/read`, {});
        } catch(e) { console.error(e); }
    }
    
    if(url && url !== '#') {
        window.location.href = url;
    } else {
        // Reload list jika tidak pindah halaman
        loadNotifications();
    }
}

// Helper UI
function getIcon(type) {
    switch (type) {
        case 'tugas': return { icon: 'fa-book', bg: 'bg-blue-100 text-blue-600' };
        case 'ujian': return { icon: 'fa-file-pen', bg: 'bg-orange-100 text-orange-600' };
        case 'info': return { icon: 'fa-bullhorn', bg: 'bg-emerald-100 text-emerald-600' };
        case 'warning': return { icon: 'fa-triangle-exclamation', bg: 'bg-red-100 text-red-600' };
        default: return { icon: 'fa-bell', bg: 'bg-gray-100 text-gray-500' };
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function setupEventListeners() {
    if(els.btnMarkAll) {
        els.btnMarkAll.addEventListener('click', async () => {
            const confirmed = await showConfirm('Tandai semua dibaca?', 'Notifikasi yang belum dibaca akan ditandai.', 'Ya', 'primary');
            if(confirmed) {
                await putData('/notifications/read-all', {});
                loadNotifications();
                showToast('Semua notifikasi ditandai sudah dibaca', 'success');
            }
        });
    }

    if(els.togglePush) {
        els.togglePush.addEventListener('change', (e) => {
            if (e.target.checked) {
                subscribeUser();
            } else {
                unsubscribeUser();
            }
        });
    }
}

// --- 2. PUSH NOTIFICATION LOGIC ---

// Utility: Convert VAPID Key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
}

async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push not supported');
        els.notifLabel.innerText = "Not Supported";
        els.togglePush.disabled = true;
        return;
    }

    // Register SW jika belum (biasanya di main layout, tapi double check disini aman)
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    if (sub) {
        updatePushUI(true);
    } else {
        updatePushUI(false);
        // Tampilkan Popup Penawaran jika belum subscribe dan belum pernah menolak
        if (!localStorage.getItem('push_declined')) {
            askPermissionPopup(); 
        }
    }
}

function updatePushUI(isSubscribed) {
    els.togglePush.checked = isSubscribed;
    els.notifLabel.innerText = isSubscribed ? "Push On" : "Push Off";
}

async function askPermissionPopup() {
    // Menggunakan AlertSystem global
    const answer = await showConfirm(
        'Aktifkan Notifikasi?', 
        'Dapatkan info tugas & materi terbaru langsung di HP Anda.', 
        'Ya, Aktifkan', 
        'primary'
    );

    if (answer) {
        subscribeUser();
    } else {
        localStorage.setItem('push_declined', 'true');
    }
}

async function subscribeUser() {
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        // Kirim Subscription ke Backend
        await postData('/notifications/subscribe', sub);
        
        updatePushUI(true);
        showToast("Notifikasi berhasil diaktifkan!", "success");

    } catch (err) {
        console.error('Sub Failed', err);
        updatePushUI(false);
        
        if (Notification.permission === 'denied') {
            showToast("Izin notifikasi diblokir browser. Mohon reset izin situs.", "error");
        } else {
            showToast("Gagal mengaktifkan notifikasi.", "error");
        }
    }
}

async function unsubscribeUser() {
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        
        if (sub) {
            // 1. Hapus dari Backend DULU agar server tau
            await postData('/notifications/unsubscribe', { endpoint: sub.endpoint });
            
            // 2. Unsubscribe dari Browser
            await sub.unsubscribe();
            
            updatePushUI(false);
            showToast("Notifikasi dimatikan.", "warning");
        }
    } catch(e) {
        console.error(e);
        // Tetap matikan UI visual agar user tidak bingung, meski backend error
        updatePushUI(false);
        showToast("Gagal unsubscribe backend, tapi lokal dimatikan.", "error");
    }
}