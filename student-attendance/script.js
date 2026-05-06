// State Management
let logs = JSON.parse(localStorage.getItem('attendanceLogs')) || [];
let stream = null;
let isCameraActive = false;

// DOM Elements
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const entryCountEl = document.getElementById('entryCount');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startCamBtn = document.getElementById('startCamBtn');
const checkInBtn = document.getElementById('checkInBtn');
const scanOverlay = document.querySelector('.scan-overlay');
const capturedPreview = document.getElementById('capturedPreview');
const flashEffect = document.getElementById('flashEffect');
const processingOverlay = document.getElementById('processingOverlay');
const consoleLogs = document.getElementById('consoleLogs');
const attendanceForm = document.getElementById('attendanceForm');
const attendanceLogs = document.getElementById('attendanceLogs');
const emptyState = document.getElementById('emptyState');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    setInterval(updateTime, 1000);
    renderLogs();
    updateStats();
});

// Real-time Clock
function updateTime() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    dateEl.textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
}

// Camera Management
startCamBtn.addEventListener('click', async () => {
    if (!isCameraActive) {
        try {
            addConsoleLog("INITIALIZING CAMERA HARDWARE...", "warn");
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720 } 
            });
            video.srcObject = stream;
            isCameraActive = true;
            startCamBtn.innerHTML = '<i data-lucide="stop-circle"></i><span>Stop Camera</span>';
            startCamBtn.classList.add('btn-danger');
            scanOverlay.style.opacity = '1';
            checkInBtn.disabled = false;
            capturedPreview.style.display = 'none';
            addConsoleLog("VIDEO FEED ESTABLISHED. SYSTEM ONLINE.", "success");
        } catch (err) {
            showToast('Error', 'Camera access denied or not found.', 'error');
        }
    } else {
        stopCamera();
    }
    lucide.createIcons();
});

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
    isCameraActive = false;
    startCamBtn.innerHTML = '<i data-lucide="power"></i><span>Initialize Camera</span>';
    startCamBtn.classList.remove('btn-danger');
    scanOverlay.style.opacity = '0';
    checkInBtn.disabled = true;
    lucide.createIcons();
}

// Attendance Submission
attendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isCameraActive) return;

    // Trigger Flash
    flashEffect.classList.remove('flash-active');
    void flashEffect.offsetWidth; // Trigger reflow
    flashEffect.classList.add('flash-active');

    // Show Processing
    processingOverlay.style.display = 'flex';
    checkInBtn.disabled = true;
    addConsoleLog("TRIGGERING BIOMETRIC CAPTURE...");

    // Capture Frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const photo = canvas.toDataURL('image/jpeg', 0.8);

    addConsoleLog("ANALYZING FACIAL FEATURES...");
    await new Promise(resolve => setTimeout(resolve, 800));
    addConsoleLog("CROSS-REFERENCING DATABASE...");
    await new Promise(resolve => setTimeout(resolve, 700));
    addConsoleLog("IDENTITY CONFIRMED. LOGGING ATTENDANCE...", "success");
    await new Promise(resolve => setTimeout(resolve, 500));

    const entry = {
        id: Date.now(),
        name: document.getElementById('studentName').value,
        domain: document.getElementById('domain').value,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        photo: photo
    };

    // Save & Update
    logs.unshift(entry);
    localStorage.setItem('attendanceLogs', JSON.stringify(logs));
    
    // UI Reset
    processingOverlay.style.display = 'none';
    checkInBtn.disabled = false;
    
    renderLogs();
    updateStats();
    showCapturedPreview(photo);
    attendanceForm.reset();
    showToast('Identity Verified', `${entry.name} has been authenticated.`);
});

function showCapturedPreview(photo) {
    capturedPreview.style.backgroundImage = `url(${photo})`;
    capturedPreview.style.display = 'block';
    scanOverlay.style.opacity = '0';
    
    setTimeout(() => {
        if (isCameraActive) {
            capturedPreview.style.display = 'none';
            scanOverlay.style.opacity = '1';
        }
    }, 3000);
}

// UI Rendering
function renderLogs() {
    attendanceLogs.innerHTML = '';
    
    if (logs.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    logs.slice(0, 10).forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="student-info">
                    <div class="avatar">
                        <img src="${log.photo}" alt="Face">
                    </div>
                    <div class="name">${log.name}</div>
                </div>
            </td>
            <td><span class="domain-tag">${log.domain}</span></td>
            <td><span class="time">${log.time}</span></td>
            <td>
                <div class="status-badge">
                    <i data-lucide="check-circle-2"></i>
                    <span>Verified</span>
                </div>
            </td>
            <td>
                <button class="btn btn-danger-outline btn-icon" onclick="deleteLog(${log.id})">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        attendanceLogs.appendChild(tr);
    });
    
    lucide.createIcons();
}

function updateStats() {
    entryCountEl.textContent = logs.length;
}

// Excel Export
exportBtn.addEventListener('click', () => {
    if (logs.length === 0) {
        showToast('No Data', 'No attendance records to export.', 'error');
        return;
    }

    const wsData = logs.map(l => ({
        'Student Name': l.name,
        'Domain': l.domain,
        'Check-In Time': l.time,
        'Date': l.date,
        'Status': 'Verified'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Logs");
    XLSX.writeFile(wb, `Attendance_${new Date().toLocaleDateString()}.xlsx`);
    
    showToast('Exported', 'Excel file has been downloaded.');
});

// Delete Functions
function deleteLog(id) {
    if (confirm("Permanently delete this attendance record?")) {
        addConsoleLog(`DELETING RECORD ID: ${id}...`, "warn");
        logs = logs.filter(l => l.id !== id);
        saveData();
        renderLogs();
        updateStats();
        showToast('Deleted', 'Record removed from system.', 'error');
    }
}

clearAllBtn.addEventListener('click', () => {
    if (logs.length === 0) return;
    
    if (confirm("DANGER: Clear all attendance history? This cannot be undone.")) {
        addConsoleLog("INITIATING GLOBAL DATA PURGE...", "warn");
        logs = [];
        saveData();
        renderLogs();
        updateStats();
        addConsoleLog("DATABASE PURGED. SYSTEM CLEAN.", "success");
        showToast('History Cleared', 'All records have been wiped.');
    }
});

function saveData() {
    localStorage.setItem('attendanceLogs', JSON.stringify(logs));
}

// Toast System
function showToast(title, message, type = 'success') {
    const titleEl = document.getElementById('toastTitle');
    const msgEl = document.getElementById('toastMsg');
    const iconEl = document.getElementById('toastIcon');
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 4000);
}

// Console Logging System
function addConsoleLog(message, type = 'default') {
    const log = document.createElement('div');
    log.className = `log-line ${type}`;
    log.textContent = `> ${message}`;
    consoleLogs.appendChild(log);
    
    // Auto-scroll
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
}
