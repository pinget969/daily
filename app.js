class DailyScrumApp {
    constructor() {
        this.participants = JSON.parse(localStorage.getItem('daily-participants')) || [];
        this.currentQueue = [];
        this.currentIndex = -1;
        this.isPaused = false;

        // Timers
        this.globalTimerSeconds = 0;
        this.speakerTimerSeconds = 0;
        this.globalInterval = null;
        this.speakerInterval = null;

        // Metrics
        this.results = [];

        this.initElements();
        this.initEvents();
        this.renderParticipantList();
    }

    initElements() {
        this.views = {
            setup: document.getElementById('view-setup'),
            active: document.getElementById('view-active'),
            summary: document.getElementById('view-summary')
        };

        this.forms = {
            add: document.getElementById('add-participant-form')
        };

        this.displays = {
            participantList: document.getElementById('participant-list'),
            participantCount: document.getElementById('participant-count'),
            globalTimer: document.getElementById('global-timer-display'),
            globalTimerEmoji: document.getElementById('global-timer-emoji'),
            globalTimerContainer: document.getElementById('global-timer-container'),
            speakerName: document.getElementById('current-speaker-name'),
            speakerTimer: document.getElementById('current-speaker-timer'),
            speakerBadges: document.getElementById('speaker-status-badges'),
            speakerQuestions: document.getElementById('speaker-guide-questions'),
            parkingLot: document.getElementById('parking-lot-content'),
            progressCurrent: document.getElementById('current-index'),
            progressTotal: document.getElementById('total-participants'),
            summaryTable: document.getElementById('summary-table-body'),
            statTotal: document.getElementById('stat-total-time'),
            statAvg: document.getElementById('stat-avg-time'),
            statFastest: document.getElementById('stat-fastest'),
            statSlowest: document.getElementById('stat-slowest')
        };

        this.btns = {
            start: document.getElementById('start-daily-btn'),
            next: document.getElementById('next-btn'),
            skip: document.getElementById('skip-btn'),
            pause: document.getElementById('pause-daily-btn'),
            stop: document.getElementById('stop-daily-btn'),
            restart: document.getElementById('restart-btn'),
            clear: document.getElementById('clear-list-btn'),
            toggleLate: document.getElementById('toggle-late-btn'),
            toggleDelayed: document.getElementById('toggle-delayed-btn')
        };
    }

    initEvents() {
        this.forms.add.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('p-name');
            this.addParticipant(nameInput.value);
            nameInput.value = '';
        });

        this.btns.start.addEventListener('click', () => this.startDaily());
        this.btns.next.addEventListener('click', () => this.nextSpeaker());
        this.btns.skip.addEventListener('click', () => this.skipSpeaker());
        this.btns.pause.addEventListener('click', () => this.togglePause());
        this.btns.stop.addEventListener('click', () => this.finishDaily());
        this.btns.restart.addEventListener('click', () => this.resetApp());
        this.btns.clear.addEventListener('click', () => {
            this.participants = [];
            this.saveAndRender();
        });

        this.btns.toggleLate.addEventListener('click', () => this.toggleSpeakerStatus('isLate'));
        this.btns.toggleDelayed.addEventListener('click', () => this.toggleSpeakerStatus('isDelayed'));
    }

    // --- Participant Management ---
    addParticipant(name) {
        const id = Date.now().toString();
        this.participants.push({
            id,
            name,
            isLate: false,
            isDelayed: false,
            excludeFromRotation: false,
            status: 'pending'
        });
        this.saveAndRender();
    }

    removeParticipant(id) {
        this.participants = this.participants.filter(p => p.id !== id);
        this.saveAndRender();
    }

    toggleStatus(id, field) {
        const p = this.participants.find(p => p.id === id);
        if (p) p[field] = !p[field];
        this.saveAndRender();
    }

    saveAndRender() {
        localStorage.setItem('daily-participants', JSON.stringify(this.participants));
        this.renderParticipantList();
    }

    renderParticipantList() {
        this.displays.participantList.innerHTML = '';
        this.displays.participantCount.textContent = this.participants.length;

        this.participants.forEach(p => {
            const li = document.createElement('li');
            li.className = 'participant-item';
            li.innerHTML = `
                <div class="participant-info">
                    <span style="font-weight: 600; ${p.excludeFromRotation ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${p.name}</span>
                    <div style="display: flex; gap: 0.3rem;">
                        ${p.excludeFromRotation ? '<span class="badge badge-guest">Invitado/SM</span>' : ''}
                        ${p.isLate ? '<span class="badge badge-late">Tarde</span>' : ''}
                        ${p.isDelayed ? '<span class="badge badge-delayed">Demorado</span>' : ''}
                    </div>
                </div>
                <div class="participant-actions">
                    <button class="btn btn-ghost" onclick="app.toggleStatus('${p.id}', 'excludeFromRotation')" title="Excluir de Rotación">
                        <i data-lucide="${p.excludeFromRotation ? 'user-check' : 'user-x'}"></i>
                    </button>
                    <button class="btn btn-ghost" onclick="app.toggleStatus('${p.id}', 'isLate')" title="Tarde">
                        <i data-lucide="clock"></i>
                    </button>
                    <button class="btn btn-ghost" onclick="app.toggleStatus('${p.id}', 'isDelayed')" title="Demorado">
                        <i data-lucide="alert-triangle"></i>
                    </button>
                    <button class="btn btn-ghost" onclick="app.removeParticipant('${p.id}')" style="color: var(--accent-danger);">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            this.displays.participantList.appendChild(li);
        });
        lucide.createIcons();
    }

    // --- Daily Flow ---
    switchView(viewName) {
        Object.values(this.views).forEach(v => v.classList.remove('active'));
        this.views[viewName].classList.add('active');
    }

    startDaily() {
        if (this.participants.length === 0) return alert('Agrega participantes primero.');

        this.results = [];
        // Only participants not excluded from rotation
        this.currentQueue = this.participants
            .filter(p => !p.excludeFromRotation)
            .sort(() => Math.random() - 0.5);

        // Add "Preguntas / Parking Lot" as the last item
        this.currentQueue.push({
            id: 'parking-lot',
            name: 'Preguntas / Parking Lot',
            isLate: false,
            isDelayed: false,
            isParkingLot: true
        });

        this.currentIndex = 0;
        this.globalTimerSeconds = 0;

        this.displays.progressTotal.textContent = this.currentQueue.length;
        this.displays.globalTimerContainer.classList.remove('hidden');

        this.switchView('active');
        this.startGlobalTimer();
        this.showSpeaker(this.currentQueue[this.currentIndex]);
    }

    showSpeaker(speaker) {
        const card = document.getElementById('speaker-card');
        card.classList.remove('transitioning');
        card.classList.add('entering');

        this.displays.speakerName.textContent = speaker.name;
        this.displays.progressCurrent.textContent = this.currentIndex + 1;
        this.speakerTimerSeconds = 0;
        this.updateSpeakerTimerDisplay();
        this.renderSpeakerBadges();

        // Show/Hide Questions vs Parking Lot
        if (speaker.isParkingLot) {
            this.displays.speakerQuestions.classList.add('hidden');
            this.displays.parkingLot.classList.remove('hidden');
            this.btns.skip.classList.add('hidden');
            this.btns.toggleLate.classList.add('hidden');
            this.btns.toggleDelayed.classList.add('hidden');
        } else {
            this.displays.speakerQuestions.classList.remove('hidden');
            this.displays.parkingLot.classList.add('hidden');
            this.btns.skip.classList.remove('hidden');
            this.btns.toggleLate.classList.remove('hidden');
            this.btns.toggleDelayed.classList.remove('hidden');
        }

        this.startSpeakerTimer();

        setTimeout(() => card.classList.remove('entering'), 300);
    }

    renderSpeakerBadges() {
        const speaker = this.currentQueue[this.currentIndex];
        this.displays.speakerBadges.innerHTML = '';
        if (speaker.isLate) this.displays.speakerBadges.innerHTML += '<span class="badge badge-late" style="font-size: 1rem; padding: 0.5rem 1rem;">Llegó Tarde 🕒</span>';
        if (speaker.isDelayed) this.displays.speakerBadges.innerHTML += '<span class="badge badge-delayed" style="font-size: 1rem; padding: 0.5rem 1rem;">Demorado ⚠️</span>';
    }

    toggleSpeakerStatus(field) {
        const speaker = this.currentQueue[this.currentIndex];
        speaker[field] = !speaker[field];
        this.renderSpeakerBadges();
    }

    async nextSpeaker() {
        const card = document.getElementById('speaker-card');
        card.classList.add('transitioning');

        await new Promise(r => setTimeout(r, 300));

        this.recordResult(false);
        this.currentIndex++;
        this.playAlertSound(880, 0.1);

        if (this.currentIndex < this.currentQueue.length) {
            this.showSpeaker(this.currentQueue[this.currentIndex]);
        } else {
            this.finishDaily();
        }
    }

    async skipSpeaker() {
        const card = document.getElementById('speaker-card');
        card.classList.add('transitioning');

        await new Promise(r => setTimeout(r, 300));

        this.recordResult(true);
        this.currentIndex++;
        this.playAlertSound(330, 0.1);

        if (this.currentIndex < this.currentQueue.length) {
            this.showSpeaker(this.currentQueue[this.currentIndex]);
        } else {
            this.finishDaily();
        }
    }

    recordResult(skipped) {
        clearInterval(this.speakerInterval);
        const speaker = this.currentQueue[this.currentIndex];
        this.results.push({
            name: speaker.name,
            time: skipped ? 0 : this.speakerTimerSeconds,
            isLate: speaker.isLate,
            isDelayed: speaker.isDelayed,
            skipped: skipped,
            isParkingLot: speaker.isParkingLot
        });
    }

    // --- Timers ---
    startGlobalTimer() {
        this.globalInterval = setInterval(() => {
            if (this.isPaused) return;
            this.globalTimerSeconds++;
            this.updateGlobalTimerDisplay();
        }, 1000);
    }

    updateGlobalTimerDisplay() {
        const timeStr = this.formatTime(this.globalTimerSeconds);
        this.displays.globalTimer.textContent = timeStr;

        const dot = document.getElementById('timer-dot');
        if (this.globalTimerSeconds < 600) { // < 10m
            this.displays.globalTimerEmoji.textContent = '😊';
            dot.style.background = 'var(--accent-primary)';
            dot.style.boxShadow = '0 0 10px var(--accent-primary)';
        } else if (this.globalTimerSeconds < 900) { // 10-15m
            this.displays.globalTimerEmoji.textContent = '😐';
            dot.style.background = 'var(--accent-warning)';
            dot.style.boxShadow = '0 0 10px var(--accent-warning)';
        } else { // > 15m
            this.displays.globalTimerEmoji.textContent = '😟';
            dot.style.background = 'var(--accent-danger)';
            dot.style.boxShadow = '0 0 10px var(--accent-danger)';
        }
    }

    startSpeakerTimer() {
        clearInterval(this.speakerInterval);
        this.speakerInterval = setInterval(() => {
            if (this.isPaused) return;
            this.speakerTimerSeconds++;
            this.updateSpeakerTimerDisplay();
        }, 1000);
    }

    updateSpeakerTimerDisplay() {
        this.displays.speakerTimer.textContent = this.formatTime(this.speakerTimerSeconds);
        const card = document.getElementById('speaker-card');

        // Progress bar logic (assuming 60s is standard, 120s is danger)
        let progress = (this.speakerTimerSeconds / 60) * 100;
        if (progress > 100) progress = 100;
        card.style.setProperty('--speaker-progress', `${progress}%`);

        // Visual updates
        if (this.speakerTimerSeconds > 120) {
            this.displays.speakerTimer.style.color = 'var(--accent-danger)';
            card.classList.add('danger');
            card.classList.remove('warning');
            if (this.speakerTimerSeconds % 10 === 0) this.playAlertSound(660, 0.1);
        } else if (this.speakerTimerSeconds > 60) {
            this.displays.speakerTimer.style.color = 'var(--accent-warning)';
            card.classList.add('warning');
            card.classList.remove('danger');
            if (this.speakerTimerSeconds === 61) this.playAlertSound(440, 0.2);
        } else {
            this.displays.speakerTimer.style.color = 'var(--accent-info)';
            card.classList.remove('warning', 'danger');
        }

        // Inline style for progress (since we updated CSS to use width)
        const progressElement = card.querySelector('.speaker-card::before'); // This doesn't work for pseudo-elements via JS directly
        // Better: use a CSS variable or just set the style of the pseudo element by adding a style tag or using a real element
    }

    playAlertSound(freq, duration) {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.value = freq;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + duration);
            osc.stop(context.currentTime + duration);
        } catch (e) { console.log("Audio not supported or blocked"); }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.btns.pause.innerHTML = this.isPaused ? '<i data-lucide="play"></i> Reanudar' : '<i data-lucide="pause"></i> Pausar';
        lucide.createIcons();
    }

    // --- Results & Summary ---
    finishDaily() {
        clearInterval(this.globalInterval);
        clearInterval(this.speakerInterval);

        this.calculateMetrics();
        this.renderSummary();
        this.switchView('summary');
    }

    calculateMetrics() {
        const total = this.globalTimerSeconds;
        const validResults = this.results.filter(r => !r.skipped && !r.isParkingLot);
        const avg = validResults.length > 0 ? Math.round(validResults.reduce((acc, r) => acc + r.time, 0) / validResults.length) : 0;

        const sorted = [...validResults].sort((a, b) => a.time - b.time);
        const fastest = sorted.length > 0 ? sorted[0].name : '-';
        const slowest = sorted.length > 0 ? sorted[sorted.length - 1].name : '-';

        this.displays.statTotal.textContent = this.formatTime(total);
        this.displays.statAvg.textContent = this.formatTime(avg);
        this.displays.statFastest.textContent = fastest;
        this.displays.statSlowest.textContent = slowest;
    }

    getClassification(res) {
        if (res.skipped) return { emoji: '😴', text: 'Dormido' };
        if (res.isParkingLot) return { emoji: '💬', text: 'Debate' };

        let emojis = '';
        let text = '';

        if (res.time <= 30) { emojis += '⚡'; text = 'Speedrun'; }
        else if (res.time <= 60) { emojis += '🚀'; text = 'Sin Bugs'; }
        else if (res.time <= 120) { emojis += '🐢'; text = 'Tortuga Ninja'; }
        else { emojis += '🍿'; text = 'Versión Extendida'; }

        if (res.isDelayed) emojis += '⚠️';
        if (res.isLate) emojis += '🕒';

        return { emoji: emojis, text: text };
    }

    renderSummary() {
        this.displays.summaryTable.innerHTML = '';

        this.results.forEach(res => {
            const classification = this.getClassification(res);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: var(--text-bright);">${res.name}</strong></td>
                <td>
                    ${res.isLate ? '<span class="badge badge-late">Tarde</span>' : ''}
                    ${res.isDelayed ? '<span class="badge badge-delayed">Demorado</span>' : ''}
                </td>
                <td>${res.skipped ? '--' : this.formatTime(res.time)}</td>
                <td>
                    <span class="emoji-rank" title="${classification.text}">${classification.emoji}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">${classification.text}</span>
                </td>
            `;
            this.displays.summaryTable.appendChild(tr);
        });
    }

    resetApp() {
        this.displays.globalTimerContainer.classList.add('hidden');
        this.switchView('setup');
    }
}

// Global instance for inline event handlers
const app = new DailyScrumApp();
