(function () {
    const DB_URL = 'https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app';
    const VALVES_KEY = 'durianZoneValvesV3';
    const LOGS_KEY = 'durianZoneWateringLogsV3';
    const SCHEDULES_KEY = 'durianZoneWateringSchedulesV2';
    const FARM_INFO_KEY = 'durianFarmZoneInfoV1';

    const ZONES = {
        A: { name: 'North Field', sensors: 1, valves: 1, cameras: 1 },
        B: { name: 'South Field', sensors: 1, valves: 1, cameras: 1 },
        C: { name: 'East Field', sensors: 1, valves: 1, cameras: 1 },
        D: { name: 'West Field', sensors: 1, valves: 1, cameras: 1 }
    };

    class VirtualValveManager {
        constructor() {
            this.currentZone = localStorage.getItem('selectedZone') || 'A';
            this.valves = this.loadValves();
            this.logs = this.loadList(LOGS_KEY);
            this.schedules = this.loadList(SCHEDULES_KEY);
            this.farmInfo = this.loadFarmInfo();
            this.manualWaterTimers = {};
            this.manualWaterRemaining = {};
            this.manualWaterCompletedAt = {};
            this.init();
        }

        init() {
            this.bindZoneNavigation();
            this.bindFarmScheduleForm();
            this.bindZoneScheduleForm();
            this.bindManualWatering();
            this.bindFarmInfo();
            this.bindListActions();
            this.setDefaultTimes();
            this.render();
            this.openInitialView();
            this.waitForFirebase();
        }

        loadValves() {
            const saved = this.readJson(VALVES_KEY, null);
            if (saved) return saved;

            const valves = {};
            Object.keys(ZONES).forEach((zone) => {
                valves[zone] = [{
                    id: `${zone}-V1`,
                    name: 'Valve 1',
                    zone,
                    sensorGroup: 'Soil Sensor 1',
                    status: 'closed',
                    flowRate: 12,
                    pressure: '2.2',
                    lastOpenedAt: null
                }];
            });
            this.saveValves(valves);
            return valves;
        }

        loadFarmInfo() {
            const saved = this.readJson(FARM_INFO_KEY, null);
            if (saved) return saved;

            const info = {};
            Object.keys(ZONES).forEach((zone) => {
                info[zone] = { treeAgeYears: '' };
            });
            this.saveFarmInfo(info);
            return info;
        }

        loadList(key) {
            return this.readJson(key, []);
        }

        readJson(key, fallback) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : fallback;
            } catch (error) {
                console.warn(`Could not read ${key}`, error);
                return fallback;
            }
        }

        saveValves(valves = this.valves) {
            localStorage.setItem(VALVES_KEY, JSON.stringify(valves));
        }

        saveLogs() {
            localStorage.setItem(LOGS_KEY, JSON.stringify(this.logs.slice(0, 80)));
        }

        saveSchedules() {
            localStorage.setItem(SCHEDULES_KEY, JSON.stringify(this.schedules.slice(0, 80)));
        }

        saveFarmInfo() {
            localStorage.setItem(FARM_INFO_KEY, JSON.stringify(this.farmInfo));
        }

        bindZoneNavigation() {
            document.querySelectorAll('[data-zone-select]').forEach((button) => {
                button.addEventListener('click', () => this.showZone(button.dataset.zoneSelect));
            });

            document.querySelectorAll('[data-zone-switch]').forEach((button) => {
                button.addEventListener('click', () => this.showZone(button.dataset.zoneSwitch));
            });

            document.getElementById('farmManagerHomeBtn')?.addEventListener('click', () => this.showHome());
        }

        bindFarmScheduleForm() {
            const farmForm = document.getElementById('farmScheduleForm');
            if (!farmForm) return;

            farmForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const zone = document.getElementById('farmScheduleZone')?.value || this.currentZone;
                const duration = Number(document.getElementById('farmScheduleDuration')?.value || 30);
                this.addSchedule({
                    zone,
                    datetime: document.getElementById('farmScheduleDateTime')?.value,
                    duration,
                    repeatEveryDays: null,
                    waterAmountLiters: this.calculateWaterAmount(duration, zone),
                    source: 'farm'
                });
                this.setDefaultTimes();
            });
        }

        bindZoneScheduleForm() {
            const zoneForm = document.getElementById('wateringScheduleForm');
            if (!zoneForm) return;

            zoneForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const duration = Number(document.getElementById('scheduleDuration')?.value || 30);
                this.addSchedule({
                    zone: this.currentZone,
                    datetime: this.buildZoneScheduleDateTime(),
                    duration,
                    repeatEveryDays: Number(document.getElementById('scheduleRepeatDays')?.value || 1),
                    waterAmountLiters: this.calculateWaterAmount(duration),
                    source: 'zone'
                });
                this.setDefaultTimes();
            });

            document.getElementById('scheduleDuration')?.addEventListener('change', () => this.updateWaterAmountPreview());
        }

        bindManualWatering() {
            const durationSelect = document.getElementById('manualWaterDuration');
            const waterButton = document.getElementById('manualWaterNowBtn');
            const cancelButton = document.getElementById('manualWaterCancelBtn');

            durationSelect?.addEventListener('change', () => {
                delete this.manualWaterCompletedAt[this.currentZone];
                this.updateManualWaterStatus();
            });
            waterButton?.addEventListener('click', () => {
                const activeLog = this.getActiveManualTask(this.currentZone);
                if (activeLog?.status === 'watering') {
                    this.pauseWateringLog(activeLog.id);
                    return;
                }

                if (activeLog?.status === 'paused') {
                    this.resumeWateringLog(activeLog.id);
                    return;
                }

                const duration = Number(durationSelect?.value || 30);
                delete this.manualWaterCompletedAt[this.currentZone];
                const log = this.waterZone(this.currentZone, duration, 'manual', null, 'watering');
                this.startManualWaterCountdown(duration, log?.id);
            });
            cancelButton?.addEventListener('click', () => {
                const activeLog = this.getActiveManualTask(this.currentZone);
                if (activeLog) this.cancelWateringLog(activeLog.id);
            });
        }

        bindFarmInfo() {
            const treeAgeInput = document.getElementById('treeAgeInput');
            const editButton = document.getElementById('treeAgeEditBtn');
            const saveButton = document.getElementById('treeAgeSaveBtn');
            const editor = document.getElementById('treeAgeEditor');
            if (!treeAgeInput) return;

            editButton?.addEventListener('click', () => {
                editor?.classList.remove('hidden');
                treeAgeInput.focus();
            });

            const saveTreeAge = () => {
                this.farmInfo[this.currentZone] = this.farmInfo[this.currentZone] || {};
                this.farmInfo[this.currentZone].treeAgeYears = treeAgeInput.value;
                this.saveFarmInfo();
                this.renderFarmInformation();
                this.syncFarmInfoToFirebase(this.currentZone);
                editor?.classList.add('hidden');
            };

            saveButton?.addEventListener('click', saveTreeAge);
            treeAgeInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    saveTreeAge();
                }
            });
        }

        bindListActions() {
            document.addEventListener('click', (event) => {
                const actionButton = event.target.closest('[data-schedule-action], [data-log-action]');
                if (!actionButton) return;

                if (actionButton.dataset.scheduleAction === 'remove') {
                    this.removeSchedule(actionButton.dataset.scheduleId);
                }

                if (actionButton.dataset.logAction === 'clear') {
                    this.clearLogs(actionButton.dataset.logScope || 'all');
                }
            });
        }

        openInitialView() {
            const match = window.location.hash.match(/zone-([A-D])/i);
            if (match) {
                this.showZone(match[1].toUpperCase(), false);
            } else {
                this.showHome(false);
            }
        }

        showHome(updateHash = true) {
            document.getElementById('farmManagerHome')?.classList.remove('hidden');
            document.getElementById('farmZoneDetail')?.classList.add('hidden');
            if (updateHash) history.replaceState(null, '', window.location.pathname);
            this.renderFarmLists();
        }

        showZone(zone, updateHash = true) {
            if (!ZONES[zone]) return;

            this.currentZone = zone;
            localStorage.setItem('selectedZone', zone);
            localStorage.setItem('selectedZoneName', ZONES[zone].name);
            document.getElementById('farmManagerHome')?.classList.add('hidden');
            document.getElementById('farmZoneDetail')?.classList.remove('hidden');
            if (updateHash) history.replaceState(null, '', `${window.location.pathname}#zone-${zone}`);

            if (window.cameraFeedManager?.setZone) {
                window.cameraFeedManager.setZone(zone, ZONES[zone].name);
            }

            this.render();
        }

        addSchedule({ zone, datetime, duration, repeatEveryDays, waterAmountLiters, source }) {
            if (!datetime || !ZONES[zone]) return;

            const schedule = {
                id: `schedule-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                zone,
                zoneName: ZONES[zone].name,
                datetime,
                duration,
                repeatEveryDays,
                waterAmountLiters,
                target: 'all',
                source,
                status: 'scheduled',
                createdAt: new Date().toISOString()
            };

            this.schedules.unshift(schedule);
            this.saveSchedules();
            this.render();
            this.syncScheduleToFirebase(schedule);
        }

        removeSchedule(scheduleId) {
            this.schedules = this.schedules.filter((schedule) => schedule.id !== scheduleId);
            this.saveSchedules();
            this.render();
            this.deleteScheduleFromFirebase(scheduleId);
        }

        waterZone(zone = this.currentZone, duration = 30, mode = 'manual', waterAmountLiters = null, status = 'completed') {
            const zoneValves = this.valves[zone] || [];
            const startedAt = new Date();
            zoneValves.forEach((valve) => {
                valve.status = 'open';
                valve.lastOpenedAt = startedAt.toISOString();
            });

            const log = {
                id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                zone,
                zoneName: ZONES[zone].name,
                valves: zoneValves.map((valve) => valve.id),
                duration,
                waterAmountLiters: waterAmountLiters || this.calculateWaterAmount(duration, zone),
                mode,
                status,
                createdAt: startedAt.toISOString(),
                startedAt: startedAt.toISOString(),
                endsAt: new Date(startedAt.getTime() + Number(duration || 0) * 60 * 1000).toISOString()
            };

            this.logs.unshift(log);
            if (status !== 'watering') {
                this.closeZoneValves(zone);
            }
            this.saveValves();
            this.saveLogs();
            this.render();
            this.syncLogToFirebase(log);
            return log;
        }

        clearLogs(scope = 'all') {
            this.logs = scope === 'zone'
                ? this.logs.filter((log) => log.zone !== this.currentZone)
                : [];
            this.saveLogs();
            this.render();
            this.clearLogsFromFirebase(scope);
        }

        render() {
            this.completeExpiredWateringLogs();
            this.resumeActiveWateringTimers();
            this.renderZoneSwitcher();
            this.renderFarmInformation();
            this.renderValveState();
            this.updateWaterAmountPreview();
            this.updateManualWaterStatus();
            this.renderZoneSchedules();
            this.renderZoneLogs();
            this.renderFarmLists();
        }

        renderZoneSwitcher() {
            document.querySelectorAll('[data-zone-switch]').forEach((button) => {
                button.classList.toggle('active', button.dataset.zoneSwitch === this.currentZone);
            });
        }

        renderFarmInformation() {
            const summary = document.getElementById('farmInfoSummary');
            if (!summary) return;

            const zoneValves = this.valves[this.currentZone] || [];
            const flowRate = zoneValves[0]?.flowRate || 12;
            summary.innerHTML = `
                <div class="farm-info-item">
                    <span>Soil sensor</span>
                    <strong>${ZONES[this.currentZone].sensors}</strong>
                </div>
                <div class="farm-info-item">
                    <span>Solenoid valve</span>
                    <strong>${zoneValves.length}</strong>
                </div>
                <div class="farm-info-item">
                    <span>Camera</span>
                    <strong>${ZONES[this.currentZone].cameras}</strong>
                </div>
                <div class="farm-info-item">
                    <span>Flow rate</span>
                    <strong>${flowRate} L/min</strong>
                </div>
            `;

            const treeAgeInput = document.getElementById('treeAgeInput');
            if (treeAgeInput && document.activeElement !== treeAgeInput) {
                treeAgeInput.value = this.farmInfo[this.currentZone]?.treeAgeYears || '';
            }

            const treeAgeText = document.getElementById('treeAgeText');
            if (treeAgeText) {
                const age = this.farmInfo[this.currentZone]?.treeAgeYears;
                treeAgeText.textContent = age
                    ? `Tree Age: ${age} year${Number(age) === 1 ? '' : 's'} - ${this.getTreeAgeStage(age)}.`
                    : 'Tree Age: Not set.';
            }
        }

        renderValveState() {
            const indicator = document.getElementById('valveStateIndicator');
            if (!indicator) return;

            const isOpen = (this.valves[this.currentZone] || []).some((valve) => valve.status === 'open');
            indicator.classList.toggle('open', isOpen);
            const label = indicator.querySelector('strong');
            if (label) label.textContent = isOpen ? 'Valve open' : 'Valve closed';
        }

        getTreeAgeStage(age) {
            const years = Number(age);
            if (!Number.isFinite(years)) return 'Unknown stage';
            if (years < 1) return 'New planting';
            if (years < 3) return 'Young tree';
            if (years < 4) return 'Pre-bearing growth';
            if (years < 7) return 'Early bearing stage';
            if (years < 10) return 'Fruiting stage';
            if (years < 16) return 'Full production stage';
            return 'Mature production stage';
        }

        renderZoneSchedules() {
            const list = document.getElementById('wateringScheduleList');
            if (!list) return;

            const zoneSchedules = this.schedules
                .filter((schedule) => schedule.zone === this.currentZone && schedule.status !== 'completed')
                .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
                .slice(0, 7);

            list.innerHTML = zoneSchedules.length
                ? zoneSchedules.map((schedule) => this.scheduleTemplate(schedule)).join('')
                : '<p class="empty-log">No schedules for this zone yet.</p>';
        }

        renderZoneLogs() {
            const list = document.getElementById('wateringLogList');
            const clearButton = document.getElementById('clearZoneLogsBtn');
            if (!list) return;

            const zoneLogs = this.logs.filter((log) => log.zone === this.currentZone).slice(0, 8);
            clearButton?.classList.toggle('hidden', !zoneLogs.length);
            list.innerHTML = zoneLogs.length
                ? zoneLogs.map((log) => this.logTemplate(log)).join('')
                : '<p class="empty-log">No watering logs for this zone yet.</p>';
        }

        renderFarmLists() {
            const scheduleList = document.getElementById('farmScheduleList');
            if (scheduleList) {
                const schedules = this.schedules
                    .filter((schedule) => schedule.status !== 'completed')
                    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
                    .slice(0, 7);
                scheduleList.innerHTML = schedules.length
                    ? schedules.map((schedule) => this.scheduleTemplate(schedule)).join('')
                    : '<p class="empty-log">No farm schedules yet.</p>';
            }

            const logList = document.getElementById('farmWateringLogList');
            if (logList) {
                logList.innerHTML = this.logs.length
                    ? this.logs.slice(0, 10).map((log) => this.logTemplate(log)).join('')
                    : '<p class="empty-log">No watering logs yet.</p>';
            }
        }

        scheduleTemplate(schedule) {
            return `
                <div class="farm-log-item">
                    <div>
                        <strong>Zone ${schedule.zone} - ${schedule.zoneName}</strong>
                        <span>${this.formatDateTime(schedule.datetime)} for ${schedule.duration} min</span>
                        <small>${this.scheduleMeta(schedule)}</small>
                    </div>
                    <div class="farm-log-actions">
                        <button type="button" data-schedule-action="remove" data-schedule-id="${schedule.id}">Remove</button>
                    </div>
                </div>
            `;
        }

        logTemplate(log) {
            return `
                <div class="farm-log-item">
                    <div>
                        <strong>Zone ${log.zone} - ${log.zoneName}</strong>
                        <span>${log.mode} watering, ${log.duration} min</span>
                        <small>Status: ${this.formatLogStatus(log.status)}</small>
                        <small>${log.valves.join(', ')} - ${this.formatDateTime(log.createdAt)}</small>
                    </div>
                </div>
            `;
        }

        formatLogStatus(status = 'completed') {
            if (status === 'watering') return 'Watering';
            if (status === 'paused') return 'Paused';
            if (status === 'cancelled') return 'Cancelled';
            return 'Completed';
        }

        setDefaultTimes() {
            const nextHour = new Date(Date.now() + 60 * 60 * 1000);
            nextHour.setMinutes(0, 0, 0);
            const dateTimeValue = this.toInputDateTime(nextHour);
            const farmInput = document.getElementById('farmScheduleDateTime');
            if (farmInput && !farmInput.value) farmInput.value = dateTimeValue;

            const timeInput = document.getElementById('scheduleTime');
            if (timeInput && !timeInput.value) {
                const pad = (number) => String(number).padStart(2, '0');
                timeInput.value = `${pad(nextHour.getHours())}:${pad(nextHour.getMinutes())}`;
            }
            this.updateWaterAmountPreview();
            this.updateManualWaterStatus();
        }

        buildZoneScheduleDateTime() {
            const timeValue = document.getElementById('scheduleTime')?.value;
            if (!timeValue) return null;

            const [hours, minutes] = timeValue.split(':').map(Number);
            const scheduled = new Date();
            scheduled.setHours(hours, minutes, 0, 0);
            if (scheduled < new Date()) scheduled.setDate(scheduled.getDate() + 1);
            return this.toInputDateTime(scheduled);
        }

        calculateWaterAmount(duration, zone = this.currentZone) {
            const flowRate = this.valves[zone]?.[0]?.flowRate || 12;
            return Math.round(Number(duration || 0) * flowRate);
        }

        updateWaterAmountPreview() {
            const amount = document.getElementById('scheduleWaterAmount');
            const duration = Number(document.getElementById('scheduleDuration')?.value || 30);
            if (amount) amount.textContent = `${this.calculateWaterAmount(duration)} L`;
        }

        updateManualWaterStatus() {
            const status = document.getElementById('manualWaterStatus');
            const waterButton = document.getElementById('manualWaterNowBtn');
            const cancelButton = document.getElementById('manualWaterCancelBtn');
            const durationSelect = document.getElementById('manualWaterDuration');
            const duration = Number(durationSelect?.value || 30);
            if (!status) return;

            const setTaskState = (state) => {
                const isActive = state === 'watering' || state === 'paused';
                status.classList.toggle('hidden', !isActive);
                durationSelect?.classList.toggle('hidden', isActive);
                cancelButton?.classList.toggle('hidden', !isActive);
                if (waterButton) {
                    waterButton.disabled = false;
                    waterButton.textContent = state === 'watering' ? 'Pause' : state === 'paused' ? 'Resume' : 'Water Now';
                }
            };

            const remaining = this.manualWaterRemaining[this.currentZone];
            if (remaining && remaining > 0) {
                setTaskState('watering');
                status.textContent = `Time left ${this.formatCountdown(remaining)}`;
                return;
            }

            const pausedLog = this.logs.find((log) => log.zone === this.currentZone && log.status === 'paused');
            if (pausedLog) {
                setTaskState('paused');
                status.textContent = `Paused at ${this.formatCountdown(pausedLog.remainingSeconds || 0)}`;
                return;
            }

            const activeLog = this.getActiveWateringLog(this.currentZone);
            if (activeLog) {
                const secondsLeft = this.getSecondsUntil(activeLog.endsAt);
                if (secondsLeft > 0) {
                    this.manualWaterRemaining[this.currentZone] = secondsLeft;
                    setTaskState('watering');
                    status.textContent = `Time left ${this.formatCountdown(secondsLeft)}`;
                    return;
                }
            }

            setTaskState('idle');

            const completedAt = this.manualWaterCompletedAt[this.currentZone];
            if (completedAt && Date.now() - completedAt < 5 * 60 * 1000) {
                const latestLog = this.logs.find((log) => log.zone === this.currentZone && log.completedAt);
                if (latestLog?.status === 'cancelled') {
                    durationSelect?.classList.remove('hidden');
                    status.classList.add('hidden');
                    return;
                }
                status.classList.remove('hidden');
                durationSelect?.classList.add('hidden');
                status.textContent = 'Watering complete';
                return;
            }

            if (durationSelect) durationSelect.classList.remove('hidden');
            status.classList.add('hidden');
        }

        startManualWaterCountdown(duration, logId = null, zone = this.currentZone) {

            if (this.manualWaterTimers[zone]) {
                clearInterval(this.manualWaterTimers[zone]);
            }

            const log = this.logs.find((item) => item.id === logId);
            this.manualWaterRemaining[zone] = log?.endsAt
                ? this.getSecondsUntil(log.endsAt)
                : duration * 60;
            const render = () => {
                if (zone === this.currentZone) {
                    this.updateManualWaterStatus();
                }
            };

            render();
            this.manualWaterTimers[zone] = setInterval(() => {
                this.manualWaterRemaining[zone] -= 1;
                if (this.manualWaterRemaining[zone] <= 0) {
                    clearInterval(this.manualWaterTimers[zone]);
                    delete this.manualWaterTimers[zone];
                    delete this.manualWaterRemaining[zone];
                    if (zone === this.currentZone) {
                        const status = document.getElementById('manualWaterStatus');
                        if (status) status.textContent = 'Watering complete';
                    }
                    if (logId) this.completeWateringLog(logId);
                    return;
                }
                render();
            }, 1000);
        }

        resumeActiveWateringTimers() {
            this.logs
                .filter((log) => log.status === 'watering' && this.getSecondsUntil(log.endsAt) > 0)
                .forEach((log) => {
                    if (this.manualWaterTimers[log.zone]) return;
                    this.startManualWaterCountdown(log.duration, log.id, log.zone);
                });
        }

        getActiveWateringLog(zone) {
            return this.logs.find((log) => log.zone === zone && log.status === 'watering' && this.getSecondsUntil(log.endsAt) > 0);
        }

        getActiveManualTask(zone) {
            return this.logs.find((log) => log.zone === zone && ['watering', 'paused'].includes(log.status));
        }

        getSecondsUntil(value) {
            if (!value) return 0;
            return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
        }

        completeExpiredWateringLogs() {
            const expiredLogs = this.logs.filter((log) => log.status === 'watering' && this.getSecondsUntil(log.endsAt) <= 0);
            if (!expiredLogs.length) return;

            expiredLogs.forEach((log) => {
                log.status = 'completed';
                log.completedAt = log.endsAt || new Date().toISOString();
                this.closeZoneValves(log.zone);
                this.manualWaterCompletedAt[log.zone] = Date.now();
                this.syncLogToFirebase(log);
            });
            this.saveValves();
            this.saveLogs();
        }

        closeZoneValves(zone) {
            const zoneValves = this.valves[zone] || [];
            zoneValves.forEach((valve) => {
                valve.status = 'closed';
                valve.lastClosedAt = new Date().toISOString();
            });
        }

        openZoneValves(zone) {
            const zoneValves = this.valves[zone] || [];
            zoneValves.forEach((valve) => {
                valve.status = 'open';
                valve.lastOpenedAt = new Date().toISOString();
            });
        }

        completeWateringLog(logId) {
            const log = this.logs.find((item) => item.id === logId);
            if (!log) return;

            log.status = 'completed';
            log.completedAt = new Date().toISOString();
            this.closeZoneValves(log.zone);
            this.manualWaterCompletedAt[log.zone] = Date.now();
            this.saveValves();
            this.saveLogs();
            this.render();
            this.syncLogToFirebase(log);
        }

        pauseWateringLog(logId) {
            const log = this.logs.find((item) => item.id === logId);
            if (!log) return;

            if (this.manualWaterTimers[log.zone]) {
                clearInterval(this.manualWaterTimers[log.zone]);
                delete this.manualWaterTimers[log.zone];
            }

            const remaining = this.manualWaterRemaining[log.zone] || this.getSecondsUntil(log.endsAt);
            delete this.manualWaterRemaining[log.zone];
            log.status = 'paused';
            log.remainingSeconds = remaining;
            log.pausedAt = new Date().toISOString();
            this.closeZoneValves(log.zone);
            this.saveValves();
            this.saveLogs();
            this.render();
            this.syncLogToFirebase(log);
        }

        resumeWateringLog(logId) {
            const log = this.logs.find((item) => item.id === logId);
            if (!log) return;

            const remaining = Number(log.remainingSeconds || 0);
            if (remaining <= 0) {
                this.completeWateringLog(logId);
                return;
            }

            log.status = 'watering';
            log.resumedAt = new Date().toISOString();
            log.endsAt = new Date(Date.now() + remaining * 1000).toISOString();
            delete log.remainingSeconds;
            this.openZoneValves(log.zone);
            this.saveValves();
            this.saveLogs();
            this.startManualWaterCountdown(log.duration, log.id, log.zone);
            this.render();
            this.syncLogToFirebase(log);
        }

        cancelWateringLog(logId) {
            const log = this.logs.find((item) => item.id === logId);
            if (!log) return;

            if (this.manualWaterTimers[log.zone]) {
                clearInterval(this.manualWaterTimers[log.zone]);
                delete this.manualWaterTimers[log.zone];
            }

            delete this.manualWaterRemaining[log.zone];
            log.status = 'cancelled';
            log.cancelledAt = new Date().toISOString();
            log.completedAt = log.cancelledAt;
            this.closeZoneValves(log.zone);
            this.manualWaterCompletedAt[log.zone] = Date.now();
            this.saveValves();
            this.saveLogs();
            this.render();
            this.syncLogToFirebase(log);
        }

        formatCountdown(secondsLeft) {
            const minutes = Math.floor(secondsLeft / 60);
            const seconds = secondsLeft % 60;
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        }

        scheduleMeta(schedule) {
            const repeat = schedule.repeatEveryDays
                ? `Repeats every ${schedule.repeatEveryDays} day${schedule.repeatEveryDays === 1 ? '' : 's'}`
                : 'One-time schedule';
            const water = schedule.waterAmountLiters || this.calculateWaterAmount(schedule.duration, schedule.zone);
            return `${repeat} - ${water} L`;
        }

        toInputDateTime(date) {
            const pad = (value) => String(value).padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }

        formatDateTime(value) {
            if (!value) return 'No time';
            return new Date(value).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        }

        waitForFirebase(retry = 0) {
            const dashboard = window.firebaseDashboard;
            if (dashboard?.currentUser && dashboard?.idToken) {
                this.loadFirebaseWateringData();
                return;
            }
            if (retry < 20) setTimeout(() => this.waitForFirebase(retry + 1), 500);
        }

        getFirebaseAuth() {
            const dashboard = window.firebaseDashboard;
            if (!dashboard?.currentUser || !dashboard?.idToken) return null;
            return { uid: dashboard.currentUser.uid, token: dashboard.idToken };
        }

        async loadFirebaseWateringData() {
            const auth = this.getFirebaseAuth();
            if (!auth) return;

            try {
                const [scheduleResponse, logResponse, farmInfoResponse] = await Promise.all([
                    fetch(`${DB_URL}/users/${auth.uid}/watering_schedules.json?auth=${auth.token}`),
                    fetch(`${DB_URL}/users/${auth.uid}/watering_logs.json?auth=${auth.token}`),
                    fetch(`${DB_URL}/users/${auth.uid}/farm_info/zones.json?auth=${auth.token}`)
                ]);

                this.schedules = this.mergeById(this.schedules, await scheduleResponse.json());
                this.logs = this.mergeById(this.logs, await logResponse.json());
                const firebaseInfo = await farmInfoResponse.json();
                if (firebaseInfo) this.farmInfo = { ...this.farmInfo, ...firebaseInfo };

                this.saveSchedules();
                this.saveLogs();
                this.saveFarmInfo();
                this.render();
            } catch (error) {
                console.warn('Could not load Firebase watering data', error);
            }
        }

        mergeById(localItems, firebaseObject) {
            const map = new Map(localItems.map((item) => [item.id, item]));
            Object.values(firebaseObject || {}).forEach((item) => {
                if (item?.id) map.set(item.id, item);
            });
            return [...map.values()].sort((a, b) => new Date(b.createdAt || b.datetime) - new Date(a.createdAt || a.datetime));
        }

        async syncScheduleToFirebase(schedule) {
            const auth = this.getFirebaseAuth();
            if (!auth) return;

            try {
                await fetch(`${DB_URL}/users/${auth.uid}/watering_schedules/${schedule.id}.json?auth=${auth.token}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(schedule)
                });
            } catch (error) {
                console.warn('Could not sync watering schedule', error);
            }
        }

        async deleteScheduleFromFirebase(scheduleId) {
            const auth = this.getFirebaseAuth();
            if (!auth) return;

            try {
                await fetch(`${DB_URL}/users/${auth.uid}/watering_schedules/${scheduleId}.json?auth=${auth.token}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                console.warn('Could not delete watering schedule', error);
            }
        }

        async syncLogToFirebase(log) {
            const auth = this.getFirebaseAuth();
            if (!auth) return;

            try {
                await fetch(`${DB_URL}/users/${auth.uid}/watering_logs/${log.id}.json?auth=${auth.token}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(log)
                });
            } catch (error) {
                console.warn('Could not sync watering log', error);
            }
        }

        async syncFarmInfoToFirebase(zone) {
            const auth = this.getFirebaseAuth();
            if (!auth || !this.farmInfo[zone]) return;

            try {
                await fetch(`${DB_URL}/users/${auth.uid}/farm_info/zones/${zone}.json?auth=${auth.token}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.farmInfo[zone])
                });
            } catch (error) {
                console.warn('Could not sync farm info', error);
            }
        }

        async clearLogsFromFirebase(scope = 'all') {
            const auth = this.getFirebaseAuth();
            if (!auth) return;

            try {
                if (scope === 'all') {
                    await fetch(`${DB_URL}/users/${auth.uid}/watering_logs.json?auth=${auth.token}`, { method: 'DELETE' });
                    return;
                }

                const response = await fetch(`${DB_URL}/users/${auth.uid}/watering_logs.json?auth=${auth.token}`);
                const firebaseLogs = await response.json();
                const deletes = Object.entries(firebaseLogs || {})
                    .filter(([, log]) => log?.zone === this.currentZone)
                    .map(([id]) => fetch(`${DB_URL}/users/${auth.uid}/watering_logs/${id}.json?auth=${auth.token}`, { method: 'DELETE' }));
                await Promise.all(deletes);
            } catch (error) {
                console.warn('Could not clear watering logs', error);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.virtualValveManager = new VirtualValveManager();
    });
})();
