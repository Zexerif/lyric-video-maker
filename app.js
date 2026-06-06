document.addEventListener('DOMContentLoaded', () => {
    const audioInput = document.getElementById('audioInput');
    const lrcInput = document.getElementById('lrcInput');
    const bgInput = document.getElementById('bgInput');
    const playBtn = document.getElementById('playBtn');
    const exportBtn = document.getElementById('exportBtn');
    const canvas = document.getElementById('videoCanvas');
    const ctx = canvas.getContext('2d');
    const statusMessage = document.getElementById('statusMessage');
    const dropOverlay = document.getElementById('dropOverlay');
    const albumInput = document.getElementById('albumInput');
    const fontSelect = document.getElementById('fontSelect');
    const lyricColorInput = document.getElementById('lyricColor');
    const glowColorInput = document.getElementById('glowColor');
    const lrcEditor = document.getElementById('lrcEditor');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const albumUrlInput = document.getElementById('albumUrl');
    const loadAlbumUrlBtn = document.getElementById('loadAlbumUrl');
    const bgStyleSelect = document.getElementById('bgStyleSelect');
    const creditsNameInput = document.getElementById('creditsName');

    let audioContext = null;
    let audioBuffer = null;
    let audioSource = null;
    let lyrics = [];
    let bgImage = null;
    let albumImage = null;
    let isPlaying = false;
    let isRecording = false;
    let startTime = 0;
    let pausedTime = 0;
    let animationFrameId = null;
    let smoothedIndex = 0;

    // Customization variables
    let currentFont = 'Outfit';
    let currentLyricColor = '#ffffff';
    let currentGlowColor = '#6366f1';
    let currentBgStyle = 'gradient';

    let mediaRecorder = null;
    let recordedChunks = [];
    let destination = null;

    // Reset Canvas
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reset inputs on load to prevent browser cache "ghost" filenames
    function resetInputs() {
        audioInput.value = '';
        lrcInput.value = '';
        bgInput.value = '';
        albumInput.value = '';
        lrcEditor.value = '';
        creditsNameInput.value = '';
        // albumUrl is left alone as per user request
    }
    resetInputs();

    function updateButtons() {
        const hasAudio = !!audioBuffer;
        const hasLyrics = lyrics.length > 0;

        playBtn.disabled = !(hasAudio && hasLyrics);
        exportBtn.disabled = !(hasAudio && hasLyrics);

        if (!hasAudio && hasLyrics) {
            statusMessage.textContent = `Lyrics loaded (${lyrics.length} lines). Waiting for audio to finish decoding...`;
            statusMessage.style.color = "#ec4899"; // highlight waiting
        } else if (hasAudio && !hasLyrics) {
            statusMessage.textContent = "Audio ready. Please upload or type lyrics.";
            statusMessage.style.color = "#6366f1";
        } else if (hasAudio && hasLyrics) {
            statusMessage.textContent = `System Ready! (${lyrics.length} lyric lines loaded)`;
            statusMessage.style.color = "#4ade80"; // green for ready
        }
    }

    // Audio processing function
    async function processAudioFile(file) {
        statusMessage.textContent = 'Loading audio...';
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const arrayBuffer = await file.arrayBuffer();
        try {
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            statusMessage.textContent = 'Audio loaded successfully.';
            updateButtons();
        } catch (err) {
            statusMessage.textContent = 'Error decoding audio file.';
            console.error(err);
        }
    }

    // Lyrics processing function
    async function processLrcFile(file) {
        const text = await file.text();
        lrcEditor.value = text;
        updateLyricsFromEditor();
    }

    function updateLyricsFromEditor() {
        const text = lrcEditor.value.trim();
        if (text.startsWith('<tt') || text.startsWith('<?xml') || text.includes('http://www.w3.org/ns/ttml')) {
            lyrics = parseTtml(text);
        } else {
            lyrics = parseLrc(text);
        }
        
        if (lyrics.length > 0) {
            statusMessage.textContent = `Loaded ${lyrics.length} lyric lines.`;
        } else {
            statusMessage.textContent = 'Enter or upload lyrics to begin.';
        }
        updateButtons();
    }

    // Background processing function
    async function processBgFile(file) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            bgImage = img;
            statusMessage.textContent = 'Background image loaded.';
            drawFrame(0); // initial draw
        };
        img.src = url;
    }

    // Album cover processing function
    async function processAlbumFile(file) {
        const url = URL.createObjectURL(file);
        loadAlbumFromUrl(url);
    }

    function loadAlbumFromUrl(url) {
        statusMessage.textContent = 'Loading album cover...';
        const img = new Image();
        img.crossOrigin = "anonymous"; // Try to avoid tainting the canvas
        img.onload = () => {
            albumImage = img;
            statusMessage.textContent = 'Album cover loaded.';
            drawFrame(0); // initial draw
        };
        img.onerror = () => {
            statusMessage.textContent = 'Error loading image URL. It might be blocked by security (CORS).';
            console.error('CORS or Load Error for:', url);
        };
        img.src = url;
    }

    // Input event listeners
    audioInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processAudioFile(e.target.files[0]);
    });

    lrcInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processLrcFile(e.target.files[0]);
    });

    bgInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processBgFile(e.target.files[0]);
    });

    albumInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processAlbumFile(e.target.files[0]);
    });

    loadAlbumUrlBtn.addEventListener('click', () => {
        const url = albumUrlInput.value.trim();
        if (url) loadAlbumFromUrl(url);
    });

    lrcEditor.addEventListener('input', updateLyricsFromEditor);

    fontSelect.addEventListener('change', (e) => {
        currentFont = e.target.value;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    lyricColorInput.addEventListener('input', (e) => {
        currentLyricColor = e.target.value;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    glowColorInput.addEventListener('input', (e) => {
        currentGlowColor = e.target.value;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    bgStyleSelect.addEventListener('change', (e) => {
        currentBgStyle = e.target.value;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    creditsNameInput.addEventListener('input', () => {
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    // Drag and Drop global handlers
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        dropOverlay.classList.add('active');
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dropOverlay.classList.remove('active');
        }
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.remove('active');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(handleDroppedFile);
        }
    });

    function handleDroppedFile(file) {
        const fileName = file.name.toLowerCase();
        const isAudio = file.type.startsWith('audio/') ||
            ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'].some(ext => fileName.endsWith(ext));
        const isLrc = fileName.endsWith('.lrc') || fileName.endsWith('.ttml') || fileName.endsWith('.xml') || file.type === 'text/plain' || file.type === 'application/xml' || file.type === 'text/xml';
        const isImage = file.type.startsWith('image/') ||
            ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => fileName.endsWith(ext));

        if (isAudio) {
            processAudioFile(file);
        } else if (isLrc) {
            processLrcFile(file);
        } else if (isImage) {
            // Heuristic: if it looks like an album cover (squareish) or user dropped 2nd image
            if (bgImage && !albumImage) {
                processAlbumFile(file);
            } else {
                processBgFile(file);
            }
        } else {
            statusMessage.textContent = `Unrecognized file type: ${file.name}`;
        }
    }

    function parseLrc(lrcText) {
        const lines = lrcText.split('\n');
        const parsed = [];
        const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        lines.forEach(line => {
            let match;
            const lineLyrics = line.replace(timeReg, '').trim();
            if (!lineLyrics) return;

            // Reset regex index
            timeReg.lastIndex = 0;
            while ((match = timeReg.exec(line)) !== null) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1);

                const time = minutes * 60 + seconds + milliseconds / 1000;
                parsed.push({ time, text: lineLyrics });
            }
        });

        return parsed.sort((a, b) => a.time - b.time);
    }

    function parseTtml(ttmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(ttmlText, "text/xml");
        const paragraphs = xmlDoc.getElementsByTagName('p');
        const parsed = [];

        function parseTime(timeStr) {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
            if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
            return parseFloat(timeStr);
        }

        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            const begin = p.getAttribute('begin');
            if (begin) {
                const time = parseTime(begin);
                
                const spans = p.getElementsByTagName('span');
                const words = [];
                let textContent = '';

                if (spans.length > 0) {
                    let currentTimeForWord = time;
                    Array.from(p.childNodes).forEach(node => {
                        if (node.nodeType === 3) {
                            const t = node.textContent;
                            if (t) {
                                words.push({ text: t, time: currentTimeForWord, endTime: currentTimeForWord + 0.1 });
                            }
                        } else if (node.nodeType === 1 && node.tagName.toLowerCase() === 'span') {
                            const spanBegin = node.getAttribute('begin');
                            const spanEnd = node.getAttribute('end');
                            const wTime = spanBegin ? parseTime(spanBegin) : time;
                            const wEndTime = spanEnd ? parseTime(spanEnd) : wTime + 1;
                            currentTimeForWord = wTime;
                            
                            const wText = node.textContent;
                            if (wText) {
                                words.push({ text: wText, time: wTime, endTime: wEndTime });
                            }
                        }
                    });

                    // Auto-insert spaces between words if they are missing
                    for (let j = 0; j < words.length - 1; j++) {
                        const currentWord = words[j];
                        const nextWord = words[j+1];
                        if (!currentWord.text.endsWith(' ') && 
                            !currentWord.text.endsWith('\u00A0') &&
                            !nextWord.text.startsWith(' ') && 
                            !nextWord.text.startsWith('\u00A0') &&
                            !/^[.,!?\]}'")]/.test(nextWord.text)) {
                            currentWord.text += ' ';
                        }
                    }
                    textContent = words.map(w => w.text).join('');
                } else {
                    textContent = p.textContent.trim();
                }

                if (textContent.trim()) {
                    parsed.push({ time, text: textContent.trim(), words: words.length > 0 ? words : null });
                }
            }
        }
        return parsed.sort((a, b) => a.time - b.time);
    }

    function drawFrame(currentTime) {
        // Find current lyric index
        let currentIndex = 0;
        if (lyrics.length > 0) {
            for (let i = 0; i < lyrics.length; i++) {
                if (currentTime >= lyrics[i].time) currentIndex = i;
                else break;
            }
        }

        // Smooth the index transition for silky smooth UI and color shifts
        // Lower factor = slower, more atmospheric transitions
        const indexDiff = currentIndex - smoothedIndex;
        smoothedIndex += indexDiff * 0.04;

        // Clear background
        if (bgImage) {
            // Draw background covering the canvas
            const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
            const x = (canvas.width / 2) - (bgImage.width / 2) * scale;
            const y = (canvas.height / 2) - (bgImage.height / 2) * scale;
            ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);

            // Dark overlay for readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (currentBgStyle === 'albumBlur' && albumImage) {
            const scale = Math.max(canvas.width / albumImage.width, canvas.height / albumImage.height);
            const x = (canvas.width / 2) - (albumImage.width / 2) * scale;
            const y = (canvas.height / 2) - (albumImage.height / 2) * scale;
            ctx.save();
            ctx.filter = 'blur(60px) brightness(0.4)';
            ctx.drawImage(albumImage, x - 100, y - 100, (albumImage.width * scale) + 200, (albumImage.height * scale) + 200);
            ctx.restore();
        } else {
            // Default dynamic gradient background
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            let hue;

            if (currentBgStyle === 'reactive') {
                // Use a sine wave to oscillate through colors smoothly based on progress
                // This prevents the "cut" when hue wraps from 359 to 0
                hue = 220 + Math.sin(smoothedIndex * 0.4) * 60;
            } else {
                // Slowly shifting pulse
                hue = (currentTime * 10) % 360;
            }

            gradient.addColorStop(0, `hsl(${hue}, 40%, 15%)`);
            gradient.addColorStop(1, `hsl(${(hue + 80) % 360}, 50%, 10%)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw Album Cover (Left Side)
        if (albumImage) {
            const size = 600;
            const x = 200;
            const y = (canvas.height - size) / 2;

            ctx.save();
            // Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 50;

            // Rounded corners for album cover
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 30);
            ctx.clip();
            ctx.drawImage(albumImage, x, y, size, size);
            ctx.restore();
        }

        // Permanent App Credit
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `600 24px ${currentFont}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(`Made with LRC Video Creator`, 40, 40);
        ctx.restore();

        const creditsName = creditsNameInput.value.trim();
        if (creditsName) {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.font = `600 30px ${currentFont}`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;
            ctx.fillText(`Lyric video by ${creditsName}`, 40, canvas.height - 40);
            ctx.restore();
        }

        if (lyrics.length === 0) return;

        // Draw Lyrics (Right Side, Left Aligned)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const lyricX = 900; // Starting point for lyrics on the right
        const centerY = canvas.height / 2;
        const lineSpacing = 180;

        function wrapText(context, lyric, x, y, maxWidth, lineHeight, isCurrent, currentTime, opacity) {
            let items = [];
            
            if (lyric.words && lyric.words.length > 0) {
                items = lyric.words;
            } else {
                const textWords = lyric.text.split(' ');
                for (let i = 0; i < textWords.length; i++) {
                    items.push({ text: textWords[i] + (i < textWords.length - 1 ? ' ' : ''), time: lyric.time, endTime: lyric.time + 1 });
                }
            }

            const lines = [];
            let currentLine = [];
            let currentLineWidth = 0;

            const spaceWidth = context.measureText(' ').width;

            for (let n = 0; n < items.length; n++) {
                const item = items[n];
                
                let text = item.text;
                let trailingSpaces = 0;
                let leadingSpaces = 0;
                
                while(text.endsWith(' ') || text.endsWith('\u00A0') || text.endsWith('\t') || text.endsWith('\n') || text.endsWith('\r')) {
                    trailingSpaces++;
                    text = text.slice(0, -1);
                }
                while(text.startsWith(' ') || text.startsWith('\u00A0') || text.startsWith('\t') || text.startsWith('\n') || text.startsWith('\r')) {
                    leadingSpaces++;
                    text = text.slice(1);
                }
                
                const cleanWidth = text.length > 0 ? context.measureText(text).width : 0;
                const itemWidth = cleanWidth + (leadingSpaces + trailingSpaces) * spaceWidth;

                item.renderText = text;
                item.leadingSpaces = leadingSpaces;
                item.trailingSpaces = trailingSpaces;
                item.cleanWidth = cleanWidth;

                if (currentLineWidth + itemWidth > maxWidth && currentLine.length > 0) {
                    lines.push({ width: currentLineWidth, items: currentLine });
                    currentLine = [item];
                    currentLineWidth = itemWidth;
                } else {
                    currentLine.push(item);
                    currentLineWidth += itemWidth;
                }
            }
            if (currentLine.length > 0) {
                lines.push({ width: currentLineWidth, items: currentLine });
            }

            const startY = y - ((lines.length - 1) * lineHeight) / 2;
            
            for (let i = 0; i < lines.length; i++) {
                let currentX = x;
                const line = lines[i];
                const lineY = startY + (i * lineHeight);

                for (let j = 0; j < line.items.length; j++) {
                    const item = line.items[j];
                    
                    if (isCurrent && lyric.words) {
                        let progress = 0;
                        const duration = item.endTime - item.time;
                        if (currentTime >= item.endTime || duration <= 0) {
                            progress = 1;
                        } else if (currentTime > item.time) {
                            progress = (currentTime - item.time) / duration;
                        }

                        currentX += item.leadingSpaces * spaceWidth;
                        
                        if (item.renderText) {
                            // Base inactive text
                            context.fillStyle = `rgba(203, 213, 225, 0.5)`;
                            context.shadowColor = 'transparent';
                            context.shadowBlur = 0;
                            context.fillText(item.renderText, currentX, lineY);

                            // Overlay active text clipped by progress
                            if (progress > 0) {
                                context.save();
                                context.beginPath();
                                context.rect(currentX, lineY - lineHeight, item.cleanWidth * progress, lineHeight * 2);
                                context.clip();
                                
                                context.fillStyle = currentLyricColor;
                                context.shadowColor = currentGlowColor;
                                context.shadowBlur = 20 * opacity;
                                context.fillText(item.renderText, currentX, lineY);
                                context.restore();
                            }
                            
                            currentX += item.cleanWidth;
                        }
                    } else {
                        currentX += item.leadingSpaces * spaceWidth;
                        if (item.renderText) {
                            context.fillText(item.renderText, currentX, lineY);
                            currentX += item.cleanWidth;
                        }
                    }
                    currentX += item.trailingSpaces * spaceWidth;
                }
            }
        }

        for (let i = Math.max(0, currentIndex - 3); i <= Math.min(lyrics.length - 1, currentIndex + 3); i++) {
            const lyric = lyrics[i];
            const distance = i - smoothedIndex;

            // Calculate opacity based on distance from center (0)
            const absDistance = Math.abs(distance);
            const opacity = Math.max(0, 1 - absDistance * 0.35);

            // Calculate scale based on distance
            const scale = Math.max(0.7, 1 - absDistance * 0.1);

            // Calculate Y position
            const yPos = centerY + (distance * lineSpacing);

            if (opacity > 0) {
                ctx.save();
                ctx.translate(lyricX, yPos);
                ctx.scale(scale, scale);

                let fontSize;
                if (i === currentIndex) {
                    fontSize = 70;
                    ctx.font = `bold ${fontSize}px ${currentFont}`;
                    ctx.fillStyle = currentLyricColor;
                    ctx.shadowColor = currentGlowColor;
                    ctx.shadowBlur = 20 * opacity;
                } else {
                    fontSize = 50;
                    ctx.font = `600 ${fontSize}px ${currentFont}`;
                    ctx.fillStyle = `rgba(203, 213, 225, ${opacity * 0.5})`;
                    ctx.shadowBlur = 0;
                }

                wrapText(ctx, lyric, 0, 0, 900, fontSize * 1.3, i === currentIndex, currentTime, opacity);
                ctx.restore();
            }
        }
    }

    function renderLoop() {
        if (!isPlaying && !isRecording) return;

        let currentTime;
        if (isRecording) {
            currentTime = audioContext.currentTime - startTime;
        } else {
            currentTime = audioContext.currentTime - startTime + pausedTime;
        }

        drawFrame(currentTime);

        // Update progress bar
        if (isRecording && audioBuffer) {
            const progress = (currentTime / audioBuffer.duration) * 100;
            progressBar.style.width = `${Math.min(100, progress)}%`;
        }

        if (currentTime >= audioBuffer.duration) {
            stopPlayback();
        } else {
            animationFrameId = requestAnimationFrame(renderLoop);
        }
    }

    function startPlayback() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;

        // Setup nodes
        audioSource.connect(audioContext.destination);

        startTime = audioContext.currentTime;
        audioSource.start(0, pausedTime);
        isPlaying = true;
        playBtn.textContent = 'Stop Preview';

        renderLoop();
    }

    function stopPlayback() {
        if (audioSource) {
            audioSource.stop();
            audioSource.disconnect();
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        isPlaying = false;
        pausedTime = 0;
        smoothedIndex = 0;
        playBtn.textContent = 'Preview Video';
        drawFrame(0);

        if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            statusMessage.textContent = 'Processing video...';
        }
    }

    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    });

    exportBtn.addEventListener('click', () => {
        if (isRecording) return;

        // Stop preview if running
        if (isPlaying) stopPlayback();

        statusMessage.textContent = 'Recording video... Please wait until audio finishes.';
        exportBtn.disabled = true;
        playBtn.disabled = true;

        // Show progress bar
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';

        startRecording();
    });

    function startRecording() {
        isRecording = true;
        recordedChunks = [];

        // Create a completely isolated AudioContext for recording only
        // This ensures NO other audio sources (like mic or system alerts) can bleed in
        const recordCtx = new (window.AudioContext || window.webkitAudioContext)();
        const recordDestination = recordCtx.createMediaStreamDestination();
        const recordSource = recordCtx.createBufferSource();
        recordSource.buffer = audioBuffer;

        // Connect ONLY the song to the recording destination
        recordSource.connect(recordDestination);

        // Also connect the original audioSource to the original audioContext so the user can hear it while it records
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioContext.destination);

        // Get canvas visual stream
        const canvasStream = canvas.captureStream(30); // 30 FPS

        // Combine isolated audio and video tracks
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...recordDestination.stream.getAudioTracks()
        ]);

        try {
            // Priority list of mime types
            const mimeTypes = [
                'video/mp4',
                'video/webm; codecs=h264',
                'video/webm; codecs=vp9',
                'video/webm'
            ];

            let options = {};
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    options = { mimeType };
                    break;
                }
            }

            mediaRecorder = new MediaRecorder(combinedStream, options);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                recordCtx.close(); // Close the isolated recording context
                const mimeType = mediaRecorder.mimeType || 'video/mp4';
                const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const filename = `lyric_video.${extension}`;

                const file = new File(recordedChunks, filename, { type: mimeType });
                const url = URL.createObjectURL(file);

                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.setAttribute('download', filename);
                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 5000);

                isRecording = false;
                exportBtn.disabled = false;
                playBtn.disabled = false;
                progressContainer.style.display = 'none';
                statusMessage.textContent = 'Video generated and downloaded!';
            };

            // Start recording and playback
            mediaRecorder.start();
            startTime = audioContext.currentTime;
            recordSource.start(0);
            audioSource.start(0);
            renderLoop();

        } catch (e) {
            console.error('MediaRecorder error:', e);
            statusMessage.textContent = 'Error starting video recording.';
            isRecording = false;
            exportBtn.disabled = false;
            playBtn.disabled = false;
        }
    }
});
