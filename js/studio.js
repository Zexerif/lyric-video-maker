/* Lyric Editor Studio & Tap-to-Sync Mode */

const LyricStudio = {
    isOpen: false,
    isTapToSync: false,
    activeLineIndex: 0,
    lyricLines: [],
    timelineZoom: 1.0,
    timelineScrollX: 0,
    isDraggingMarker: false,
    draggedIndex: -1,
    studioAnimId: null,

    open() {
        this.isOpen = true;
        const modal = document.getElementById('lyricStudioModal');
        if (!modal) return;

        // Parse current lyrics from lrcEditor
        this.loadLyrics(lrcEditor ? lrcEditor.value : '');

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Update studio header track details
        const titleEl = document.getElementById('studioTrackTitle');
        if (titleEl) {
            const title = songTitleInput ? songTitleInput.value.trim() : '';
            const artist = songArtistInput ? songArtistInput.value.trim() : '';
            titleEl.textContent = (title || artist) ? `${title}${artist ? ' — ' + artist : ''}` : 'Untitled Project';
        }

        this.renderLinesList();
        this.resizeTimelineCanvas();
        this.drawTimeline();
        this.startStudioLoop();

        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.updateButtons();
        }
    },

    close() {
        this.isOpen = false;
        this.isTapToSync = false;
        const modal = document.getElementById('lyricStudioModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
        if (this.studioAnimId) {
            cancelAnimationFrame(this.studioAnimId);
            this.studioAnimId = null;
        }
    },

        loadFromLrc(text) {
        return this.loadLyrics(text);
    },

    loadLyrics(text) {
        if (!text || !text.trim()) {
            this.lyricLines = [
                { time: 0, text: 'First lyric line', subText: '', isBacking: false }
            ];
            this.isTtml = false;
            return;
        }

        const trimmed = text.trim();
        if (trimmed.startsWith('<tt') || trimmed.startsWith('<?xml') || trimmed.includes('http://www.w3.org/ns/ttml')) {
            this.isTtml = true;
            this.isAss = false;
            this.rawXml = text;
            const parsed = typeof parseTtml === 'function' ? parseTtml(text) : [];
            this.lyricLines = parsed.filter(l => l.text !== '• • •').map(l => ({
                time: l.time,
                endTime: l.endTime || (l.time + 3),
                text: l.text,
                subText: l.subText || '',
                isBacking: l.isBacking || false,
                words: l.words || null
            }));
            if (this.lyricLines.length === 0) {
                this.lyricLines = [{ time: 0, text: 'First lyric line', subText: '', isBacking: false }];
            }
        } else if (typeof isAssSubtitle === 'function' && isAssSubtitle(trimmed)) {
            this.isTtml = false;
            this.isAss = true;
            this.rawAss = text;
            const parsed = typeof parseAss === 'function' ? parseAss(text) : [];
            this.lyricLines = parsed.filter(l => l.text !== '• • •').map(l => ({
                time: l.time,
                endTime: l.endTime || (l.time + 3),
                text: l.text,
                subText: l.subText || '',
                isBacking: l.isBacking || false,
                words: l.words || null
            }));
            if (this.lyricLines.length === 0) {
                this.lyricLines = [{ time: 0, text: 'First lyric line', subText: '', isBacking: false }];
            }
        } else {
            this.isTtml = false;
            this.isAss = false;
            const lines = text.split('\n');
            const parsed = [];
            const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

            lines.forEach(rawLine => {
                const tr = rawLine.trim();
                if (!tr) return;

                let lineText = tr.replace(timeReg, '').trim();
                let subText = '';
                if (/\s*(?:\/{2,3}|\|)\s*/.test(lineText)) {
                    const parts = lineText.split(/\s*(?:\/{2,3}|\|)\s*/);
                    lineText = parts[0].trim();
                    subText = parts.slice(1).join(' / ').trim();
                }

                const isBacking = lineText.startsWith('(') && lineText.endsWith(')');

                timeReg.lastIndex = 0;
                const match = timeReg.exec(tr);
                if (match) {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1);
                    const time = minutes * 60 + seconds + milliseconds / 1000;
                    parsed.push({ time, text: lineText, subText, isBacking });
                } else {
                    parsed.push({ time: null, text: lineText, subText, isBacking });
                }
            });

            this.lyricLines = parsed.length > 0 ? parsed : [
                { time: 0, text: 'First lyric line', subText: '', isBacking: false }
            ];
        }
    },

    saveToLrc() {
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.pushState('Lyric Studio Changes');
        }

        if (this.isTtml && this.rawXml) {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(this.rawXml, 'text/xml');
                const paragraphs = xmlDoc.getElementsByTagName('p');
                for (let i = 0; i < Math.min(paragraphs.length, this.lyricLines.length); i++) {
                    const item = this.lyricLines[i];
                    if (typeof item.time === 'number') {
                        const pBeginStr = paragraphs[i].getAttribute('begin');
                        const oldBegin = typeof parseTime === 'function' ? parseTime(pBeginStr) : (parseFloat(pBeginStr) || item.time);
                        const shift = item.time - oldBegin;
                        paragraphs[i].setAttribute('begin', item.time.toFixed(3));
                        if (paragraphs[i].hasAttribute('end')) {
                            const pEndStr = paragraphs[i].getAttribute('end');
                            const oldEnd = typeof parseTime === 'function' ? parseTime(pEndStr) : (parseFloat(pEndStr) || (item.time + 3));
                            paragraphs[i].setAttribute('end', Math.max(item.time + 0.1, oldEnd + shift).toFixed(3));
                        }
                        const spans = paragraphs[i].getElementsByTagName('span');
                        for (let s = 0; s < spans.length; s++) {
                            if (spans[s].hasAttribute('begin')) {
                                const sbStr = spans[s].getAttribute('begin');
                                const sb = typeof parseTime === 'function' ? parseTime(sbStr) : parseFloat(sbStr);
                                spans[s].setAttribute('begin', Math.max(0, sb + shift).toFixed(3));
                            }
                            if (spans[s].hasAttribute('end')) {
                                const seStr = spans[s].getAttribute('end');
                                const se = typeof parseTime === 'function' ? parseTime(seStr) : parseFloat(seStr);
                                spans[s].setAttribute('end', Math.max(0.1, se + shift).toFixed(3));
                            }
                        }
                    }
                }
                const serializer = new XMLSerializer();
                if (typeof lrcEditor !== 'undefined' && lrcEditor) {
                    lrcEditor.value = serializer.serializeToString(xmlDoc);
                }
            } catch (err) {
                console.warn('TTML serialization fallback to LRC:', err);
                this.outputLrcFallback();
            }
        } else if (this.isAss && this.rawAss) {
            try {
                const lines = this.rawAss.split(/\r?\n/);
                let eventIdx = 0;
                let inEvents = false;
                let startIndex = 1;
                let endIndex = 2;
                let formatCols = ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];

                function formatAssTime(seconds) {
                    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) seconds = 0;
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = Math.floor(seconds % 60);
                    const cs = Math.floor(Math.round((seconds % 1) * 100));
                    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
                }

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('[')) {
                        inEvents = /^\[Events\]/i.test(line);
                        continue;
                    }
                    if (inEvents && /^Format\s*:/i.test(line)) {
                        const fStr = line.replace(/^Format\s*:\s*/i, '');
                        formatCols = fStr.split(',').map(c => c.trim().toLowerCase());
                        startIndex = formatCols.indexOf('start');
                        endIndex = formatCols.indexOf('end');
                        if (startIndex === -1) startIndex = 1;
                        if (endIndex === -1) endIndex = 2;
                        continue;
                    }
                    if (/^Dialogue\s*:/i.test(line) && eventIdx < this.lyricLines.length) {
                        const item = this.lyricLines[eventIdx];
                        if (typeof item.time === 'number') {
                            const colonIdx = lines[i].indexOf(':');
                            const prefix = lines[i].slice(0, colonIdx + 1);
                            const payload = lines[i].slice(colonIdx + 1);
                            const parts = [];
                            let lastIdx = 0;
                            const numCols = Math.max(formatCols.length, Math.max(startIndex, endIndex) + 1);
                            for (let c = 0; c < numCols - 1; c++) {
                                const commaIdx = payload.indexOf(',', lastIdx);
                                if (commaIdx === -1) break;
                                parts.push(payload.slice(lastIdx, commaIdx));
                                lastIdx = commaIdx + 1;
                            }
                            parts.push(payload.slice(lastIdx));

                            if (parts.length > Math.max(startIndex, endIndex)) {
                                parts[startIndex] = (parts[startIndex].startsWith(' ') ? ' ' : '') + formatAssTime(item.time);
                                parts[endIndex] = (parts[endIndex].startsWith(' ') ? ' ' : '') + formatAssTime(item.endTime || (item.time + 3));
                                lines[i] = prefix + parts.join(',');
                            }
                        }
                        eventIdx++;
                    }
                }
                if (typeof lrcEditor !== 'undefined' && lrcEditor) {
                    lrcEditor.value = lines.join('\n');
                }
            } catch (err) {
                console.warn('ASS serialization fallback to LRC:', err);
                this.outputLrcFallback();
            }
        } else {
            this.outputLrcFallback();
        }

        if (typeof updateLyricsFromEditor === 'function') {
            updateLyricsFromEditor();
        }
        if (typeof saveProgressToLocalStorage === 'function') {
            saveProgressToLocalStorage();
        }
        if (typeof drawFrame === 'function') {
            drawFrame(typeof pausedTime !== 'undefined' ? pausedTime : 0);
        }

        if (typeof statusMessage !== 'undefined' && statusMessage) {
            statusMessage.textContent = '✅ Lyric Studio changes applied successfully!';
            statusMessage.style.color = '#4ade80';
        }
        this.close();
    },

    outputLrcFallback() {
        const outputLines = [];
        this.lyricLines.forEach(item => {
            const time = typeof item.time === 'number' ? item.time : 0;
            const m = Math.floor(time / 60).toString().padStart(2, '0');
            const s = Math.floor(time % 60).toString().padStart(2, '0');
            const ms = Math.floor((time % 1) * 100).toString().padStart(2, '0');
            const timeStr = `[${m}:${s}.${ms}]`;

            let lineContent = item.text || '';
            if (item.subText) {
                lineContent += ` // ${item.subText}`;
            }
            outputLines.push(`${timeStr} ${lineContent}`.trim());
        });

        const newLrc = outputLines.join('\n');
        if (typeof lrcEditor !== 'undefined' && lrcEditor) {
            lrcEditor.value = newLrc;
        }
    },

    toggleTapToSync() {
        this.isTapToSync = !this.isTapToSync;
        const btn = document.getElementById('studioTapSyncBtn');
        const banner = document.getElementById('studioTapSyncBanner');

        if (this.isTapToSync) {
            if (btn) {
                btn.classList.add('active');
                btn.textContent = '⏹ Stop Tap-to-Sync';
            }
            if (banner) banner.style.display = 'flex';
            this.activeLineIndex = 0;
            this.highlightActiveTapLine();

            // Auto-start playback if audio is paused
            if (!isPlaying && typeof startPlayback === 'function' && audioBuffer) {
                startPlayback();
            }
        } else {
            if (btn) {
                btn.classList.remove('active');
                btn.textContent = '🔴 Tap-to-Sync Mode';
            }
            if (banner) banner.style.display = 'none';
            this.renderLinesList();
        }
    },

    stampCurrentLine() {
        if (!audioBuffer) {
            alert('Please load an audio file first to sync lyrics.');
            return;
        }

        let curTime = 0;
        if (isPlaying && audioContext) {
            curTime = audioContext.currentTime - startTime + pausedTime;
        } else {
            curTime = pausedTime;
        }

        if (this.activeLineIndex >= 0 && this.activeLineIndex < this.lyricLines.length) {
            this.lyricLines[this.activeLineIndex].time = Math.max(0, curTime);

            // Audio flash feedback on the card
            const card = document.querySelector(`.studio-lyric-card[data-index="${this.activeLineIndex}"]`);
            if (card) {
                card.classList.add('stamped');
                setTimeout(() => card.classList.remove('stamped'), 400);
            }

            // Move to next line
            if (this.activeLineIndex < this.lyricLines.length - 1) {
                this.activeLineIndex++;
                this.highlightActiveTapLine();
            } else {
                // Done stamping all lines
                if (typeof statusMessage !== 'undefined' && statusMessage) {
                    statusMessage.textContent = '🎉 All lines stamped! Click "Apply Changes" when ready.';
                    statusMessage.style.color = '#4ade80';
                }
            }
            this.drawTimeline();
        }
    },

    undoLastStamp() {
        if (this.activeLineIndex > 0) {
            this.activeLineIndex--;
            this.highlightActiveTapLine();
        }
    },

    highlightActiveTapLine() {
        const cards = document.querySelectorAll('.studio-lyric-card');
        cards.forEach((c, idx) => {
            if (idx === this.activeLineIndex) {
                c.classList.add('tap-focused');
                c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                c.classList.remove('tap-focused');
            }
        });
        const promptEl = document.getElementById('studioTapPrompt');
        if (promptEl) {
            const line = this.lyricLines[this.activeLineIndex];
            promptEl.textContent = line ? `Next: "${line.text}"` : 'All lines synced!';
        }
    },

    renderLinesList() {
        const container = document.getElementById('studioLinesList');
        if (!container) return;

        container.innerHTML = '';
        this.lyricLines.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = `studio-lyric-card ${index === this.activeLineIndex && this.isTapToSync ? 'tap-focused' : ''}`;
            card.setAttribute('data-index', index);

            const timeStr = typeof item.time === 'number' ? formatTime(item.time) : '--:--.-';

            card.innerHTML = `
                <div class="studio-card-index">#${index + 1}</div>
                <div class="studio-card-time-group">
                    <button type="button" class="studio-nudge-btn" data-dir="-1" title="Nudge 0.1s earlier">-0.1s</button>
                    <span class="studio-card-time-val">${timeStr}</span>
                    <button type="button" class="studio-nudge-btn" data-dir="1" title="Nudge 0.1s later">+0.1s</button>
                    <button type="button" class="studio-stamp-btn" title="Stamp current playhead time">📍 Stamp</button>
                </div>
                <div class="studio-card-inputs">
                    <input type="text" class="studio-text-input" placeholder="Lyric text..." value="${escapeHtml(item.text)}">
                    <input type="text" class="studio-subtext-input" placeholder="Sub-lyric / Translation (optional)..." value="${escapeHtml(item.subText || '')}">
                </div>
                <div class="studio-card-actions">
                    <button type="button" class="studio-play-line-btn" title="Play from this line">▶</button>
                    <button type="button" class="studio-del-line-btn" title="Delete line">✕</button>
                </div>
            `;

            // Event Listeners
            const textInput = card.querySelector('.studio-text-input');
            textInput.addEventListener('input', (e) => {
                item.text = e.target.value;
                this.drawTimeline();
            });

            const subtextInput = card.querySelector('.studio-subtext-input');
            subtextInput.addEventListener('input', (e) => {
                item.subText = e.target.value;
                this.drawTimeline();
            });

            const stampBtn = card.querySelector('.studio-stamp-btn');
            stampBtn.addEventListener('click', () => {
                let curTime = 0;
                if (isPlaying && audioContext) {
                    curTime = audioContext.currentTime - startTime + pausedTime;
                } else {
                    curTime = pausedTime;
                }
                item.time = Math.max(0, curTime);
                card.querySelector('.studio-card-time-val').textContent = formatTime(item.time);
                this.drawTimeline();
            });

            const nudgeBtns = card.querySelectorAll('.studio-nudge-btn');
            nudgeBtns.forEach(b => {
                b.addEventListener('click', () => {
                    const dir = parseFloat(b.getAttribute('data-dir'));
                    item.time = Math.max(0, (typeof item.time === 'number' ? item.time : 0) + dir * 0.1);
                    card.querySelector('.studio-card-time-val').textContent = formatTime(item.time);
                    this.drawTimeline();
                });
            });

            const playLineBtn = card.querySelector('.studio-play-line-btn');
            playLineBtn.addEventListener('click', () => {
                if (typeof item.time === 'number') {
                    if (isPlaying && typeof stopPlayback === 'function') stopPlayback();
                    if (typeof syncPreviewToTime === 'function') syncPreviewToTime(item.time);
                    if (typeof startPlayback === 'function') startPlayback();
                }
            });

            const delLineBtn = card.querySelector('.studio-del-line-btn');
            delLineBtn.addEventListener('click', () => {
                if (this.lyricLines.length > 1) {
                    this.lyricLines.splice(index, 1);
                    this.renderLinesList();
                    this.drawTimeline();
                }
            });

            container.appendChild(card);
        });

        // Add Line button at the bottom of the list
        const addRow = document.createElement('div');
        addRow.style.textAlign = 'center';
        addRow.style.padding = '0.75rem 0';
        addRow.innerHTML = `<button type="button" id="studioAddLineBtn" class="btn small secondary" style="width: auto; padding: 0.5rem 1.5rem; border-radius: 10px;">+ Add New Lyric Line</button>`;
        container.appendChild(addRow);

        document.getElementById('studioAddLineBtn').addEventListener('click', () => {
            let curTime = 0;
            if (isPlaying && audioContext) {
                curTime = audioContext.currentTime - startTime + pausedTime;
            } else {
                curTime = pausedTime;
            }
            this.lyricLines.push({ time: curTime, text: 'New line', subText: '', isBacking: false });
            this.renderLinesList();
            this.drawTimeline();
        });
    },

    resizeTimelineCanvas() {
        const canvas = document.getElementById('studioTimelineCanvas');
        const container = document.getElementById('studioTimelineContainer');
        if (!canvas || !container) return;

        canvas.width = container.clientWidth || 1000;
        canvas.height = 90;

        if (!canvas._hasStudioListeners) {
            canvas._hasStudioListeners = true;
            this.attachTimelineEvents(canvas);
        }
    },

    attachTimelineEvents(canvas) {
        let isDragging = false;
        let dragIdx = -1;

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const w = canvas.width;
            const duration = (audioBuffer && audioBuffer.duration) ? audioBuffer.duration : 180;
            const clickTime = (clickX / w) * duration;

            // Check if user clicked near an existing cue marker (within 12px)
            dragIdx = -1;
            for (let i = 0; i < this.lyricLines.length; i++) {
                if (typeof this.lyricLines[i].time === 'number') {
                    const markerX = (this.lyricLines[i].time / duration) * w;
                    if (Math.abs(markerX - clickX) <= 12) {
                        dragIdx = i;
                        break;
                    }
                }
            }

            if (dragIdx >= 0) {
                isDragging = true;
            } else {
                // Seek playhead
                if (typeof syncPreviewToTime === 'function') {
                    syncPreviewToTime(clickTime);
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isOpen || !isDragging || dragIdx < 0) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
            const duration = (audioBuffer && audioBuffer.duration) ? audioBuffer.duration : 180;
            const newTime = (mouseX / canvas.width) * duration;

            this.lyricLines[dragIdx].time = newTime;
            const card = document.querySelector(`.studio-lyric-card[data-index="${dragIdx}"]`);
            if (card) {
                const timeVal = card.querySelector('.studio-card-time-val');
                if (timeVal) timeVal.textContent = formatTime(newTime);
            }
            this.drawTimeline();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                dragIdx = -1;
            }
        });
    },

    drawTimeline() {
        const canvas = document.getElementById('studioTimelineCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const duration = (audioBuffer && audioBuffer.duration) ? audioBuffer.duration : 180;
        let curTime = pausedTime;
        if (isPlaying && audioContext) {
            curTime = audioContext.currentTime - startTime + pausedTime;
        }

        // Draw seconds ruler ticks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, 0, w, 22);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';

        const stepSeconds = duration > 300 ? 10 : 5;
        for (let s = 0; s <= duration; s += stepSeconds) {
            const x = (s / duration) * w;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(x, 0, 1, 14);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(formatDuration(s), x, 18);
        }

        // Draw audio waveform silhouette if available
        if (audioBuffer) {
            const channelData = audioBuffer.getChannelData(0);
            const step = Math.ceil(channelData.length / w);
            const amp = (h - 26) / 2;
            const midY = 26 + amp;

            ctx.fillStyle = 'rgba(99, 102, 241, 0.35)';
            for (let i = 0; i < w; i++) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                    const d = channelData[(i * step) + j];
                    if (d < min) min = d;
                    if (d > max) max = d;
                }
                ctx.fillRect(i, midY + min * amp, 1, Math.max(1, (max - min) * amp));
            }
        }

        // Draw Lyric Blocks and Cue Markers on timeline
        this.lyricLines.forEach((item, idx) => {
            if (typeof item.time !== 'number') return;
            const markerX = (item.time / duration) * w;

            // Marker flag
            ctx.fillStyle = (idx === this.activeLineIndex && this.isTapToSync) ? '#ec4899' : '#38bdf8';
            ctx.fillRect(markerX - 1, 22, 2, h - 22);

            // Flag head
            ctx.beginPath();
            ctx.arc(markerX, 32, 6, 0, Math.PI * 2);
            ctx.fill();

            // Label snippet
            ctx.font = '9px sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.textAlign = 'left';
            const snippet = item.text.length > 15 ? item.text.substring(0, 14) + '…' : item.text;
            ctx.fillText(snippet, markerX + 8, 35);
        });

        // Draw Playhead line
        const playheadX = (curTime / duration) * w;
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(playheadX - 1, 0, 3, h);

        ctx.beginPath();
        ctx.moveTo(playheadX - 6, 0);
        ctx.lineTo(playheadX + 6, 0);
        ctx.lineTo(playheadX, 10);
        ctx.closePath();
        ctx.fill();
    },

    startStudioLoop() {
        const loop = () => {
            if (!this.isOpen) return;

            let curTime = pausedTime;
            if (isPlaying && audioContext) {
                curTime = audioContext.currentTime - startTime + pausedTime;
            }

            // Update Time display readout in studio header
            const timeEl = document.getElementById('studioTimeDisplay');
            if (timeEl) {
                const totalDur = (audioBuffer && audioBuffer.duration) ? audioBuffer.duration : 0;
                timeEl.textContent = `${formatTime(curTime)} / ${formatTime(totalDur)}`;
            }

            // Redraw timeline playhead
            this.drawTimeline();

            // Render mini canvas preview in the corner
            const miniCanvas = document.getElementById('studioMiniCanvas');
            const mainCanvas = document.getElementById('videoCanvas');
            if (miniCanvas && mainCanvas) {
                const mCtx = miniCanvas.getContext('2d');
                mCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
                mCtx.drawImage(mainCanvas, 0, 0, miniCanvas.width, miniCanvas.height);
            }

            this.studioAnimId = requestAnimationFrame(loop);
        };
        this.studioAnimId = requestAnimationFrame(loop);
    }
};

window.LyricStudio = LyricStudio;
