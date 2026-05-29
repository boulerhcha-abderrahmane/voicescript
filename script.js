'use strict';

/* ============================================================
   ÉLÉMENTS DOM
============================================================ */
const themeToggle    = document.getElementById('themeToggle');
const themeIcon      = document.getElementById('themeIcon');
const modeTabs       = document.getElementById('modeTabs');
const micPanel       = document.getElementById('micPanel');
const filePanel      = document.getElementById('filePanel');
const micBtn         = document.getElementById('micBtn');
const micIcon        = document.getElementById('micIcon');
const micStatus      = document.getElementById('micStatus');
const langSelect     = document.getElementById('langSelect');
const dropZone       = document.getElementById('dropZone');
const audioFile      = document.getElementById('audioFile');
const filePreview    = document.getElementById('filePreview');
const fileNameEl     = document.getElementById('fileName');
const fileSizeEl     = document.getElementById('fileSize');
const audioPlayer    = document.getElementById('audioPlayer');
const removeFileBtn  = document.getElementById('removeFile');
const transcribeBtn  = document.getElementById('transcribeBtn');
const transcriptText = document.getElementById('transcriptText');
const loadingAnim    = document.getElementById('loadingAnim');
const copyBtn        = document.getElementById('copyBtn');
const downloadBtn    = document.getElementById('downloadBtn');
const clearBtn       = document.getElementById('clearBtn');
const wordCount      = document.getElementById('wordCount');
const charCount      = document.getElementById('charCount');
const alertBox       = document.getElementById('alertBox');

/* ============================================================
   MODE SOMBRE
============================================================ */
applyTheme(localStorage.getItem('theme') || 'light');

themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
});

function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

/* ============================================================
   ONGLETS
============================================================ */
modeTabs.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
        modeTabs.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.mode === 'mic') {
            micPanel.classList.remove('d-none');
            filePanel.classList.add('d-none');
        } else {
            filePanel.classList.remove('d-none');
            micPanel.classList.add('d-none');
            if (isRecording) stopRecognition();
        }
    });
});

/* ============================================================
   WEB SPEECH API – MICROPHONE
============================================================ */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition    = null;
let isRecording    = false;
let finalTranscript = '';

if (!SpeechRecognition) {
    micBtn.disabled = true;
    showAlert('warning',
        '<strong>Attention :</strong> Votre navigateur ne supporte pas la reconnaissance vocale. ' +
        'Utilisez <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.', false);
} else {
    recognition = new SpeechRecognition();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = langSelect.value;

    langSelect.addEventListener('change', () => { recognition.lang = langSelect.value; });

    recognition.addEventListener('result', (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            e.results[i].isFinal ? (finalTranscript += t + ' ') : (interim += t);
        }
        transcriptText.value = finalTranscript + interim;
        updateCounters();
    });

    recognition.addEventListener('error', (e) => {
        const msgs = {
            'no-speech':   'Aucune voix détectée. Vérifiez votre micro.',
            'not-allowed': 'Permission microphone refusée.',
            'network':     'Erreur réseau. Vérifiez votre connexion.',
        };
        showAlert('danger', msgs[e.error] || `Erreur : ${e.error}`);
        stopRecognition();
    });

    // Redémarrage automatique pour la continuité
    recognition.addEventListener('end', () => {
        if (isRecording) try { recognition.start(); } catch (_) { stopRecognition(); }
    });
}

micBtn.addEventListener('click', () => {
    if (!SpeechRecognition) return;
    isRecording ? stopRecognition() : startRecognition();
});

function startRecognition() {
    finalTranscript = transcriptText.value;
    recognition.lang = langSelect.value;
    recognition.start();
    isRecording = true;
    micBtn.classList.add('recording');
    micIcon.className = 'bi bi-stop-fill fs-1';
    micStatus.innerHTML = '<i class="bi bi-circle-fill me-1 text-danger small"></i> Enregistrement en cours…';
    micStatus.classList.add('recording');
    micStatus.classList.remove('done');
    clearAlerts();
}

function stopRecognition() {
    if (recognition) recognition.stop();
    isRecording = false;
    micBtn.classList.remove('recording');
    micIcon.className = 'bi bi-mic-fill fs-1';
    micStatus.innerHTML = '<i class="bi bi-circle-fill me-1 text-success small"></i> Enregistrement terminé';
    micStatus.classList.remove('recording');
    micStatus.classList.add('done');
    if (transcriptText.value.trim()) {
        showAlert('success', '<i class="bi bi-check-circle me-2"></i>Transcription terminée !');
    }
}

/* ============================================================
   FICHIER AUDIO – LOCAL (pas d'upload serveur)
============================================================ */
let selectedFile = null;

// Drag & drop
dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
});

// Clic sur la zone (hors label/input)
dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') audioFile.click();
});

audioFile.addEventListener('change', () => {
    if (audioFile.files[0]) handleFileSelect(audioFile.files[0]);
});

removeFileBtn.addEventListener('click', resetFile);

function handleFileSelect(file) {
    const allowedExts = /\.(mp3|wav|m4a|ogg|webm)$/i;
    const maxSize     = 10 * 1024 * 1024;

    if (!allowedExts.test(file.name)) {
        showAlert('danger', '<i class="bi bi-exclamation-triangle me-2"></i>Format non supporté. Utilisez MP3, WAV, M4A, OGG ou WEBM.');
        return;
    }
    if (file.size > maxSize) {
        showAlert('danger', '<i class="bi bi-exclamation-triangle me-2"></i>Fichier trop volumineux. Maximum : 10 Mo.');
        return;
    }

    selectedFile = file;
    clearAlerts();

    // Lecture locale via URL.createObjectURL — aucun upload serveur
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);
    audioPlayer.src        = URL.createObjectURL(file);
    filePreview.classList.remove('d-none');
    transcribeBtn.disabled = false;
}

function resetFile() {
    selectedFile = null;
    audioFile.value = '';
    URL.revokeObjectURL(audioPlayer.src);
    audioPlayer.src = '';
    filePreview.classList.add('d-none');
    transcribeBtn.disabled = true;
}

// Bouton Transcrire → joue le fichier + démarre la reconnaissance
transcribeBtn.addEventListener('click', () => {
    if (!selectedFile) return;

    if (!SpeechRecognition) {
        showAlert('danger', 'La reconnaissance vocale n\'est pas disponible dans ce navigateur.');
        return;
    }

    const fileRec = new SpeechRecognition();
    fileRec.continuous     = true;
    fileRec.interimResults = true;
    fileRec.lang           = langSelect.value;

    let accumulated = '';

    showLoading(true);
    clearAlerts();
    transcribeBtn.disabled = true;

    fileRec.addEventListener('result', (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            e.results[i].isFinal ? (accumulated += t + ' ') : (interim += t);
        }
        transcriptText.value = accumulated + interim;
        updateCounters();
    });

    fileRec.addEventListener('end', () => {
        audioPlayer.pause();
        showLoading(false);
        transcribeBtn.disabled = false;
        showAlert('success', '<i class="bi bi-check-circle me-2"></i>Transcription du fichier terminée !');
    });

    fileRec.addEventListener('error', () => {
        audioPlayer.pause();
        showLoading(false);
        transcribeBtn.disabled = false;
        showAlert('warning',
            '<i class="bi bi-exclamation-triangle me-2"></i>' +
            'La transcription de fichiers fonctionne mieux sur Chrome. ' +
            'Vous pouvez aussi lire le fichier et utiliser l\'onglet <strong>Microphone en direct</strong>.'
        );
    });

    audioPlayer.currentTime = 0;
    audioPlayer.play();
    fileRec.start();

    // Arrêt automatique quand l'audio se termine
    audioPlayer.addEventListener('ended', () => {
        try { fileRec.stop(); } catch (_) {}
    }, { once: true });
});

/* ============================================================
   COPIER
============================================================ */
copyBtn.addEventListener('click', async () => {
    const text = transcriptText.value.trim();
    if (!text) { showAlert('warning', '<i class="bi bi-clipboard-x me-2"></i>Aucun texte à copier.'); return; }
    try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = '<i class="bi bi-clipboard-check me-1"></i>Copié !';
        copyBtn.classList.replace('btn-outline-primary', 'btn-success');
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Copier';
            copyBtn.classList.replace('btn-success', 'btn-outline-primary');
        }, 2000);
    } catch {
        showAlert('danger', 'Impossible d\'accéder au presse-papiers.');
    }
});

/* ============================================================
   TÉLÉCHARGER TXT
============================================================ */
downloadBtn.addEventListener('click', () => {
    const text = transcriptText.value.trim();
    if (!text) { showAlert('warning', '<i class="bi bi-download me-2"></i>Aucun texte à télécharger.'); return; }
    const blob     = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const filename = 'transcription_' + new Date().toISOString().slice(0,19).replace(/[T:]/g, '-') + '.txt';
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showAlert('success', `<i class="bi bi-file-earmark-check me-2"></i>Fichier <strong>${filename}</strong> téléchargé.`);
});

/* ============================================================
   EFFACER
============================================================ */
clearBtn.addEventListener('click', () => {
    if (!transcriptText.value.trim()) return;
    if (confirm('Voulez-vous vraiment effacer tout le texte ?')) {
        transcriptText.value = '';
        finalTranscript = '';
        updateCounters();
        clearAlerts();
    }
});

/* ============================================================
   COMPTEURS
============================================================ */
transcriptText.addEventListener('input', updateCounters);

function updateCounters() {
    const text  = transcriptText.value;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    wordCount.textContent = words + (words <= 1 ? ' mot' : ' mots');
    charCount.textContent = text.length + ' caractère' + (text.length <= 1 ? '' : 's');
}

/* ============================================================
   UTILITAIRES
============================================================ */
function showLoading(show) {
    loadingAnim.classList.toggle('d-none', !show);
    transcriptText.classList.toggle('d-none', show);
}

function showAlert(type, message, autoDismiss = true) {
    const div = document.createElement('div');
    div.className = `alert alert-${type} alert-dismissible d-flex align-items-center gap-2`;
    div.innerHTML = `<span>${message}</span><button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>`;
    alertBox.innerHTML = '';
    alertBox.appendChild(div);
    if (autoDismiss) setTimeout(() => div.remove(), 5000);
}

function clearAlerts() { alertBox.innerHTML = ''; }

function formatBytes(bytes) {
    if (bytes < 1024)        return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(2) + ' Mo';
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        const t = document.querySelector(a.getAttribute('href'));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
});
