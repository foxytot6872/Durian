const HISTORY_KEY = 'durianVirtualSensorHistoryV1';
const LAST_SNAPSHOT_KEY = 'durianVirtualSensorLastSnapshotHourV1';
const TEST_SCENARIO_KEY = 'durianVirtualSensorTestScenarioV1';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const HISTORY_DAYS = 30;
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
const TEST_SCENARIOS = {
    heat: {
        label: 'Extreme heat',
        weather: 'Extreme heat test',
        moistureOffset: -24,
        temperatureOffset: 7.5,
        humidity: 48,
        rainfall: 0,
        ecOffset: 520
    },
    flood: {
        label: 'Flood / waterlogging',
        weather: 'Flood test',
        moistureOffset: 28,
        temperatureOffset: -1.2,
        humidity: 97,
        rainfall: 58,
        ecOffset: 860,
        nutrientOffset: -6
    },
    drought: {
        label: 'Drought',
        weather: 'Drought test',
        moistureOffset: -34,
        temperatureOffset: 4.5,
        humidity: 42,
        rainfall: 0,
        ecOffset: 680,
        nutrientOffset: -4
    },
    nutrient: {
        label: 'Nutrient collapse',
        weather: 'Nutrient stress test',
        moistureOffset: -8,
        temperatureOffset: 1.8,
        humidity: 72,
        rainfall: 0,
        ecOffset: 250,
        nutrientOffset: -15,
        phOffset: -0.7
    },
    storm: {
        label: 'Storm damage',
        weather: 'Storm test',
        moistureOffset: 18,
        temperatureOffset: -2.5,
        humidity: 96,
        rainfall: 74,
        ecOffset: 980,
        nutrientOffset: -9,
        phOffset: -0.3
    }
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function round(value, digits = 0) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function hash(seed) {
    const x = Math.sin(seed * 999) * 10000;
    return x - Math.floor(x);
}

function startOfHour(timestamp = Date.now()) {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date.getTime();
}

function formatDay(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric'
    });
}

class VirtualSensorDataStore {
    constructor() {
        this.zones = ZONES;
        this.history = this.loadHistory();
        this.ensureSeedHistory();
        this.ensureHourlySnapshot();
        this.startHourlyStorage();
        window.VirtualSensorData = this;
        window.setExtremeWeatherTest = (scenario) => this.setTestScenario(scenario);
        window.clearExtremeWeatherTest = () => this.clearTestScenario();
    }

    loadHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch (error) {
            console.warn('Could not load virtual sensor history:', error);
            return [];
        }
    }

    saveHistory() {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    }

    ensureSeedHistory() {
        const newestAllowed = startOfHour();
        const oldestNeeded = newestAllowed - (HISTORY_DAYS * DAY) + HOUR;
        const hasEnoughSeed = this.history.some(record => record.timestamp <= oldestNeeded)
            && this.history.some(record => record.timestamp >= newestAllowed)
            && this.history.length >= HISTORY_DAYS * 24 * this.zones.length;

        if (hasEnoughSeed) {
            this.trimHistory();
            return;
        }

        const seeded = [];
        for (let timestamp = oldestNeeded; timestamp <= newestAllowed; timestamp += HOUR) {
            this.zones.forEach((zone, index) => {
                seeded.push(this.buildRecord(timestamp, zone, index, false));
            });
        }

        this.history = seeded;
        this.saveHistory();
    }

    trimHistory() {
        const cutoff = startOfHour() - (HISTORY_DAYS * DAY) + HOUR;
        this.history = this.history.filter(record => record.timestamp >= cutoff);
        this.saveHistory();
    }

    ensureHourlySnapshot() {
        const currentHour = startOfHour();
        const lastSnapshot = Number(localStorage.getItem(LAST_SNAPSHOT_KEY) || 0);
        if (lastSnapshot >= currentHour) return;

        this.zones.forEach((zone, index) => {
            const existingIndex = this.history.findIndex(record => record.timestamp === currentHour && record.zone === zone);
            const record = this.buildRecord(currentHour, zone, index, false);
            if (existingIndex >= 0) {
                this.history[existingIndex] = record;
            } else {
                this.history.push(record);
            }
        });

        localStorage.setItem(LAST_SNAPSHOT_KEY, String(currentHour));
        this.trimHistory();
    }

    startHourlyStorage() {
        const scheduleNextSnapshot = () => {
            const delay = startOfHour(Date.now() + HOUR) - Date.now() + 1000;
            setTimeout(() => {
                this.ensureHourlySnapshot();
                window.dispatchEvent(new CustomEvent('virtual-sensors:hourly-snapshot'));
                scheduleNextSnapshot();
            }, delay);
        };

        scheduleNextSnapshot();
    }

    getCondition(timestamp) {
        const date = new Date(timestamp);
        const hour = date.getHours();
        const ageDays = Math.floor((startOfHour() - startOfHour(timestamp)) / DAY);
        const dayIndex = 13 - ageDays;
        const afternoonHeat = hour >= 12 && hour <= 16 ? 3.8 : 0;
        const nightCool = hour <= 5 ? -2.2 : 0;

        let rainfall = 0;
        let condition = 'Humid';
        if ([2, 3, 9, 10].includes(dayIndex) && hour >= 15 && hour <= 20) {
            rainfall = dayIndex === 10 ? 32 : 16;
            condition = dayIndex === 10 ? 'Heavy monsoon rain' : 'Evening thunderstorm';
        } else if ([5, 6, 7].includes(dayIndex) && hour >= 11 && hour <= 16) {
            condition = 'Hot dry spell';
        } else if ([12].includes(dayIndex) && hour >= 13 && hour <= 15) {
            condition = 'Extreme heat spike';
        } else if (hour >= 6 && hour <= 9) {
            condition = 'Muggy morning';
        }

        const seasonalWave = Math.sin((dayIndex / 14) * Math.PI * 2) * 1.2;
        const temperature = round(28.4 + seasonalWave + afternoonHeat + nightCool + hash(timestamp / HOUR) * 1.5, 1);
        const humidity = round(clamp(82 - afternoonHeat * 3 + rainfall * 0.45 + hash((timestamp / HOUR) + 4) * 8, 58, 98));

        return { dayIndex, hour, rainfall, condition, temperature, humidity };
    }

    buildRecord(timestamp, zone, zoneIndex, applyTestScenario = true) {
        const weather = this.getCondition(timestamp);
        const zoneBias = [-1.5, 1.5, -4.5, 3][zoneIndex] || 0;
        const dailyWave = Math.sin((weather.hour / 24) * Math.PI * 2);
        const drySpell = [5, 6, 7, 12].includes(weather.dayIndex) ? 10 : 0;
        const rainBoost = weather.rainfall > 0 ? weather.rainfall * 0.7 : 0;
        const noise = (hash((timestamp / HOUR) + zoneIndex * 37) - 0.5) * 4;

        let moisture = round(clamp(62 + zoneBias - drySpell + rainBoost - dailyWave * 5 + noise, 12, 96));
        let temperature = round(weather.temperature + zoneIndex * 0.4 + (moisture < 30 ? 1.8 : 0), 1);
        const phStress = weather.dayIndex >= 8 && zone === 'Zone C' ? -0.65 : 0;
        let ph = round(clamp(6.55 + phStress + (hash(timestamp / HOUR + zoneIndex) - 0.5) * 0.35, 4.8, 8.2), 1);
        let ec = round(clamp(1180 + (weather.rainfall > 20 ? 780 : 0) + (moisture < 28 ? 520 : 0) + zoneIndex * 95 + noise * 28, 640, 3150));
        let n = round(clamp(26 - (zone === 'Zone C' ? 13 : 0) - (weather.rainfall > 20 ? 5 : 0) + hash(timestamp / HOUR + 9) * 5, 4, 42));
        let p = round(clamp(14 - (zone === 'Zone C' ? 7 : 0) + hash(timestamp / HOUR + 17) * 3, 2, 26));
        let k = round(clamp(31 - (zone === 'Zone B' && weather.dayIndex > 9 ? 16 : 0) + hash(timestamp / HOUR + 23) * 6, 3, 52));
        let humidity = weather.humidity;
        let rainfall = weather.rainfall;
        let weatherLabel = weather.condition;

        const scenario = applyTestScenario ? this.getTestScenario() : null;
        if (scenario) {
            const overrides = TEST_SCENARIOS[scenario];
            moisture = round(clamp(moisture + (overrides.moistureOffset || 0), 8, 98));
            temperature = round(clamp(temperature + (overrides.temperatureOffset || 0), 12, 45), 1);
            ph = round(clamp(ph + (overrides.phOffset || 0), 4.3, 8.8), 1);
            ec = round(clamp(ec + (overrides.ecOffset || 0), 500, 3800));
            n = round(clamp(n + (overrides.nutrientOffset || 0), 1, 42));
            p = round(clamp(p + (overrides.nutrientOffset || 0), 1, 26));
            k = round(clamp(k + (overrides.nutrientOffset || 0), 1, 52));
            humidity = overrides.humidity;
            rainfall = overrides.rainfall;
            weatherLabel = overrides.weather;
        }

        const status = this.classifyStatus({ moisture, temperature, ph, ec, n, p, k });

        return {
            id: `${zone}-${timestamp}`,
            timestamp,
            zone,
            moisture,
            temperature,
            ph,
            ec,
            n,
            p,
            k,
            humidity,
            rainfall,
            weather: weatherLabel,
            status: status.level,
            score: status.score,
            notes: status.notes
        };
    }

    classifyStatus(sensorData) {
        let score = 88;
        const notes = [];

        if (sensorData.moisture < 25 || sensorData.moisture > 88) {
            score -= 38;
            notes.push(sensorData.moisture < 25 ? 'dry soil' : 'waterlogged soil');
        } else if (sensorData.moisture < 45 || sensorData.moisture > 78) {
            score -= 20;
            notes.push('moisture drift');
        } else if (sensorData.moisture < 55 || sensorData.moisture > 72) {
            score -= 8;
            notes.push('moisture watch');
        }

        if (sensorData.temperature > 37 || sensorData.temperature < 18) {
            score -= 34;
            notes.push('extreme temperature');
        } else if (sensorData.temperature > 34 || sensorData.temperature < 22) {
            score -= 18;
            notes.push('temperature stress');
        } else if (sensorData.temperature > 31 || sensorData.temperature < 24) {
            score -= 7;
            notes.push('temperature watch');
        }

        if (sensorData.ph < 5.6 || sensorData.ph > 7.8) {
            score -= 28;
            notes.push('pH out of range');
        } else if (sensorData.ph < 6.0 || sensorData.ph > 7.2) {
            score -= 15;
            notes.push('pH watch');
        } else if (sensorData.ph < 6.2 || sensorData.ph > 6.9) {
            score -= 5;
            notes.push('pH drift');
        }

        if (sensorData.ec > 2400) {
            score -= 24;
            notes.push('high salinity');
        } else if (sensorData.ec > 1800) {
            score -= 10;
            notes.push('salinity watch');
        }

        const nutrientFlags = [sensorData.n < 10, sensorData.p < 5, sensorData.k < 8].filter(Boolean).length;
        score -= nutrientFlags * 14;
        if (nutrientFlags) notes.push('nutrient deficiency');

        if (sensorData.n < 18 || sensorData.p < 9 || sensorData.k < 18) {
            score -= 6;
            notes.push('nutrient watch');
        }

        const level = score >= 78 ? 'healthy' : score >= 55 ? 'risky' : score >= 32 ? 'danger' : 'extreme';
        return { level, score: clamp(score, 0, 100), notes };
    }

    getCurrentReadings() {
        const timestamp = startOfHour();
        return this.zones.map((zone, index) => {
            const base = this.buildRecord(timestamp, zone, index);
            const liveDrift = Math.sin(Date.now() / 180000 + index) * 1.2;
            const sensorData = {
                moisture: clamp(base.moisture + liveDrift, 10, 98),
                temperature: round(base.temperature + liveDrift * 0.15, 1),
                ph: base.ph,
                ec: base.ec,
                n: base.n,
                p: base.p,
                k: base.k,
                humidity: base.humidity,
                rainfall: base.rainfall,
                weather: base.weather,
                status: base.status,
                farmStatusScore: base.score,
                testScenario: this.getTestScenario(),
                timestamp: Date.now(),
                source: 'virtual'
            };

            return {
                deviceId: `virtual_sensor_${index + 1}`,
                name: `${zone} Virtual Sensor`,
                zone,
                type: 'sensor',
                firmware_version: 'virtual-1.0.0',
                last_online: Date.now(),
                ip_address: 'virtual',
                sensorData
            };
        });
    }

    getHistory(zone = null) {
        this.ensureHourlySnapshot();
        if (this.getTestScenario()) {
            const newestAllowed = startOfHour();
            const oldestNeeded = newestAllowed - (HISTORY_DAYS * DAY) + HOUR;
            const testingHistory = [];
            for (let timestamp = oldestNeeded; timestamp <= newestAllowed; timestamp += HOUR) {
                this.zones.forEach((itemZone, index) => {
                    testingHistory.push(this.buildRecord(timestamp, itemZone, index));
                });
            }
            return testingHistory
                .filter(record => !zone || record.zone === zone)
                .sort((a, b) => a.timestamp - b.timestamp);
        }

        return this.history
            .filter(record => !zone || record.zone === zone)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    getTestScenario() {
        const scenario = localStorage.getItem(TEST_SCENARIO_KEY);
        return TEST_SCENARIOS[scenario] ? scenario : null;
    }

    setTestScenario(scenario) {
        if (!TEST_SCENARIOS[scenario]) {
            console.warn(`Unknown extreme weather test: ${scenario}. Try: ${Object.keys(TEST_SCENARIOS).join(', ')}`);
            return false;
        }

        localStorage.setItem(TEST_SCENARIO_KEY, scenario);
        console.info(`Extreme weather test enabled: ${TEST_SCENARIOS[scenario].label}`);
        window.dispatchEvent(new CustomEvent('virtual-sensors:test-scenario-change', { detail: { scenario } }));
        return true;
    }

    clearTestScenario() {
        localStorage.removeItem(TEST_SCENARIO_KEY);
        console.info('Extreme weather test disabled.');
        window.dispatchEvent(new CustomEvent('virtual-sensors:test-scenario-change', { detail: { scenario: null } }));
    }

    getHourlyTrend(dayOffset = 0, zone = null) {
        const targetDay = new Date(Date.now() - dayOffset * DAY);
        targetDay.setHours(0, 0, 0, 0);
        const start = targetDay.getTime();
        const end = start + DAY;
        return this.getHistory(zone).filter(record => record.timestamp >= start && record.timestamp < end);
    }

    getDailyTrend(zone = null) {
        const grouped = new Map();
        this.getHistory(zone).forEach(record => {
            const day = new Date(record.timestamp);
            day.setHours(0, 0, 0, 0);
            const key = day.getTime();
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(record);
        });

        return Array.from(grouped.entries())
            .map(([timestamp, records]) => this.summarizeRecords(timestamp, records, formatDay(Number(timestamp))))
            .slice(-14);
    }

    getMonthlyTrend(zone = null) {
        const grouped = new Map();
        this.getHistory(zone).forEach(record => {
            const day = new Date(record.timestamp);
            day.setHours(0, 0, 0, 0);
            const key = day.getTime();
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(record);
        });

        return Array.from(grouped.entries())
            .map(([timestamp, records]) => this.summarizeRecords(timestamp, records, formatDay(Number(timestamp))))
            .slice(-30);
    }

    getYearlyTrend(zone = null) {
        const year = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const grouped = new Map();

        this.getHistory(zone).forEach(record => {
            const date = new Date(record.timestamp);
            if (date.getFullYear() !== year) return;

            const monthIndex = date.getMonth();
            if (!grouped.has(monthIndex)) grouped.set(monthIndex, []);
            grouped.get(monthIndex).push(record);
        });

        return Array.from({ length: 12 }, (_, monthIndex) => {
            const monthDate = new Date(year, monthIndex, 1);
            const label = monthDate.toLocaleDateString('en-GB', { month: 'short' });
            const records = grouped.get(monthIndex) || [];

            if (records.length === 0) {
                if (monthIndex >= 2 && monthIndex <= currentMonth) {
                    return this.buildMonthlySummary(monthDate.getTime(), label, monthIndex, zone);
                }

                return {
                    timestamp: monthDate.getTime(),
                    label,
                    moisture: null,
                    temperature: null,
                    ph: null,
                    ec: null,
                    score: null,
                    status: 'no-data'
                };
            }

            return this.summarizeRecords(monthDate.getTime(), records, label);
        });
    }

    buildMonthlySummary(timestamp, label, monthIndex, zone = null) {
        const zoneIndex = Math.max(0, this.zones.indexOf(zone));
        const zoneBias = [-2, 1, -5, 3][zoneIndex] || 0;
        const monthlyProfiles = [
            null,
            null,
            { moisture: 43, temperature: 35.8, ph: 6.3, ec: 1580, n: 22, p: 12, k: 28 },
            { moisture: 34, temperature: 38.2, ph: 6.1, ec: 1820, n: 18, p: 10, k: 24 },
            { moisture: 68, temperature: 31.6, ph: 6.5, ec: 1420, n: 24, p: 13, k: 30 },
            { moisture: 76, temperature: 30.4, ph: 6.6, ec: 1760, n: 21, p: 12, k: 27 },
            { moisture: 81, temperature: 29.8, ph: 6.4, ec: 2100, n: 17, p: 10, k: 25 },
            { moisture: 84, temperature: 29.5, ph: 6.2, ec: 2350, n: 15, p: 9, k: 23 },
            { moisture: 78, temperature: 30.1, ph: 6.3, ec: 1960, n: 18, p: 11, k: 26 },
            { moisture: 70, temperature: 30.8, ph: 6.5, ec: 1650, n: 23, p: 13, k: 31 },
            { moisture: 58, temperature: 31.2, ph: 6.7, ec: 1380, n: 26, p: 14, k: 34 },
            { moisture: 51, temperature: 30.6, ph: 6.6, ec: 1280, n: 25, p: 13, k: 32 }
        ];
        const profile = monthlyProfiles[monthIndex];
        const sensorData = {
            moisture: clamp(profile.moisture + zoneBias, 10, 96),
            temperature: round(profile.temperature + zoneIndex * 0.3, 1),
            ph: round(profile.ph + (zone === 'Zone C' ? -0.25 : 0), 1),
            ec: round(profile.ec + zoneIndex * 90),
            n: round(profile.n - (zone === 'Zone C' ? 5 : 0)),
            p: round(profile.p - (zone === 'Zone C' ? 3 : 0)),
            k: round(profile.k - (zone === 'Zone B' ? 6 : 0))
        };
        const status = this.classifyStatus(sensorData);

        return {
            timestamp,
            label,
            ...sensorData,
            score: round(status.score),
            status: status.level
        };
    }

    summarizeRecords(timestamp, records, label) {
        const average = (key) => records.reduce((sum, record) => sum + Number(record[key] || 0), 0) / Math.max(records.length, 1);
        const avgScore = average('score');
        const worst = records.reduce((currentWorst, record) => {
            const ranks = { healthy: 1, risky: 2, danger: 3, extreme: 4 };
            return ranks[record.status] > ranks[currentWorst.status] ? record : currentWorst;
        }, records[0] || { status: 'healthy', score: 100 });

        return {
            timestamp: Number(timestamp),
            label,
            moisture: round(average('moisture')),
            temperature: round(average('temperature'), 1),
            ph: round(average('ph'), 1),
            ec: round(average('ec')),
            score: round(avgScore),
            status: worst.status
        };
    }

    getFarmStatus(zone = null) {
        const recentCutoff = Date.now() - 24 * HOUR;
        const recent = this.getHistory(zone).filter(record => record.timestamp >= recentCutoff);
        const summary = this.summarizeRecords(Date.now(), recent, 'Overall Farm');
        const text = {
            healthy: 'Healthy',
            risky: 'Risky',
            danger: 'Danger',
            extreme: 'Extreme'
        }[summary.status];

        return {
            ...summary,
            text,
            description: this.getStatusDescription(summary.status)
        };
    }

    getStatusDescription(status) {
        const descriptions = {
            healthy: 'Soil moisture, pH, EC, and nutrients are mostly inside the durian comfort range.',
            risky: 'Some readings are drifting. Monitor irrigation and nutrition before the next heat or rain event.',
            danger: 'Multiple readings need attention. Prioritize irrigation balance and soil correction.',
            extreme: 'Extreme heat, water stress, or chemistry imbalance is active. Immediate farm action is recommended.'
        };
        return descriptions[status] || descriptions.risky;
    }

    getAlerts(limit = 4) {
        const current = this.getCurrentReadings();
        return current
            .filter(device => ['risky', 'danger', 'extreme'].includes(device.sensorData.status))
            .sort((a, b) => a.sensorData.farmStatusScore - b.sensorData.farmStatusScore)
            .slice(0, limit)
            .map(device => ({
                type: 'Soil Trend',
                description: `${device.zone} is ${device.sensorData.status} during ${device.sensorData.weather.toLowerCase()}`,
                priority: device.sensorData.status === 'risky' ? 'Medium' : 'High',
                time: 'Virtual live',
                status: 'Monitoring'
            }));
    }
}

const virtualSensorData = new VirtualSensorDataStore();

export { virtualSensorData };
