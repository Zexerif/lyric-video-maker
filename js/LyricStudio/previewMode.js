/* js/LyricStudio/previewMode.js
 * Preview Mode Component: Live Apple Music / AMLL Scrolling Lyric View with
 * Word-by-Word Karaoke Fill Sweeps, Background Vocal Tuck-Ins, Duet Right-Alignment,
 * Translation & Romanization, plus Toggleable Live Video Canvas Preview & Split View.
 */

(function (global) {
    'use strict';

    function escapeHtmlSafe(str) {
        if (typeof global.escapeHtml === 'function') return global.escapeHtml(str);
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const LyricStudioPreviewMode = {
        previewLayout: 'split', // 'apple' | 'canvas' | 'split'
        showTranslations: true,
        showRomanization: true,
        showBackingVocals: true,
        lastActivePreviewIndex: -1,

        init(studio) {
            this.studio = studio;
            this.bindEvents();
        },

        bindEvents() {
            const doc = global.document;
            if (!doc) return;

            const layoutBtns = doc.querySelectorAll('[data-preview-layout]');
            layoutBtns.forEach(btn => {
                if (btn._bound) return;
                btn._bound = true;
                btn.addEventListener('click', () => {
                    const layout = btn.getAttribute('data-preview-layout');
                    if (layout) {
                        this.previewLayout = layout;
                        layoutBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-preview-layout') === layout));
                        this.applyLayoutVisibility();
                    }
                });
            });

            const transToggle = doc.getElementById('studioPreviewTransToggle');
            const romanToggle = doc.getElementById('studioPreviewRomanToggle');
            const bgToggle = doc.getElementById('studioPreviewBgToggle');

            if (transToggle && !transToggle._bound) {
                transToggle._bound = true;
                transToggle.addEventListener('change', (e) => {
                    this.showTranslations = Boolean(e.target.checked);
                    this.render();
                });
            }
            if (romanToggle && !romanToggle._bound) {
                romanToggle._bound = true;
                romanToggle.addEventListener('change', (e) => {
                    this.showRomanization = Boolean(e.target.checked);
                    this.render();
                });
            }
            if (bgToggle && !bgToggle._bound) {
                bgToggle._bound = true;
                bgToggle.addEventListener('change', (e) => {
                    this.showBackingVocals = Boolean(e.target.checked);
                    this.render();
                });
            }
        },

        applyLayoutVisibility() {
            const doc = global.document;
            if (!doc) return;
            const applePane = doc.getElementById('studioApplePreviewPane');
            const canvasPane = doc.getElementById('studioCanvasPreviewPane');
            const grid = doc.getElementById('studioPreviewGrid') || doc.getElementById('studioPreviewBody');
            if (!applePane || !canvasPane || !grid) return;

            grid.setAttribute('data-layout', this.previewLayout);
            grid.className = `studio-preview-body layout-${this.previewLayout}`;
            if (this.previewLayout === 'apple') {
                applePane.style.display = '';
                canvasPane.style.display = 'none';
            } else if (this.previewLayout === 'canvas') {
                applePane.style.display = 'none';
                canvasPane.style.display = '';
            } else {
                applePane.style.display = '';
                canvasPane.style.display = '';
            }
        },

        render(studio) {
            if (studio) this.studio = studio;
            const doc = global.document;
            if (!doc || !this.studio) return;

            this.applyLayoutVisibility();
            this.lastActivePreviewIndex = -1;

            // Update Apple Music artwork & track meta header inside preview
            const artEl = doc.getElementById('studioAmllArtwork');
            const titleEl = doc.getElementById('studioAmllTitle');
            const artistEl = doc.getElementById('studioAmllArtist');

            if (titleEl) {
                const sTitle = (typeof global.songTitleInput !== 'undefined' && global.songTitleInput) ? global.songTitleInput.value.trim() : '';
                titleEl.textContent = sTitle || 'Untitled Track';
            }
            if (artistEl) {
                const sArtist = (typeof global.songArtistInput !== 'undefined' && global.songArtistInput) ? global.songArtistInput.value.trim() : '';
                artistEl.textContent = sArtist || 'Unknown Artist';
            }
            if (artEl) {
                if (typeof global.albumImage !== 'undefined' && global.albumImage && global.albumImage.src) {
                    artEl.style.backgroundImage = `url(${global.albumImage.src})`;
                    artEl.textContent = '';
                } else {
                    artEl.style.backgroundImage = '';
                    artEl.textContent = '🎵';
                }
            }

            const scrollList = doc.getElementById('studioAppleScrollList') || doc.getElementById('studioAppleScrollContainer');
            if (!scrollList) return;

            const lines = this.studio.lyricLines || [];
            let html = '<div class="amll-spacer"></div>';

            lines.forEach((line, lIdx) => {
                const isBg = Boolean(line.isBG || line.isBacking);
                if (isBg && !this.showBackingVocals) return;

                const isDuet = Boolean(line.isDuet);
                const words = Array.isArray(line.words) && line.words.length > 0
                    ? line.words
                    : [{ text: line.text || '', time: line.time, endTime: line.endTime, isBG: isBg }];

                let wordsHtml = '';
                words.forEach((w, wIdx) => {
                    const wIsBg = Boolean(w.isBG || w.isBacking);
                    if (wIsBg && !isBg && !this.showBackingVocals) return;
                    const hasSpace = /\s+$/.test(w.text || '') || wIdx === words.length - 1;
                    const cleanW = (w.text || '').trim();
                    if (!cleanW) return;
                    const wRuby = (w.ruby || '').trim();
                    const wordInnerHtml = wRuby
                        ? `<ruby>${escapeHtmlSafe(cleanW)}<rt>${escapeHtmlSafe(wRuby)}</rt></ruby>`
                        : escapeHtmlSafe(cleanW);

                    wordsHtml += `<span class="amll-word ${wIsBg && !isBg ? 'amll-inline-bg-word' : ''} ${wRuby ? 'amll-has-ruby' : ''}" data-word-idx="${wIdx}" style="--word-fill: 0%;">${wordInnerHtml}</span>${hasSpace ? ' ' : ''}`;
                });

                const romanText = (this.showRomanization && line.romanization) ? line.romanization.trim() : '';
                const transText = (this.showTranslations && (line.translation || line.subText)) ? (line.translation || line.subText).trim() : '';

                html += `
                    <div class="amll-lyric-line ${isBg ? 'amll-bg-tuck' : ''} ${isDuet ? 'amll-duet-right' : ''}"
                        data-amll-line="${lIdx}" data-line-time="${typeof line.time === 'number' ? line.time : 0}">
                        ${isDuet ? '<div class="amll-singer-tag">Vocal 2 (Duet)</div>' : ''}
                        ${isBg ? '<div class="amll-singer-tag bg-tag">Backing Vocal</div>' : ''}
                        <div class="amll-main-words">${wordsHtml}</div>
                        ${romanText ? `<div class="amll-roman-line">${escapeHtmlSafe(romanText)}</div>` : ''}
                        ${transText ? `<div class="amll-trans-line">${escapeHtmlSafe(transText)}</div>` : ''}
                    </div>
                `;
            });

            html += '<div class="amll-spacer"></div>';
            scrollList.innerHTML = html;

            // Click any line to seek audio
            const lineEls = scrollList.querySelectorAll('.amll-lyric-line');
            lineEls.forEach(el => {
                el.addEventListener('click', () => {
                    const t = parseFloat(el.getAttribute('data-line-time'));
                    if (!isNaN(t) && this.studio) {
                        this.studio.playFromTime(t);
                    }
                });
            });

            this.updateFrame(this.studio.getCurrentAudioTime());
        },

        updateLivePreview(studio, curTime) {
            if (studio) this.studio = studio;
            this.updateFrame(curTime);
        },

        updateFrame(curTime) {
            const doc = global.document;
            if (!doc || !this.studio || this.studio.currentMode !== 'preview') return;

            const lines = this.studio.lyricLines || [];
            const scrollList = doc.getElementById('studioAppleScrollList') || doc.getElementById('studioAppleScrollContainer');

            if (scrollList) {
                let primaryActiveIdx = -1;
                for (let i = 0; i < lines.length; i++) {
                    const l = lines[i];
                    if (typeof l.time === 'number' && curTime >= l.time) {
                        primaryActiveIdx = i;
                    }
                }

                const lineEls = scrollList.querySelectorAll('.amll-lyric-line');
                lineEls.forEach(el => {
                    const lIdx = parseInt(el.getAttribute('data-amll-line'), 10);
                    const line = lines[lIdx];
                    if (!line) return;

                    const lStart = typeof line.time === 'number' ? line.time : 0;
                    const nextLineStart = (lines[lIdx + 1] && typeof lines[lIdx + 1].time === 'number') ? lines[lIdx + 1].time : (lStart + 3.5);
                    const lEnd = (typeof line.endTime === 'number' && line.endTime > lStart) ? line.endTime : Math.max(lStart + 0.5, nextLineStart);

                    const isActive = (curTime >= lStart && curTime <= lEnd) || (lIdx === primaryActiveIdx && curTime >= lStart && curTime < nextLineStart);
                    const isPast = curTime > lEnd && !isActive;

                    el.classList.toggle('amll-active', isActive);
                    el.classList.toggle('amll-past', isPast);

                    const distance = primaryActiveIdx >= 0 ? Math.abs(lIdx - primaryActiveIdx) : lIdx;
                    el.style.setProperty('--line-distance', String(Math.min(5, distance)));

                    // Update word-by-word karaoke fill sweeps
                    const words = (Array.isArray(line.words) && line.words.length > 0) ? line.words : null;
                    const wordSpans = el.querySelectorAll('.amll-word');
                    const totalW = Math.max(1, wordSpans.length);
                    const fallbackStep = Math.max(0.1, (lEnd - lStart) / totalW);

                    wordSpans.forEach((span, spanIdx) => {
                        const wIdx = parseInt(span.getAttribute('data-word-idx'), 10);
                        const wObj = words && words[wIdx] ? words[wIdx] : null;
                        const wStart = (wObj && typeof wObj.time === 'number') ? wObj.time : (lStart + spanIdx * fallbackStep);
                        const wEnd = (wObj && typeof wObj.endTime === 'number' && wObj.endTime > wStart)
                            ? wObj.endTime
                            : (wStart + fallbackStep);

                        let fill = 0;
                        let isWordActive = false;
                        if (curTime >= wEnd) {
                            fill = 100;
                        } else if (curTime > wStart) {
                            fill = Math.max(0, Math.min(100, ((curTime - wStart) / Math.max(0.02, wEnd - wStart)) * 100));
                            isWordActive = true;
                        }
                        const fillPctStr = `${fill.toFixed(1)}%`;
                        span.style.setProperty('--word-fill', fillPctStr);
                        span.style.setProperty('--amll-fill', fillPctStr);
                        span.classList.toggle('amll-word-sung', fill >= 100);
                        span.classList.toggle('amll-word-singing', isWordActive);
                    });
                });

                if (primaryActiveIdx !== this.lastActivePreviewIndex && primaryActiveIdx >= 0) {
                    this.lastActivePreviewIndex = primaryActiveIdx;
                    const activeEl = scrollList.querySelector(`.amll-lyric-line[data-amll-line="${primaryActiveIdx}"]`);
                    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
                        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }

            // Update Video Canvas Preview inside Preview Mode
            const previewCanvas = doc.getElementById('studioFullPreviewCanvas');
            const mainCanvas = doc.getElementById('videoCanvas');
            if (previewCanvas && mainCanvas && this.previewLayout !== 'apple') {
                // Temporarily sync studio lines into global lyrics so drawFrame renders live studio state
                this.studio.renderLiveFrameToMainCanvas(curTime);
                const pCtx = previewCanvas.getContext('2d');
                if (pCtx) {
                    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                    pCtx.drawImage(mainCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
                }
            }
        }
    };

    global.LyricStudioPreviewMode = LyricStudioPreviewMode;
})(typeof window !== 'undefined' ? window : global);
