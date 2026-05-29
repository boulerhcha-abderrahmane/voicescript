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
const groqApiKeyEl   = document.getElementById('groqApiKey');
const toggleKeyBtn   = document.getElementById('toggleKey');
const eyeIcon        = document.getElementById('eyeIcon');
const saveKeyBtn     = document.getElementById('saveKey');
const groqLangEl     = document.getElementById('groqLang');
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
   GROQ API KEY – sauvegarde dans localStorage
============================================================ */
// Charger la clé sauvegardée au démarrage
const savedKey = localStorage.getItem('groq_api_key');
if (savedKey) groqApiKeyEl.value = savedKey;

// Afficher / masquer la clé
toggleKeyBtn.addEventListener('click', () => {
    const isPassword = groqApiKeyEl.type === 'password';
    groqApiKeyEl.type = isPassword ? 'text' : 'password';
    eyeIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
});

// Sauvegarder la clé
saveKeyBtn.addEventListener('click', () => {
    const key = groqApiKeyEl.value.trim();
    if (!key.startsWith('gsk_')) {
        showAlert('danger', '<i class="bi bi-key me-2"></i>Clé invalide. Elle doit commencer par <strong>gsk_</strong>.');
        return;
    }
    localStorage.setItem('groq_api_key', key);
    showAlert('success', '<i class="bi bi-check-circle me-2"></i>Clé API sauvegardée dans votre navigateur.');
});

/* ============================================================
   WEB SPEECH API – MICROPHONE
============================================================ */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition     = null;
let isRecording     = false;
let finalTranscript = '';

if (!SpeechRecognition) {
    micBtn.disabled = true;
    showAlert('warning',
        '<strong>Attention :</strong> Votre navigateur ne supporte pas la reconnaissance vocale en direct. ' +
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
   FICHIER AUDIO – Drag & Drop + Input
============================================================ */
let selectedFile = null;

dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') audioFile.click();
});
audioFile.addEventListener('change', () => {
    if (audioFile.files[0]) handleFileSelect(audioFile.files[0]);
});
removeFileBtn.addEventListener('click', resetFile);

function handleFileSelect(file) {
    const allowedExts = /\.(mp3|wav|m4a|ogg|webm|flac|mp4)$/i;
    const maxSize     = 25 * 1024 * 1024; // 25 Mo (limite Groq)

    if (!allowedExts.test(file.name)) {
        showAlert('danger', '<i class="bi bi-exclamation-triangle me-2"></i>Format non supporté. Utilisez MP3, WAV, M4A, OGG, WEBM ou FLAC.');
        return;
    }
    if (file.size > maxSize) {
        showAlert('danger', '<i class="bi bi-exclamation-triangle me-2"></i>Fichier trop volumineux. Maximum : 25 Mo (limite Groq).');
        return;
    }

    selectedFile = file;
    clearAlerts();
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

/* ============================================================
   GROQ WHISPER – Transcription fichier
============================================================ */
transcribeBtn.addEventListener('click', () => {
    if (!selectedFile) return;

    const apiKey = groqApiKeyEl.value.trim() || localStorage.getItem('groq_api_key') || '';
    if (!apiKey) {
        showAlert('danger',
            '<i class="bi bi-key me-2"></i>Entrez votre clé API Groq. ' +
            'Obtenez-la gratuitement sur <a href="https://console.groq.com" target="_blank" class="alert-link">console.groq.com</a>.');
        return;
    }
    if (!apiKey.startsWith('gsk_')) {
        showAlert('danger', '<i class="bi bi-key me-2"></i>Clé API invalide. Elle doit commencer par <strong>gsk_</strong>.');
        return;
    }

    transcribeWithGroq(selectedFile, apiKey);
});

async function transcribeWithGroq(file, apiKey) {
    showLoading(true);
    clearAlerts();
    transcribeBtn.disabled = true;

    // Construction du FormData pour l'API Groq Whisper
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3-turbo'); // Modèle le plus rapide
    formData.append('language', groqLangEl.value);
    formData.append('response_format', 'text');

    try {
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + apiKey },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = err?.error?.message || `Erreur HTTP ${res.status}`;

            // Message d'erreur adapté selon le code
            if (res.status === 401) {
                showAlert('danger', '<i class="bi bi-key me-2"></i>Clé API invalide ou expirée. Vérifiez sur console.groq.com.');
            } else if (res.status === 413) {
                showAlert('danger', '<i class="bi bi-exclamation-triangle me-2"></i>Fichier trop volumineux pour l\'API Groq (max 25 Mo).');
            } else if (res.status === 429) {
                showAlert('warning', '<i class="bi bi-clock me-2"></i>Limite de requêtes atteinte. Attendez quelques secondes et réessayez.');
            } else {
                showAlert('danger', `<i class="bi bi-x-circle me-2"></i>${msg}`);
            }
            return;
        }

        // La réponse est du texte brut (response_format: text)
        const text = await res.text();
        transcriptText.value = text.trim();
        updateCounters();
        showAlert('success', '<i class="bi bi-check-circle me-2"></i>Transcription Groq Whisper terminée avec succès !');

    } catch (e) {
        showAlert('danger', '<i class="bi bi-wifi-off me-2"></i>Erreur réseau. Vérifiez votre connexion internet.');
    } finally {
        showLoading(false);
        transcribeBtn.disabled = false;
    }
}

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
    if (autoDismiss) setTimeout(() => div.remove(), 6000);
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
