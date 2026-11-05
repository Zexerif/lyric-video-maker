/**
 * LyricStudioAudioDock — Persistent Bottom Audio Transport & Interactive Waveform Timeline Dock
 * Provides:
 * - Transport Controls: Play/Pause, Seek -5s / -1s / +1s / +5s
 * - High-precision Millisecond Readout (MM:SS.mmm / MM:SS.mmm)
 * - Playback Speed Selector (0.5x, 0.75x, 1.0x, 1.25x, 1.5x)
 * - Volume Slider & Mute Toggle synced with global audio engine
 * - Interactive Waveform & Lyric Block Scrubber with Zoom (1x - 20x), Follow Playhead,
 *   draggable line/word boundary handles, and wheel zoom/pan
 */

const LyricStudioAudioDock = {
    isBound: false,
    isDraggingScrubber: false,
    draggingHandle: null, // { type: 'line-start' | 'line-end' | 'word-start' | 'word-end', lineIdx, wordIdx }
    hoverTime: null,
    hoverX: null,
    lastVolumeBeforeMute: 1.0,

    init(studio) {
        if (this.isBound) {
            this.syncControlsWithEngine(studio);
            return;
        }
        this.isBound = true;

        // Play / Pause button (Note: main.js also attaches a click listener to #studioPlayPauseBtn,
        // so we manage secondary buttons here and let studio.togglePlayback() unify playback)
        const restartZeroBtn = document.getElementById('studioRestartZeroBtn');
        if (restartZeroBtn) {
            restartZeroBtn.addEventListener('click', () => {
                restartZeroBtn.blur();
                studio.seekTo(0);
            });
        }
        const seekBack1Btn = document.getElementById('studioSeekBack1Btn');
        if (seekBack1Btn) {
            seekBack1Btn.addEventListener('click', () => {
                seekBack1Btn.blur();
                studio.seekRelative(-1);
            });
        }
        const seekFwd1Btn = document.getElementById('studioSeekFwd1Btn');
        if (seekFwd1Btn) {
            seekFwd1Btn.addEventListener('click', () => {
                seekFwd1Btn.blur();
                studio.seekRelative(1);
            });
        }
        // Ensure transport buttons never retain focus that would capture Spacebar
        ['studioRewindBtn', 'studioPlayPauseBtn', 'studioForwardBtn'].forEach(btnId => {
            const el = document.getElementById(btnId);
            if (el) {
                el.addEventListener('click', () => el.blur());
            }
        });

        // Playback speed selector (select dropdown + speed pills)
        const speedSelect = document.getElementById('studioSpeedSelect');
        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => {
                const rate = parseFloat(e.target.value) || 1.0;
                this.setSpeed(studio, rate);
            });
        }
        document.querySelectorAll('.studio-speed-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const rate = parseFloat(btn.getAttribute('data-speed')) || 1.0;
                this.setSpeed(studio, rate);
            });
        });

        // Volume slider & mute button
        const volSlider = document.getElementById('studioVolumeSlider');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.setStudioVolume(val);
            });
        }

        const muteBtn = document.getElementById('studioMuteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const curVol = typeof volume !== 'undefined' ? volume : 1.0;
                if (curVol > 0.01) {
                    this.lastVolumeBeforeMute = curVol;
                    this.setStudioVolume(0);
                } else {
                    this.setStudioVolume(this.lastVolumeBeforeMute || 1.0);
                }
            });
        }

        // Zoom Controls
        const zoomOutBtn = document.getElementById('studioZoomOutBtn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.setZoom(studio, Math.max(1, (studio.timelineZoom || 1) / 1.4));
            });
        }

        const zoomInBtn = document.getElementById('studioZoomInBtn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.setZoom(studio, Math.min(20, (studio.timelineZoom || 1) * 1.4));
            });
        }

        const zoomResetBtn = document.getElementById('studioZoomResetBtn');
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                studio.timelineScrollX = 0;
                this.setZoom(studio, 1);
            });
        }

        const zoomSlider = document.getElementById('studioZoomSlider');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                const z = parseFloat(e.target.value) || 1;
                this.setZoom(studio, z);
            });
        }

        const followBtn = document.getElementById('studioFollowPlayheadBtn');
        if (followBtn) {
            followBtn.addEventListener('click', () => {
                studio.followPlayhead = !studio.followPlayhead;
                followBtn.classList.toggle('active', studio.followPlayhead);
            });
        }

        const beatGridBtn = document.getElementById('studioBeatGridBtn');
        if (beatGridBtn) {
            if (typeof studio.showBeatGrid === 'undefined') studio.showBeatGrid = true;
            beatGridBtn.classList.toggle('active', !!studio.showBeatGrid);
            beatGridBtn.addEventListener('click', () => {
                studio.showBeatGrid = !studio.showBeatGrid;
                beatGridBtn.classList.toggle('active', !!studio.showBeatGrid);
                studio.drawTimeline();
            });
        }

        // Timeline Canvas Mouse / Wheel / Drag interactions
        const container = document.getElementById('studioTimelineContainer');
        if (container) {
            container.addEventListener('mousedown', (e) => this.onTimelineMouseDown(studio, e));
            window.addEventListener('mousemove', (e) => this.onTimelineMouseMove(studio, e));
            window.addEventListener('mouseup', () => this.onTimelineMouseUp(studio));
            container.addEventListener('mouseleave', () => {
                this.hoverTime = null;
                this.hoverX = null;
            });
            container.addEventListener('wheel', (e) => this.onTimelineWheel(studio, e), { passive: false });
        }

        this.syncControlsWithEngine(studio);
    },

    setSpeed(studio, rate) {
        const clamped = Math.max(0.25, Math.min(2.0, rate));
        if (typeof setPlaybackSpeed === 'function') {
            setPlaybackSpeed(clamped);
        } else if (typeof playbackRate !== 'undefined') {
            playbackRate = clamped;
        }
        const speedSelect = document.getElementById('studioSpeedSelect');
        if (speedSelect) speedSelect.value = String(clamped);

        document.querySelectorAll('.studio-speed-pill').forEach(btn => {
            const bRate = parseFloat(btn.getAttribute('data-speed'));
            btn.classList.toggle('active', Math.abs(bRate - clamped) < 0.01);
        });
    },

    setStudioVolume(val) {
        const clamped = Math.max(0, Math.min(1, isNaN(val) ? 1 : val));
        if (typeof volume !== 'undefined') {
            volume = clamped;
        }
        if (typeof gainNode !== 'undefined' && gainNode && gainNode.gain) {
            gainNode.gain.value = clamped;
        }
        const mainSlider = document.getElementById('volumeSlider');
        if (mainSlider) mainSlider.value = String(clamped);
        const studioSlider = document.getElementById('studioVolumeSlider');
        if (studioSlider) studioSlider.value = String(clamped);

        const muteBtn = document.getElementById('studioMuteBtn');
        if (muteBtn) {
            muteBtn.textContent = clamped === 0 ? '🔇' : (clamped < 0.5 ? '🔉' : '🔊');
        }
    },

    setZoom(studio, newZoom, anchorRatio = 0.5) {
        const duration = studio.getDuration();
        const oldZoom = studio.timelineZoom || 1;
        const clamped = Math.max(1, Math.min(20, newZoom));
        const oldVisible = duration / oldZoom;
        const newVisible = duration / clamped;

        const curTime = studio.getCurrentTime();
        const centerTime = (studio.timelineScrollX || 0) + oldVisible * anchorRatio;
        const targetAnchor = studio.followPlayhead ? curTime : centerTime;

        studio.timelineZoom = clamped;
        studio.timelineScrollX = Math.max(0, Math.min(duration - newVisible, targetAnchor - newVisible * anchorRatio));

        const zoomSlider = document.getElementById('studioZoomSlider');
        if (zoomSlider) zoomSlider.value = String(clamped);
        const zoomVal = document.getElementById('studioZoomValue');
        if (zoomVal) zoomVal.textContent = `${clamped.toFixed(1)}x`;

        studio.drawTimeline();
    },

    syncControlsWithEngine(studio) {
        const curVol = typeof volume !== 'undefined' ? volume : 1.0;
        const studioSlider = document.getElementById('studioVolumeSlider');
        if (studioSlider) studioSlider.value = String(curVol);
        const muteBtn = document.getElementById('studioMuteBtn');
        if (muteBtn) {
            muteBtn.textContent = curVol === 0 ? '🔇' : (curVol < 0.5 ? '🔉' : '🔊');
        }

        const curRate = typeof playbackRate !== 'undefined' ? playbackRate : 1.0;
        const speedSelect = document.getElementById('studioSpeedSelect');
        if (speedSelect) speedSelect.value = String(curRate);
        document.querySelectorAll('.studio-speed-pill').forEach(btn => {
            const bRate = parseFloat(btn.getAttribute('data-speed'));
            btn.classList.toggle('active', Math.abs(bRate - curRate) < 0.01);
        });

        const zoomSlider = document.getElementById('studioZoomSlider');
        if (zoomSlider) zoomSlider.value = String(studio.timelineZoom || 1);
        const zoomVal = document.getElementById('studioZoomValue');
        if (zoomVal) zoomVal.textContent = `${(studio.timelineZoom || 1).toFixed(1)}x`;

        const followBtn = document.getElementById('studioFollowPlayheadBtn');
        if (followBtn) followBtn.classList.toggle('active', !!studio.followPlayhead);
    },

    getTimelineMetrics(studio) {
        const canvas = document.getElementById('studioTimelineCanvas');
        if (!canvas) return null;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const duration = studio.getDuration();
        const zoom = studio.timelineZoom || 1;
        const visibleDuration = duration / zoom;
        const scrollX = Math.max(0, Math.min(duration - visibleDuration, studio.timelineScrollX || 0));
        return { canvas, w, h, dpr, duration, zoom, visibleDuration, scrollX };
    },

    xToTime(studio, clientX) {
        const container = document.getElementById('studioTimelineContainer');
        if (!container) return 0;
        const rect = container.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
        const duration = studio.getDuration();
        const visibleDuration = duration / (studio.timelineZoom || 1);
        const scrollX = studio.timelineScrollX || 0;
        return Math.max(0, Math.min(duration, scrollX + ratio * visibleDuration));
    },

    findHitHandleOrBlock(studio, clientX, clientY) {
        const container = document.getElementById('studioTimelineContainer');
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        const duration = studio.getDuration();
        const visibleDuration = duration / (studio.timelineZoom || 1);
        const scrollX = studio.timelineScrollX || 0;

        // Check active line word blocks (bottom strip y: h - 24 to h - 4)
        const activeLine = studio.lyricLines[studio.activeLineIndex];
        if (activeLine && Array.isArray(activeLine.words) && y >= h - 26) {
            for (let wi = 0; wi < activeLine.words.length; wi++) {
                const word = activeLine.words[wi];
                const wStart = typeof word.time === 'number' ? word.time : word.start;
                if (typeof wStart !== 'number' || isNaN(wStart)) continue;
                const wRawEnd = typeof word.endTime === 'number' ? word.endTime : word.end;
                const wEnd = (typeof wRawEnd === 'number' && !isNaN(wRawEnd)) ? wRawEnd : wStart + 0.35;
                const wx1 = ((wStart - scrollX) / visibleDuration) * w;
                const wx2 = ((wEnd - scrollX) / visibleDuration) * w;
                if (Math.abs(x - wx1) <= 6) {
                    return { type: 'word-start', lineIdx: studio.activeLineIndex, wordIdx: wi };
                }
                if (Math.abs(x - wx2) <= 6) {
                    return { type: 'word-end', lineIdx: studio.activeLineIndex, wordIdx: wi };
                }
                if (x >= wx1 && x <= wx2) {
                    return { type: 'word-block', lineIdx: studio.activeLineIndex, wordIdx: wi };
                }
            }
        }

        // Check lyric line blocks (middle band y: 20 to h - 26)
        if (y >= 20 && y <= h - 22) {
            for (let i = 0; i < studio.lyricLines.length; i++) {
                const line = studio.lyricLines[i];
                if (typeof line.time !== 'number' || isNaN(line.time)) continue;
                const nextTime = (i + 1 < studio.lyricLines.length && typeof studio.lyricLines[i + 1].time === 'number')
                    ? studio.lyricLines[i + 1].time
                    : line.time + 3.0;
                const lEnd = (typeof line.endTime === 'number' && !isNaN(line.endTime) && line.endTime > line.time)
                    ? line.endTime
                    : Math.min(nextTime, line.time + 4.0);

                const lx1 = ((line.time - scrollX) / visibleDuration) * w;
                const lx2 = ((lEnd - scrollX) / visibleDuration) * w;

                if (Math.abs(x - lx1) <= 6) {
                    return { type: 'line-start', lineIdx: i };
                }
                if (Math.abs(x - lx2) <= 6) {
                    return { type: 'line-end', lineIdx: i };
                }
                if (x >= lx1 && x <= lx2) {
                    return { type: 'line-block', lineIdx: i };
                }
            }
        }

        return null;
    },

    onTimelineMouseDown(studio, e) {
        if (e.button !== 0) return;
        const hit = this.findHitHandleOrBlock(studio, e.clientX, e.clientY);

        if (hit && (hit.type === 'line-start' || hit.type === 'line-end' || hit.type === 'word-start' || hit.type === 'word-end')) {
            studio.pushUndoState();
            this.draggingHandle = hit;
            studio.selectLine(hit.lineIdx, typeof hit.wordIdx === 'number' ? hit.wordIdx : null, { scroll: false });
            return;
        }

        // In Sync Mode, clicking the timeline waveform must ONLY seek audio without hijacking the user's selected sync line!
        if (studio.currentMode !== 'sync') {
            if (hit && hit.type === 'word-block') {
                studio.selectLine(hit.lineIdx, hit.wordIdx, { scroll: false });
            } else if (hit && hit.type === 'line-block') {
                studio.selectLine(hit.lineIdx, null, { scroll: false });
            }
        }

        this.isDraggingScrubber = true;
        const targetTime = this.xToTime(studio, e.clientX);
        studio.seekTo(targetTime);
    },

    onTimelineMouseMove(studio, e) {
        const container = document.getElementById('studioTimelineContainer');
        if (container) {
            const rect = container.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                this.hoverX = e.clientX - rect.left;
                this.hoverTime = this.xToTime(studio, e.clientX);
                const hit = this.findHitHandleOrBlock(studio, e.clientX, e.clientY);
                if (hit && (hit.type.endsWith('-start') || hit.type.endsWith('-end'))) {
                    container.style.cursor = 'ew-resize';
                } else {
                    container.style.cursor = 'pointer';
                }
            }
        }

        if (this.draggingHandle) {
            const t = Math.round(this.xToTime(studio, e.clientX) * 1000) / 1000;
            const { type, lineIdx, wordIdx } = this.draggingHandle;
            const line = studio.lyricLines[lineIdx];
            if (!line) return;

            if (type === 'line-start') {
                line.time = Math.max(0, t);
                if (typeof line.endTime === 'number' && line.endTime <= line.time) {
                    line.endTime = Number((line.time + 0.3).toFixed(3));
                }
            } else if (type === 'line-end') {
                const minEnd = (typeof line.time === 'number' ? line.time : 0) + 0.05;
                line.endTime = Math.max(minEnd, t);
            } else if (type === 'word-start' && line.words && line.words[wordIdx]) {
                const nw = Math.max(0, t);
                line.words[wordIdx].time = nw;
                line.words[wordIdx].start = nw;
                const curEnd = typeof line.words[wordIdx].endTime === 'number' ? line.words[wordIdx].endTime : line.words[wordIdx].end;
                if (typeof curEnd !== 'number' || curEnd <= nw) {
                    const ne = Number((nw + 0.15).toFixed(3));
                    line.words[wordIdx].endTime = ne;
                    line.words[wordIdx].end = ne;
                }
            } else if (type === 'word-end' && line.words && line.words[wordIdx]) {
                const curStart = typeof line.words[wordIdx].time === 'number' ? line.words[wordIdx].time : (line.words[wordIdx].start || 0);
                const minWEnd = curStart + 0.04;
                const ne = Math.max(minWEnd, t);
                line.words[wordIdx].endTime = ne;
                line.words[wordIdx].end = ne;
            }
            studio.drawTimeline();
            studio.refreshInspector();
            return;
        }

        if (this.isDraggingScrubber) {
            const targetTime = this.xToTime(studio, e.clientX);
            studio.seekTo(targetTime);
        }
    },

    onTimelineMouseUp(studio) {
        if (this.draggingHandle) {
            this.draggingHandle = null;
            studio.refreshActiveView();
            studio.refreshInspector();
        }
        this.isDraggingScrubber = false;
    },

    onTimelineWheel(studio, e) {
        e.preventDefault();
        const container = document.getElementById('studioTimelineContainer');
        const rect = container ? container.getBoundingClientRect() : { left: 0, width: 1 };
        const anchorRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));

        const duration = studio.getDuration();
        if (e.ctrlKey || e.metaKey || (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX))) {
            // Zoom in/out around cursor
            const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
            const newZoom = Math.max(1, Math.min(20, (studio.timelineZoom || 1) * factor));
            this.setZoom(studio, newZoom, anchorRatio);
        } else {
            // Horizontal pan
            const visibleDuration = duration / (studio.timelineZoom || 1);
            const delta = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * (visibleDuration * 0.0015);
            studio.timelineScrollX = Math.max(0, Math.min(duration - visibleDuration, (studio.timelineScrollX || 0) + delta));
            studio.drawTimeline();
        }
    },

    drawTimeline(studio) {
        const metrics = this.getTimelineMetrics(studio);
        if (!metrics) return;
        const { canvas, w, h, duration, zoom, visibleDuration, scrollX } = metrics;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const curTime = studio.getCurrentTime();

        // Auto-follow playhead during playback if enabled
        if (studio.followPlayhead && !this.isDraggingScrubber && !this.draggingHandle && studio.isPlaying()) {
            const rightBound = scrollX + visibleDuration * 0.85;
            const leftBound = scrollX + visibleDuration * 0.05;
            if (curTime > rightBound || curTime < leftBound) {
                studio.timelineScrollX = Math.max(0, Math.min(duration - visibleDuration, curTime - visibleDuration * 0.25));
            }
        }

        const effectiveScrollX = Math.max(0, Math.min(duration - visibleDuration, studio.timelineScrollX || 0));

        // 1. Background
        ctx.fillStyle = '#09090f';
        ctx.fillRect(0, 0, w, h);

        // Subtle horizontal lane dividers
        const rulerH = 20;
        const wordStripH = 22;
        const mainLaneY = rulerH;
        const mainLaneH = Math.max(24, h - rulerH - wordStripH);

        ctx.fillStyle = '#11111a';
        ctx.fillRect(0, 0, w, rulerH);
        ctx.fillStyle = '#0d0d16';
        ctx.fillRect(0, h - wordStripH, w, wordStripH);

        // 2. Time Ruler & Adaptive Grid
        let majorStep = 10;
        if (visibleDuration <= 8) majorStep = 0.5;
        else if (visibleDuration <= 20) majorStep = 1;
        else if (visibleDuration <= 45) majorStep = 2;
        else if (visibleDuration <= 120) majorStep = 5;
        else if (visibleDuration <= 300) majorStep = 15;
        else majorStep = 30;

        const minorStep = majorStep / 5;
        const firstTick = Math.floor(effectiveScrollX / minorStep) * minorStep;

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';

        for (let t = firstTick; t <= effectiveScrollX + visibleDuration; t += minorStep) {
            if (t < 0) continue;
            const x = ((t - effectiveScrollX) / visibleDuration) * w;
            const isMajor = Math.abs(Math.round(t / majorStep) * majorStep - t) < 0.001;

            ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
            ctx.beginPath();
            ctx.moveTo(x, isMajor ? 0 : rulerH - 5);
            ctx.lineTo(x, isMajor ? h : rulerH);
            ctx.stroke();

            if (isMajor) {
                const mins = Math.floor(t / 60);
                const secs = (t % 60).toFixed(majorStep < 1 ? 1 : 0).padStart(majorStep < 1 ? 4 : 2, '0');
                ctx.fillStyle = '#71717a';
                ctx.fillText(`${mins}:${secs}`, x + 4, rulerH / 2);
            }
        }

        // 2b. Optional BPM Beat Grid Overlay
        if (studio.showBeatGrid !== false) {
            const bpm = (typeof detectedBPM === 'number' && detectedBPM >= 40 && detectedBPM <= 240) ? detectedBPM : 120;
            const beatStep = 60 / bpm;
            if (visibleDuration / beatStep <= 160) {
                const firstBeatIdx = Math.max(0, Math.floor(effectiveScrollX / beatStep));
                const endBeatIdx = Math.ceil((effectiveScrollX + visibleDuration) / beatStep);
                for (let b = firstBeatIdx; b <= endBeatIdx; b++) {
                    const bt = b * beatStep;
                    const bx = ((bt - effectiveScrollX) / visibleDuration) * w;
                    const isBarDownbeat = (b % 4) === 0;
                    ctx.strokeStyle = isBarDownbeat ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.08)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(bx, rulerH);
                    ctx.lineTo(bx, h - wordStripH);
                    ctx.stroke();
                }
            }
        }

        // 3. Audio Waveform
        if (typeof audioBuffer !== 'undefined' && audioBuffer) {
            const rawData = audioBuffer.getChannelData(0);
            const totalSamples = rawData.length;
            const startSample = Math.floor((effectiveScrollX / duration) * totalSamples);
            const endSample = Math.min(totalSamples, Math.ceil(((effectiveScrollX + visibleDuration) / duration) * totalSamples));
            const visibleSamples = Math.max(1, endSample - startSample);
            const samplesPerPixel = Math.max(1, Math.floor(visibleSamples / Math.max(1, w)));
            const midY = mainLaneY + mainLaneH / 2;

            ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
            for (let px = 0; px < w; px++) {
                const sIdx = startSample + Math.floor(px * samplesPerPixel);
                if (sIdx >= totalSamples) break;
                let peak = 0;
                const checkStep = Math.max(1, Math.floor(samplesPerPixel / 8));
                for (let j = 0; j < samplesPerPixel && (sIdx + j) < totalSamples; j += checkStep) {
                    const v = Math.abs(rawData[sIdx + j]);
                    if (v > peak) peak = v;
                }
                const barH = Math.max(2, peak * (mainLaneH * 0.82));
                ctx.fillRect(px, midY - barH / 2, 1, barH);
            }
        }

        // 4. Lyric Line Blocks (Middle Lane)
        studio.lyricLines.forEach((line, idx) => {
            if (typeof line.time !== 'number' || isNaN(line.time)) return;
            const nextTime = (idx + 1 < studio.lyricLines.length && typeof studio.lyricLines[idx + 1].time === 'number')
                ? studio.lyricLines[idx + 1].time
                : line.time + 3.0;
            const lEnd = (typeof line.endTime === 'number' && !isNaN(line.endTime) && line.endTime > line.time)
                ? line.endTime
                : Math.min(nextTime, line.time + 4.0);

            if (lEnd < effectiveScrollX || line.time > effectiveScrollX + visibleDuration) return;

            const x1 = ((line.time - effectiveScrollX) / visibleDuration) * w;
            const x2 = ((lEnd - effectiveScrollX) / visibleDuration) * w;
            const bw = Math.max(4, x2 - x1);
            const by = mainLaneY + 6;
            const bh = mainLaneH - 12;

            const isSelected = idx === studio.activeLineIndex;
            const isActiveAtPlayhead = curTime >= line.time && curTime < lEnd;

            ctx.fillStyle = isSelected
                ? 'rgba(139, 92, 246, 0.38)'
                : (isActiveAtPlayhead ? 'rgba(16, 185, 129, 0.28)' : 'rgba(63, 63, 70, 0.32)');
            ctx.strokeStyle = isSelected
                ? '#a78bfa'
                : (isActiveAtPlayhead ? '#34d399' : 'rgba(161, 161, 170, 0.35)');
            ctx.lineWidth = isSelected ? 1.5 : 1;

            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x1, by, bw, bh, 4);
                ctx.fill();
                ctx.stroke();
            } else if (typeof ctx.rect === 'function') {
                ctx.rect(x1, by, bw, bh);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(x1, by, bw, bh);
                if (typeof ctx.strokeRect === 'function') ctx.strokeRect(x1, by, bw, bh);
            }

            // Drag handle bars on selected line
            if (isSelected) {
                ctx.fillStyle = '#c4b5fd';
                ctx.fillRect(x1, by, 3, bh);
                ctx.fillRect(Math.max(x1, x2 - 3), by, 3, bh);
            }

            if (bw > 28) {
                ctx.save();
                if (typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
                    ctx.beginPath();
                    ctx.rect(x1 + 4, by, bw - 8, bh);
                    ctx.clip();
                }
                ctx.fillStyle = isSelected ? '#ffffff' : '#d4d4d8';
                ctx.font = isSelected ? '600 11px Inter, sans-serif' : '11px Inter, sans-serif';
                ctx.fillText(line.text || `Line ${idx + 1}`, x1 + 6, by + bh / 2);
                ctx.restore();
            }
        });

        // 5. Active Line Word/Syllable Sub-Track (Bottom Strip)
        const activeLine = studio.lyricLines[studio.activeLineIndex];
        if (activeLine && Array.isArray(activeLine.words)) {
            const wy = h - wordStripH + 3;
            const wh = wordStripH - 6;

            activeLine.words.forEach((word, wIdx) => {
                const wStart = typeof word.time === 'number' ? word.time : word.start;
                if (typeof wStart !== 'number' || isNaN(wStart)) return;
                const wRawEnd = typeof word.endTime === 'number' ? word.endTime : word.end;
                const wEnd = (typeof wRawEnd === 'number' && !isNaN(wRawEnd)) ? wRawEnd : wStart + 0.3;
                if (wEnd < effectiveScrollX || wStart > effectiveScrollX + visibleDuration) return;

                const wx1 = ((wStart - effectiveScrollX) / visibleDuration) * w;
                const wx2 = ((wEnd - effectiveScrollX) / visibleDuration) * w;
                const wbw = Math.max(3, wx2 - wx1);
                const isWordSel = wIdx === studio.activeWordIndex;

                ctx.fillStyle = isWordSel ? 'rgba(245, 158, 11, 0.48)' : 'rgba(59, 130, 246, 0.32)';
                ctx.strokeStyle = isWordSel ? '#fbbf24' : '#60a5fa';
                ctx.lineWidth = 1;
                ctx.fillRect(wx1, wy, wbw, wh);
                if (typeof ctx.strokeRect === 'function') ctx.strokeRect(wx1, wy, wbw, wh);

                if (wbw > 18) {
                    ctx.save();
                    if (typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
                        ctx.beginPath();
                        ctx.rect(wx1 + 2, wy, wbw - 4, wh);
                        ctx.clip();
                    }
                    ctx.fillStyle = '#f4f4f5';
                    ctx.font = '10px "JetBrains Mono", monospace';
                    ctx.fillText((word.text || '').trim(), wx1 + 3, wy + wh / 2);
                    ctx.restore();
                }
            });
        }

        // 6. Hover Time Indicator
        if (this.hoverX !== null && this.hoverTime !== null) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            if (typeof ctx.setLineDash === 'function') ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(this.hoverX, 0);
            ctx.lineTo(this.hoverX, h);
            ctx.stroke();
            if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
        }

        // 7. Playhead Marker + Millisecond Pill
        if (curTime >= effectiveScrollX && curTime <= effectiveScrollX + visibleDuration) {
            const px = ((curTime - effectiveScrollX) / visibleDuration) * w;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, h);
            ctx.stroke();

            // Playhead triangle cap
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(px - 6, 0);
            ctx.lineTo(px + 6, 0);
            ctx.lineTo(px, 9);
            ctx.closePath();
            ctx.fill();
        }
    }
};

window.LyricStudioAudioDock = LyricStudioAudioDock;
