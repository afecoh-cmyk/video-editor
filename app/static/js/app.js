// === VideoEditor Pro - Main Application JS ===

const PROJECT_ID = document.querySelector('.editor-layout')?.dataset.projectId;
let segments = [];
let assets = [];
let audioTracks = [];
let selectedSegmentId = null;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!PROJECT_ID) return;
    loadAssets();
    loadSegments();
    loadAudioTracks();
    setupUpload();
    setupDragDrop();
});

// ============================================================
// API HELPERS
// ============================================================
async function api(url, method = 'GET', body = null) {
    const opts = { method, headers: {} };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return res.json();
}

function formatTime(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function getAssetById(id) {
    return assets.find(a => a.id === id);
}

// ============================================================
// ASSETS
// ============================================================
async function loadAssets() {
    assets = await api(`/api/projects/${PROJECT_ID}/assets`);
    renderAssets();
}

function renderAssets() {
    const videoList = document.getElementById('video-assets');
    const audioList = document.getElementById('audio-assets');
    if (!videoList || !audioList) return;

    const videos = assets.filter(a => a.file_type === 'video');
    const audios = assets.filter(a => a.file_type === 'audio');

    videoList.innerHTML = videos.length ? videos.map(a => `
        <div class="asset-item" draggable="true" data-asset-id="${a.id}" data-type="video"
             ondragstart="onAssetDragStart(event, '${a.id}')">
            <div class="asset-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
            </div>
            <div class="asset-info">
                <span class="asset-name" title="${a.original_name}">${a.original_name}</span>
                <span class="asset-duration">${formatTime(a.duration)} | ${a.width}x${a.height}</span>
            </div>
            <button class="btn btn-icon btn-danger" onclick="deleteAsset('${a.id}')" title="Törlés">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('') : '<p style="font-size:12px;color:var(--text-muted);padding:8px">Nincs videó feltöltve</p>';

    audioList.innerHTML = audios.length ? audios.map(a => `
        <div class="asset-item" data-asset-id="${a.id}" data-type="audio">
            <div class="asset-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
            </div>
            <div class="asset-info">
                <span class="asset-name" title="${a.original_name}">${a.original_name}</span>
                <span class="asset-duration">${formatTime(a.duration)}</span>
            </div>
            <button class="btn btn-icon btn-primary btn-sm" onclick="openAudioModal('${a.id}')" title="Hozzáadás hangsávként">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
            </button>
            <button class="btn btn-icon btn-danger" onclick="deleteAsset('${a.id}')" title="Törlés">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('') : '<p style="font-size:12px;color:var(--text-muted);padding:8px">Nincs hang feltöltve</p>';
}

async function deleteAsset(assetId) {
    if (!confirm('Biztosan törölni szeretnéd?')) return;
    await api(`/api/projects/${PROJECT_ID}/assets/${assetId}`, 'DELETE');
    loadAssets();
}

// ============================================================
// FILE UPLOAD
// ============================================================
function setupUpload() {
    const input = document.getElementById('file-upload');
    if (!input) return;

    input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const progressDiv = document.getElementById('upload-progress');
        progressDiv.classList.remove('hidden');

        for (const file of files) {
            progressDiv.innerHTML = `<div style="font-size:12px;color:var(--text-secondary)">Feltöltés: ${file.name}...</div>
                <div class="progress-bar" style="margin-top:6px"><div class="progress-fill" id="upload-fill" style="width:0%"></div></div>`;

            const formData = new FormData();
            formData.append('file', file);

            await new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `/api/projects/${PROJECT_ID}/assets/upload`);
                xhr.upload.onprogress = (ev) => {
                    if (ev.lengthComputable) {
                        const pct = Math.round((ev.loaded / ev.total) * 100);
                        const fill = document.getElementById('upload-fill');
                        if (fill) fill.style.width = pct + '%';
                    }
                };
                xhr.onload = () => resolve();
                xhr.onerror = () => resolve();
                xhr.send(formData);
            });
        }

        progressDiv.classList.add('hidden');
        input.value = '';
        loadAssets();
    });
}

// ============================================================
// DRAG & DROP (Asset -> Segment)
// ============================================================
let draggedAssetId = null;

function onAssetDragStart(e, assetId) {
    draggedAssetId = assetId;
    e.dataTransfer.effectAllowed = 'copy';
    e.target.classList.add('dragging');
    setTimeout(() => e.target.classList.remove('dragging'), 100);
}

function setupDragDrop() {
    const timeline = document.getElementById('timeline-segments');
    if (!timeline) return;

    timeline.addEventListener('dragover', (e) => {
        e.preventDefault();
        const card = e.target.closest('.segment-card');
        if (card) card.classList.add('drag-over');
    });

    timeline.addEventListener('dragleave', (e) => {
        const card = e.target.closest('.segment-card');
        if (card) card.classList.remove('drag-over');
    });

    timeline.addEventListener('drop', async (e) => {
        e.preventDefault();
        const card = e.target.closest('.segment-card');
        if (card) {
            card.classList.remove('drag-over');
            const segId = card.dataset.segmentId;
            if (draggedAssetId && segId) {
                await assignClipToSegment(segId, draggedAssetId);
            }
        }
        draggedAssetId = null;
    });
}

async function assignClipToSegment(segmentId, assetId) {
    const asset = getAssetById(assetId);
    if (!asset) return;

    const seg = segments.find(s => s.id === segmentId);
    if (!seg) return;

    const clipData = {
        clip: {
            asset_id: assetId,
            clip_start: 0,
            clip_end: Math.min(asset.duration, seg.duration),
        }
    };

    await api(`/api/projects/${PROJECT_ID}/segments/${segmentId}`, 'PUT', clipData);
    loadSegments();
}

// ============================================================
// SEGMENTS / STORYBOARD
// ============================================================
async function loadSegments() {
    segments = await api(`/api/projects/${PROJECT_ID}/segments`);
    renderTimeline();
}

function renderTimeline() {
    const container = document.getElementById('timeline-segments');
    if (!container) return;

    if (!segments.length) {
        container.innerHTML = '<div class="empty-timeline"><p>Adj hozzá szegmenseket a storyboardhoz</p></div>';
        return;
    }

    const sorted = [...segments].sort((a, b) => a.order - b.order);
    container.innerHTML = sorted.map((seg, i) => {
        const clipAsset = seg.clip?.asset_id ? getAssetById(seg.clip.asset_id) : null;
        const hasText = seg.text_overlay?.text;
        const isSelected = seg.id === selectedSegmentId;

        return `
        <div class="segment-card ${isSelected ? 'selected' : ''}"
             data-segment-id="${seg.id}"
             onclick="selectSegment('${seg.id}')"
             ondragover="event.preventDefault();this.classList.add('drag-over')"
             ondragleave="this.classList.remove('drag-over')"
             ondrop="this.classList.remove('drag-over')">
            <span class="segment-order">#${i + 1}</span>
            <div class="segment-label">${seg.label || 'Szegmens'}</div>
            <div class="segment-duration">${seg.duration}mp</div>
            ${seg.transition_in !== 'cut' ? `<div class="segment-transition">${seg.transition_in} (${seg.transition_duration}mp)</div>` : ''}
            ${clipAsset ? `<div class="segment-clip-badge">${clipAsset.original_name}</div>` : ''}
            ${hasText ? `<div class="segment-text-badge">Szöveg</div>` : ''}
        </div>`;
    }).join('');

    // Render audio tracks section
    renderAudioTracksInTimeline();
}

async function addSegment() {
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
    await api(`/api/projects/${PROJECT_ID}/segments`, 'POST', {
        label: `Szegmens ${segments.length + 1}`,
        duration: 5.0,
        transition_in: 'cut',
        transition_duration: 0.5,
    });
    loadSegments();
}

function selectSegment(segId) {
    selectedSegmentId = segId;
    renderTimeline();
    renderSegmentEditor();
}

function closeSegmentEditor() {
    selectedSegmentId = null;
    renderTimeline();
    document.getElementById('segment-editor-body').innerHTML =
        '<div class="editor-placeholder"><p>Válassz egy szegmenst a szerkesztéshez</p></div>';
}

function renderSegmentEditor() {
    const seg = segments.find(s => s.id === selectedSegmentId);
    const body = document.getElementById('segment-editor-body');
    if (!seg || !body) return;

    const clipAsset = seg.clip?.asset_id ? getAssetById(seg.clip.asset_id) : null;
    const textOverlay = seg.text_overlay || {};
    const videoOptions = assets.filter(a => a.file_type === 'video').map(a =>
        `<option value="${a.id}" ${seg.clip?.asset_id === a.id ? 'selected' : ''}>${a.original_name} (${formatTime(a.duration)})</option>`
    ).join('');

    body.innerHTML = `
        <!-- Basic Info -->
        <div class="editor-section">
            <h4>Alapadatok</h4>
            <div class="form-group">
                <label>Név</label>
                <input type="text" id="seg-label" value="${seg.label || ''}" onchange="updateSegField('label', this.value)">
            </div>
            <div class="form-group">
                <label>Időtartam (mp)</label>
                <input type="number" id="seg-duration" value="${seg.duration}" min="0.5" step="0.5" onchange="updateSegField('duration', parseFloat(this.value))">
            </div>
        </div>

        <!-- Clip Assignment -->
        <div class="editor-section">
            <h4>Videó klip</h4>
            <div class="form-group">
                <label>Klip kiválasztása</label>
                <select id="seg-clip-asset" onchange="onClipAssetChange(this.value)">
                    <option value="">-- Nincs klip --</option>
                    ${videoOptions}
                </select>
            </div>
            ${clipAsset ? `
            <div class="form-row">
                <div class="form-group">
                    <label>Kezdés (mp)</label>
                    <input type="number" id="seg-clip-start" value="${seg.clip?.clip_start || 0}" min="0" step="0.1"
                           max="${clipAsset.duration}" onchange="updateClipRange()">
                </div>
                <div class="form-group">
                    <label>Vég (mp)</label>
                    <input type="number" id="seg-clip-end" value="${seg.clip?.clip_end || clipAsset.duration}" min="0" step="0.1"
                           max="${clipAsset.duration}" onchange="updateClipRange()">
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" ${seg.mute_original_audio ? 'checked' : ''} onchange="updateSegField('mute_original_audio', this.checked)">
                    Eredeti hang némítása
                </label>
            </div>
            ` : '<p style="font-size:12px;color:var(--text-muted)">Húzz ide egy videót a bal oldali panelből, vagy válassz a listából</p>'}
        </div>

        <!-- Transition -->
        <div class="editor-section">
            <h4>Átmenet</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Típus</label>
                    <select id="seg-transition" onchange="updateSegField('transition_in', this.value)">
                        <option value="cut" ${seg.transition_in === 'cut' ? 'selected' : ''}>Vágás (cut)</option>
                        <option value="fade" ${seg.transition_in === 'fade' ? 'selected' : ''}>Fade</option>
                        <option value="crossfade" ${seg.transition_in === 'crossfade' ? 'selected' : ''}>Crossfade</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Időtartam (mp)</label>
                    <input type="number" id="seg-transition-dur" value="${seg.transition_duration}" min="0" max="3" step="0.1"
                           onchange="updateSegField('transition_duration', parseFloat(this.value))">
                </div>
            </div>
        </div>

        <!-- Text Overlay -->
        <div class="editor-section">
            <h4>Szöveg overlay</h4>
            <div class="form-group">
                <label>Szöveg</label>
                <textarea id="seg-text" onchange="updateTextOverlay()">${textOverlay.text || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Betűméret</label>
                    <input type="number" id="seg-font-size" value="${textOverlay.font_size || 48}" min="12" max="200"
                           onchange="updateTextOverlay()">
                </div>
                <div class="form-group">
                    <label>Szín</label>
                    <select id="seg-text-color" onchange="updateTextOverlay()">
                        <option value="white" ${(textOverlay.color || 'white') === 'white' ? 'selected' : ''}>Fehér</option>
                        <option value="black" ${textOverlay.color === 'black' ? 'selected' : ''}>Fekete</option>
                        <option value="yellow" ${textOverlay.color === 'yellow' ? 'selected' : ''}>Sárga</option>
                        <option value="red" ${textOverlay.color === 'red' ? 'selected' : ''}>Piros</option>
                        <option value="#00d68f" ${textOverlay.color === '#00d68f' ? 'selected' : ''}>Zöld</option>
                        <option value="#6c5ce7" ${textOverlay.color === '#6c5ce7' ? 'selected' : ''}>Lila</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Pozíció</label>
                <select id="seg-text-pos" onchange="updateTextOverlay()">
                    <option value="center" ${(textOverlay.position || 'center') === 'center' ? 'selected' : ''}>Középen</option>
                    <option value="top" ${textOverlay.position === 'top' ? 'selected' : ''}>Fent</option>
                    <option value="bottom" ${textOverlay.position === 'bottom' ? 'selected' : ''}>Lent</option>
                    <option value="top-left" ${textOverlay.position === 'top-left' ? 'selected' : ''}>Bal fent</option>
                    <option value="top-right" ${textOverlay.position === 'top-right' ? 'selected' : ''}>Jobb fent</option>
                    <option value="bottom-left" ${textOverlay.position === 'bottom-left' ? 'selected' : ''}>Bal lent</option>
                    <option value="bottom-right" ${textOverlay.position === 'bottom-right' ? 'selected' : ''}>Jobb lent</option>
                </select>
            </div>
            <div class="form-group">
                <label>Betűtípus</label>
                <select id="seg-font" onchange="updateTextOverlay()">
                    <option value="Arial" ${(textOverlay.font_name || 'Arial') === 'Arial' ? 'selected' : ''}>Arial</option>
                    <option value="Arial Bold" ${textOverlay.font_name === 'Arial Bold' ? 'selected' : ''}>Arial Bold</option>
                    <option value="Impact" ${textOverlay.font_name === 'Impact' ? 'selected' : ''}>Impact</option>
                    <option value="Georgia" ${textOverlay.font_name === 'Georgia' ? 'selected' : ''}>Georgia</option>
                    <option value="Times New Roman" ${textOverlay.font_name === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                    <option value="Verdana" ${textOverlay.font_name === 'Verdana' ? 'selected' : ''}>Verdana</option>
                </select>
            </div>
        </div>

        <!-- Delete -->
        <div class="editor-section" style="border-bottom:none">
            <button class="btn btn-danger" onclick="deleteSegment('${seg.id}')" style="width:100%">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Szegmens törlése
            </button>
        </div>
    `;
}

// Segment update helpers
async function updateSegField(field, value) {
    if (!selectedSegmentId) return;
    await api(`/api/projects/${PROJECT_ID}/segments/${selectedSegmentId}`, 'PUT', { [field]: value });
    loadSegments();
}

async function onClipAssetChange(assetId) {
    if (!selectedSegmentId) return;
    const asset = getAssetById(assetId);
    const seg = segments.find(s => s.id === selectedSegmentId);
    const clip = assetId ? {
        asset_id: assetId,
        clip_start: 0,
        clip_end: asset ? Math.min(asset.duration, seg?.duration || 5) : 0,
    } : {};
    await api(`/api/projects/${PROJECT_ID}/segments/${selectedSegmentId}`, 'PUT', { clip });
    await loadSegments();
    renderSegmentEditor();
}

async function updateClipRange() {
    if (!selectedSegmentId) return;
    const seg = segments.find(s => s.id === selectedSegmentId);
    if (!seg?.clip?.asset_id) return;
    const clip = {
        asset_id: seg.clip.asset_id,
        clip_start: parseFloat(document.getElementById('seg-clip-start').value) || 0,
        clip_end: parseFloat(document.getElementById('seg-clip-end').value) || 0,
    };
    await api(`/api/projects/${PROJECT_ID}/segments/${selectedSegmentId}`, 'PUT', { clip });
    loadSegments();
}

async function updateTextOverlay() {
    if (!selectedSegmentId) return;
    const text_overlay = {
        text: document.getElementById('seg-text')?.value || '',
        font_size: parseInt(document.getElementById('seg-font-size')?.value) || 48,
        color: document.getElementById('seg-text-color')?.value || 'white',
        position: document.getElementById('seg-text-pos')?.value || 'center',
        font_name: document.getElementById('seg-font')?.value || 'Arial',
        fade_in: 0.5,
        fade_out: 0.5,
    };
    await api(`/api/projects/${PROJECT_ID}/segments/${selectedSegmentId}`, 'PUT', { text_overlay });
    loadSegments();
}

async function deleteSegment(segId) {
    if (!confirm('Biztosan törölni szeretnéd ezt a szegmenst?')) return;
    await api(`/api/projects/${PROJECT_ID}/segments/${segId}`, 'DELETE');
    if (selectedSegmentId === segId) closeSegmentEditor();
    loadSegments();
}

// ============================================================
// AUDIO TRACKS
// ============================================================
async function loadAudioTracks() {
    audioTracks = await api(`/api/projects/${PROJECT_ID}/audio_tracks`);
    renderAudioTracksInTimeline();
}

function renderAudioTracksInTimeline() {
    // Add audio section after segments
    let audioSection = document.querySelector('.timeline-audio');
    if (!audioSection) {
        audioSection = document.createElement('div');
        audioSection.className = 'timeline-audio';
        const timelineArea = document.querySelector('.timeline-area');
        if (timelineArea) timelineArea.appendChild(audioSection);
    }

    const roleLabels = { music: 'Zene', narration: 'Narráció', sfx: 'SFX' };

    audioSection.innerHTML = `
        <div class="timeline-audio-header">
            <h4>Hangsávok</h4>
            <button class="btn btn-sm btn-secondary" onclick="openAudioModal()">+ Hangsáv</button>
        </div>
        ${audioTracks.length ? audioTracks.map(t => {
            const asset = getAssetById(t.asset_id);
            return `
            <div class="audio-track-item">
                <span class="audio-track-role ${t.role}">${roleLabels[t.role] || t.role}</span>
                <span style="flex:1;font-size:12px">${asset?.original_name || 'Ismeretlen'}</span>
                <span style="font-size:11px;color:var(--text-muted)">${Math.round(t.volume * 100)}%</span>
                ${t.loop ? '<span style="font-size:10px;color:var(--info)">LOOP</span>' : ''}
                <button class="btn btn-icon btn-danger" onclick="deleteAudioTrack('${t.id}')" style="opacity:1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>`;
        }).join('') : '<p style="font-size:12px;color:var(--text-muted)">Nincs hangsáv</p>'}
    `;
}

function openAudioModal(preselectedAssetId) {
    const modal = document.getElementById('audio-modal');
    modal.classList.remove('hidden');

    const select = document.getElementById('audio-track-asset');
    const audioAssets = assets.filter(a => a.file_type === 'audio');
    select.innerHTML = audioAssets.map(a =>
        `<option value="${a.id}" ${a.id === preselectedAssetId ? 'selected' : ''}>${a.original_name} (${formatTime(a.duration)})</option>`
    ).join('');

    // Volume slider display
    const volumeSlider = document.getElementById('audio-track-volume');
    const volumeDisplay = document.getElementById('audio-volume-display');
    volumeSlider.oninput = () => {
        volumeDisplay.textContent = Math.round(volumeSlider.value * 100) + '%';
    };
}

function closeAudioModal() {
    document.getElementById('audio-modal').classList.add('hidden');
}

async function submitAudioTrack(e) {
    e.preventDefault();
    const track = {
        asset_id: document.getElementById('audio-track-asset').value,
        role: document.getElementById('audio-track-role').value,
        volume: parseFloat(document.getElementById('audio-track-volume').value),
        start_offset: parseFloat(document.getElementById('audio-track-offset').value),
        fade_in: parseFloat(document.getElementById('audio-track-fadein').value),
        fade_out: parseFloat(document.getElementById('audio-track-fadeout').value),
        loop: document.getElementById('audio-track-loop').checked,
    };
    await api(`/api/projects/${PROJECT_ID}/audio_tracks`, 'POST', track);
    closeAudioModal();
    loadAudioTracks();
}

async function deleteAudioTrack(trackId) {
    if (!confirm('Biztosan törölni szeretnéd?')) return;
    await api(`/api/projects/${PROJECT_ID}/audio_tracks/${trackId}`, 'DELETE');
    loadAudioTracks();
}

// ============================================================
// RENDERING
// ============================================================
let renderEventSource = null;

async function startRender() {
    const renderBtn = document.getElementById('render-btn');
    const progressDiv = document.getElementById('render-progress');
    const downloadBtn = document.getElementById('download-btn');

    renderBtn.disabled = true;
    renderBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"/></svg> Renderelés...';
    progressDiv.classList.remove('hidden');
    downloadBtn.classList.add('hidden');

    try {
        const res = await api(`/api/projects/${PROJECT_ID}/render`, 'POST');
        if (res.error) {
            alert(res.error);
            resetRenderBtn();
            return;
        }

        // Start listening for progress via SSE
        if (renderEventSource) renderEventSource.close();
        renderEventSource = new EventSource(`/api/projects/${PROJECT_ID}/render/progress`);

        renderEventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.heartbeat) return;

            const fill = document.getElementById('render-progress-fill');
            const text = document.getElementById('render-progress-text');

            if (data.percent >= 0) {
                fill.style.width = data.percent + '%';
                text.textContent = `${data.percent}% - ${data.message || ''}`;
            }

            if (data.done) {
                renderEventSource.close();
                renderEventSource = null;
                fill.style.width = '100%';
                text.textContent = 'Kész!';
                downloadBtn.classList.remove('hidden');
                resetRenderBtn();

                // Show in preview
                const video = document.getElementById('preview-video');
                const placeholder = document.getElementById('preview-placeholder');
                video.src = `/api/projects/${PROJECT_ID}/render/download`;
                video.classList.add('active');
                placeholder.style.display = 'none';
                video.load();
            }

            if (data.error) {
                renderEventSource.close();
                renderEventSource = null;
                text.textContent = data.message || 'Hiba történt!';
                fill.style.width = '0%';
                fill.style.background = 'var(--danger)';
                resetRenderBtn();
                alert('Hiba a renderelés során: ' + (data.message || ''));
            }
        };

        renderEventSource.onerror = () => {
            renderEventSource.close();
            renderEventSource = null;
            resetRenderBtn();
        };

    } catch (err) {
        alert('Hiba: ' + err.message);
        resetRenderBtn();
    }
}

function resetRenderBtn() {
    const btn = document.getElementById('render-btn');
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
    </svg> Renderelés`;
}

function downloadRender() {
    window.open(`/api/projects/${PROJECT_ID}/render/download`, '_blank');
}
