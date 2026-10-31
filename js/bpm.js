/* BPM timeline UI and beat maths. */

function renderBpmList() {
    if (!bpmList) return;
    bpmList.innerHTML = '';
    bpmMarkers.sort((a, b) => a.time - b.time);

    bpmMarkers.forEach((marker, index) => {
        const isFirst = index === 0;

        const row = document.createElement('div');
        row.className = 'bpm-row';

        // Time badge
        const timeBadge = document.createElement('div');
        timeBadge.className = 'bpm-time' + (isFirst ? ' is-start' : '');
        timeBadge.textContent = isFirst ? 'Start' : formatDuration(marker.time);

        // BPM input
        const bpmInput = document.createElement('input');
        bpmInput.type = 'number';
        bpmInput.min = '20';
        bpmInput.max = '300';
        bpmInput.className = 'bpm-input';
        bpmInput.placeholder = '120';
        bpmInput.value = marker.bpm > 0 ? marker.bpm : '';

        bpmInput.addEventListener('input', (e) => {
            marker.bpm = parseFloat(e.target.value) || 0;
            drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
            saveProgressToLocalStorage();
        });

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'bpm-remove-btn';
        removeBtn.title = 'Remove this BPM marker';
        removeBtn.textContent = '✕';
        removeBtn.style.visibility = isFirst ? 'hidden' : 'visible';

        if (!isFirst) {
            removeBtn.addEventListener('click', () => {
                bpmMarkers.splice(index, 1);
                renderBpmList();
                drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
                saveProgressToLocalStorage();
            });
        }

        row.appendChild(timeBadge);
        row.appendChild(bpmInput);
        row.appendChild(removeBtn);
        bpmList.appendChild(row);
    });
}

if (addBpmBtn) {
    addBpmBtn.addEventListener('click', () => {
        const ct = isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : pausedTime;
        const exists = bpmMarkers.find(m => Math.abs(m.time - ct) < 0.1);
        if (!exists) {
            const { bpm } = getBeatInfo(ct, bpmMarkers);
            bpmMarkers.push({ time: ct, bpm: bpm > 0 ? bpm : 120 });
            bpmMarkers.sort((a, b) => a.time - b.time);
            renderBpmList();
            saveProgressToLocalStorage();
            // Briefly flash the new row to draw attention
            const rows = bpmList.querySelectorAll('.bpm-row');
            const newIdx = bpmMarkers.findIndex(m => Math.abs(m.time - ct) < 0.1);
            const newRow = rows[newIdx];
            if (newRow) {
                newRow.style.background = 'rgba(99,102,241,0.18)';
                newRow.style.borderColor = 'rgba(99,102,241,0.4)';
                setTimeout(() => {
                    newRow.style.background = 'rgba(255,255,255,0.04)';
                    newRow.style.borderColor = 'rgba(255,255,255,0.06)';
                }, 600);
            }
        }
    });
}

function syncBpmFromDom() {
    if (!bpmList) return;
    const inputs = bpmList.querySelectorAll('.bpm-input');
    inputs.forEach((input, i) => {
        if (bpmMarkers[i] !== undefined) {
            bpmMarkers[i].bpm = parseFloat(input.value) || 0;
        }
    });
}

function getBeatInfo(time, markers) {
    if (!markers || markers.length === 0) return { bpm: 0, phase: 0 };
    let beats = 0;
    let currentBpm = markers[0].bpm;
    let lastTime = 0;

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        if (time < marker.time) {
            break;
        }
        if (i > 0) {
            const duration = marker.time - lastTime;
            beats += duration * (currentBpm / 60);
        }
        currentBpm = marker.bpm;
        lastTime = marker.time;
    }

    const duration = Math.max(0, time - lastTime);
    beats += duration * (currentBpm / 60);

    return {
        bpm: currentBpm,
        phase: beats % 1
    };
}
