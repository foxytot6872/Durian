import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat@0.50.0/dist/chat.bundle.es.js';
import { virtualSensorData } from './virtual-sensor-data.js';

const CHAT_TARGET_ID = 'n8n-chat';
const WEBHOOK_URL = 'https://mydurian.app.n8n.cloud/webhook/9b5b2e7b-4454-48a7-b0f5-fcde9d59f68d/chat';
const HISTORY_HOURS = 24;
const WEEK_HISTORY_DAYS = 7;
const DAILY_HISTORY_DAYS = 14;
const DETAIL_INTERVAL_HOURS = 3;

function round(value, digits = 1) {
    if (!Number.isFinite(Number(value))) return null;
    const factor = 10 ** digits;
    return Math.round(Number(value) * factor) / factor;
}

function normalizeZone(zone) {
    if (!zone) return null;
    const zoneText = String(zone).trim();
    return zoneText.startsWith('Zone ') ? zoneText : `Zone ${zoneText}`;
}

function compactRecord(record) {
    if (!record) return null;
    return {
        timestamp: new Date(record.timestamp).toISOString(),
        zone: record.zone,
        moisture: round(record.moisture, 0),
        temperature: round(record.temperature, 1),
        ph: round(record.ph, 1),
        ec: round(record.ec, 0),
        n: round(record.n, 0),
        p: round(record.p, 0),
        k: round(record.k, 0),
        humidity: round(record.humidity, 0),
        rainfall: round(record.rainfall, 0),
        status: record.status || null,
        score: round(record.score ?? record.farmStatusScore, 0),
        weather: record.weather || null,
        notes: record.notes || []
    };
}

function summarizeRecords(records) {
    const average = (key, digits = 1) => {
        const values = records.map(record => Number(record[key])).filter(Number.isFinite);
        if (!values.length) return null;
        return round(values.reduce((sum, value) => sum + value, 0) / values.length, digits);
    };

    const statusRank = { healthy: 1, risky: 2, danger: 3, extreme: 4 };
    const worstRecord = records.reduce((worst, record) => {
        const currentRank = statusRank[record.status] || 0;
        const worstRank = statusRank[worst?.status] || 0;
        return currentRank > worstRank ? record : worst;
    }, null);
    const scoreAvg = average('score', 0);
    const overallStatus = scoreAvg === null
        ? null
        : scoreAvg >= 78
            ? 'healthy'
            : scoreAvg >= 55
                ? 'watch'
                : scoreAvg >= 32
                    ? 'concern'
                    : 'critical';

    return {
        count: records.length,
        moistureAvg: average('moisture', 0),
        temperatureAvg: average('temperature', 1),
        phAvg: average('ph', 1),
        ecAvg: average('ec', 0),
        nAvg: average('n', 0),
        pAvg: average('p', 0),
        kAvg: average('k', 0),
        rainfallTotal: round(records.reduce((sum, record) => sum + Number(record.rainfall || 0), 0), 0),
        scoreAvg,
        overallStatus,
        worstStatus: worstRecord?.status || null,
        lowestScore: records.length ? Math.min(...records.map(record => Number(record.score || 100))) : null
    };
}

function getDashboardReadings() {
    const dashboard = window.firebaseDashboard;
    if (!dashboard?.getDevices) return [];

    return dashboard.getDevices()
        .filter(device => device?.sensorData)
        .map(device => ({
            deviceId: device.deviceId,
            name: device.name,
            zone: normalizeZone(device.zone),
            type: device.type,
            sensorData: compactRecord({
                ...device.sensorData,
                zone: normalizeZone(device.zone),
                score: device.sensorData.farmStatusScore,
                timestamp: device.sensorData.timestamp || Date.now()
            })
        }));
}

function buildZoneHistory(zone) {
    const now = Date.now();
    const hourCutoff = now - HISTORY_HOURS * 60 * 60 * 1000;
    const history = virtualSensorData.getHistory(zone);
    const hourly = history.filter(record => record.timestamp >= hourCutoff);
    const weeklyRecords = history.slice(-(WEEK_HISTORY_DAYS * 24));
    const daily = virtualSensorData.getDailyTrend(zone)
        .slice(-DAILY_HISTORY_DAYS)
        .map(compactRecord);
    const latest = history.length ? compactRecord(history[history.length - 1]) : null;

    return {
        latest,
        last24Hours: {
            summary: summarizeRecords(hourly)
        },
        thisWeek: {
            summary: summarizeRecords(weeklyRecords),
            dailyAverages: daily.slice(-WEEK_HISTORY_DAYS)
        },
        last14Days: {
            summary: summarizeRecords(history.slice(-(DAILY_HISTORY_DAYS * 24))),
            dailyAverages: daily
        }
    };
}

function buildSelectedZoneDetails(zone) {
    const now = Date.now();
    const hourCutoff = now - HISTORY_HOURS * 60 * 60 * 1000;
    return virtualSensorData.getHistory(zone)
        .filter(record => record.timestamp >= hourCutoff)
        .filter((_, index) => index % DETAIL_INTERVAL_HOURS === 0)
        .map(compactRecord);
}

function buildSensorMetadata() {
    const zones = virtualSensorData.zones || ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
    const selectedZone = normalizeZone(localStorage.getItem('selectedZone')) || zones[0];

    return {
        generatedAt: new Date().toISOString(),
        source: 'dashboard-sensor-context',
        selectedZone,
        availableZones: zones,
        units: {
            moisture: 'percent',
            temperature: 'celsius',
            ec: 'uS/cm',
            n: 'mg/kg',
            p: 'mg/kg',
            k: 'mg/kg',
            rainfall: 'mm'
        },
        currentReadings: getDashboardReadings(),
        virtualCurrentReadings: virtualSensorData.getCurrentReadings().map(device => ({
            deviceId: device.deviceId,
            name: device.name,
            zone: device.zone,
            sensorData: compactRecord({ ...device.sensorData, zone: device.zone })
        })),
        historicalSensorData: zones.reduce((result, zone) => {
            result[zone] = buildZoneHistory(zone);
            return result;
        }, {}),
        selectedZoneRecentReadings: buildSelectedZoneDetails(selectedZone),
        farmStatus: virtualSensorData.getFarmStatus(),
        guidance: 'Use historicalSensorData for trend questions. Prefer selectedZone when the user does not name a zone.'
    };
}

function buildPromptFarmContext(metadata) {
    const selectedZone = metadata.selectedZone;
    const allZoneSummaries = Object.fromEntries(
        Object.entries(metadata.historicalSensorData || {}).map(([zone, data]) => [
            zone,
                {
                    latest: data.latest,
                    last24Hours: data.last24Hours?.summary,
                    thisWeek: data.thisWeek?.summary,
                    thisWeekDailyAverages: data.thisWeek?.dailyAverages,
                    last14Days: data.last14Days?.summary
                }
            ])
    );

    return {
        generatedAt: metadata.generatedAt,
        selectedZone,
        analysisRule: 'If the user does not name a zone, summarize the whole farm using allZoneSummaries and farmStatus. Only focus on selectedZone when the user asks about that zone or says "this zone".',
        units: metadata.units,
        farmStatus: metadata.farmStatus,
        currentReadings: metadata.currentReadings.length
            ? metadata.currentReadings
            : metadata.virtualCurrentReadings,
        selectedZoneHistory: metadata.historicalSensorData?.[selectedZone],
        selectedZoneRecentReadings: metadata.selectedZoneRecentReadings,
        allZoneSummaries
    };
}

function detectRequestedZone(message, fallbackZone) {
    const text = String(message || '').toLowerCase();
    const match = text.match(/\bzone\s*([a-d])\b/);
    if (match) return `Zone ${match[1].toUpperCase()}`;

    const compactMatch = text.match(/\bzone([a-d])\b/);
    if (compactMatch) return `Zone ${compactMatch[1].toUpperCase()}`;

    return fallbackZone;
}

function detectQuestionType(message) {
    const text = String(message || '').toLowerCase();
    if (/\b(analy[sz]e|analysis|summary|summarize|overview|trend|this week|past data|history|historical|report)\b/.test(text)) {
        return 'farm-analysis';
    }

    if (/\b(yellow|leaf|leaves|spot|spots|wilting|wilt|disease|pest|symptom|brown|curl|curling|dry|droop|drooping)\b/.test(text)) {
        return 'symptom-diagnosis';
    }

    return 'general';
}

function trimFarmContextForMessage(farmContext, message) {
    const requestedZone = detectRequestedZone(message, null);
    const questionType = detectQuestionType(message);
    if (!requestedZone || !farmContext.allZoneSummaries?.[requestedZone]) {
        return {
            generatedAt: farmContext.generatedAt,
            analysisScope: 'whole farm',
            questionType,
            analysisRule: 'The user did not name a zone. Do not assume the selected dashboard zone is the problem area. Analyze the whole farm across all zones and ask which zone if a single-zone diagnosis is needed.',
            units: farmContext.units,
            farmStatus: farmContext.farmStatus,
            currentReadings: farmContext.currentReadings,
            allZoneSummaries: farmContext.allZoneSummaries
        };
    }

    const currentReading = (farmContext.currentReadings || []).find(reading => reading.zone === requestedZone);
    return {
        generatedAt: farmContext.generatedAt,
        selectedZone: farmContext.selectedZone,
        requestedZone,
        analysisScope: requestedZone,
        questionType,
        analysisRule: `The user named ${requestedZone}. Focus on ${requestedZone}. Start with common general causes, then compare them with this zone's dashboard sensor data.`,
        units: farmContext.units,
        currentReading: currentReading || null,
        zoneSummary: farmContext.allZoneSummaries[requestedZone],
        recentReadings: requestedZone === farmContext.selectedZone ? farmContext.selectedZoneRecentReadings : []
    };
}

function formatMetric(value, unit = '') {
    if (value === null || value === undefined) return 'no data';
    return `${value}${unit}`;
}

function buildFarmContextText(farmContext) {
    const units = farmContext.units || {};
    const zoneLines = Object.entries(farmContext.allZoneSummaries || {}).map(([zone, summary]) => {
        const latest = summary.latest || {};
        const last24 = summary.last24Hours || {};
        const week = summary.thisWeek || {};
        const last14 = summary.last14Days || {};

        return [
            `${zone}:`,
            `current ${formatMetric(latest.moisture, '%')} moisture, ${formatMetric(latest.temperature, 'C')} temperature, pH ${formatMetric(latest.ph)}, EC ${formatMetric(latest.ec, ` ${units.ec || 'uS/cm'}`)}, NPK ${formatMetric(latest.n)}/${formatMetric(latest.p)}/${formatMetric(latest.k)}, status ${latest.status || 'unknown'}, score ${formatMetric(latest.score)}.`,
            `last 24h avg ${formatMetric(last24.moistureAvg, '%')} moisture, ${formatMetric(last24.temperatureAvg, 'C')} temperature, pH ${formatMetric(last24.phAvg)}, average status ${last24.overallStatus || 'unknown'}, average score ${formatMetric(last24.scoreAvg)}, worst single reading ${last24.worstStatus || 'unknown'}.`,
            `this week avg ${formatMetric(week.moistureAvg, '%')} moisture, ${formatMetric(week.temperatureAvg, 'C')} temperature, pH ${formatMetric(week.phAvg)}, NPK ${formatMetric(week.nAvg)}/${formatMetric(week.pAvg)}/${formatMetric(week.kAvg)}, average status ${week.overallStatus || 'unknown'}, average score ${formatMetric(week.scoreAvg)}, worst single reading ${week.worstStatus || 'unknown'}.`,
            `last 14d avg ${formatMetric(last14.moistureAvg, '%')} moisture, ${formatMetric(last14.temperatureAvg, 'C')} temperature, pH ${formatMetric(last14.phAvg)}, average status ${last14.overallStatus || 'unknown'}, average score ${formatMetric(last14.scoreAvg)}, worst single reading ${last14.worstStatus || 'unknown'}.`
        ].join(' ');
    });

    const answerStyle = farmContext.questionType === 'farm-analysis'
        ? 'Answer style: include sections named Overall, Today, This Week, Zone Concerns, and Next Actions. Summarize weekly historical trends from thisWeek before recommendations. Only list numbers that support the conclusion.'
        : farmContext.questionType === 'symptom-diagnosis'
            ? 'Answer style: start with common general causes for the symptom. Then say what the dashboard sensor data supports or does not support. Do not force Today/This Week sections unless the user asks for analysis or trends.'
            : 'Answer style: answer the user directly. Use dashboard data only when it helps. Do not force farm-analysis sections unless the user asks for analysis, summary, history, or trends.';

    return [
        'DASHBOARD FARM SENSOR CONTEXT - this is the only farm data source for this question.',
        'Do not use external farm analysis sources, government reports, or made-up historical datasets.',
        farmContext.analysisRule,
        `Question type: ${farmContext.questionType || 'general'}`,
        `Overall farm status: ${farmContext.farmStatus?.text || farmContext.farmStatus?.status || 'unknown'} - ${farmContext.farmStatus?.description || 'no description'}`,
        farmContext.requestedZone
            ? `Requested zone: ${farmContext.requestedZone}`
            : 'Requested zone: none. Treat this as a whole-farm question, not a selected-zone question.',
        'Zone summaries:',
        ...zoneLines,
        'Status wording: do not call the farm risky based only on a worst single reading. Use average status and current status for the main conclusion; mention worst single readings only as watch-outs.',
        answerStyle
    ].join('\n');
}

function installWebhookMetadataInjector(metadata) {
    if (window.durianChatbotFetchPatched) return;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (resource, options = {}) => {
        const url = typeof resource === 'string' ? resource : resource?.url;
        const isChatWebhook = typeof url === 'string' && url.startsWith(WEBHOOK_URL);
        const body = options?.body;

        if (!isChatWebhook || typeof body !== 'string') {
            return originalFetch(resource, options);
        }

        try {
            const payload = JSON.parse(body);
            if (payload?.action === 'sendMessage' && payload.chatInput) {
                const farmContext = buildPromptFarmContext(metadata);
                const promptContext = trimFarmContextForMessage(farmContext, payload.chatInput);
                const farmContextText = buildFarmContextText({
                    ...promptContext,
                    allZoneSummaries: promptContext.allZoneSummaries || {
                        [promptContext.requestedZone || promptContext.selectedZone]: promptContext.zoneSummary
                    }
                });
                payload.metadata = promptContext;
                payload.farmContext = promptContext;
                payload.chatInput = [
                    payload.chatInput,
                    '',
                    'Farm sensor context for this question:',
                    farmContextText,
                    '',
                    'Raw compact farm context JSON:',
                    JSON.stringify(promptContext)
                ].join('\n');
                console.info('Attached farm context to n8n chat request.');
                return originalFetch(resource, {
                    ...options,
                    body: JSON.stringify(payload)
                });
            }
        } catch (error) {
            console.warn('Could not attach farm context to n8n chat request:', error);
        }

        return originalFetch(resource, options);
    };

    window.durianChatbotFetchPatched = true;
}

function ensureChatTarget() {
    let target = document.getElementById(CHAT_TARGET_ID);
    if (!target) {
        target = document.createElement('div');
        target.id = CHAT_TARGET_ID;
        document.body.appendChild(target);
    }
    return target;
}

function initChatbot() {
    ensureChatTarget();

    try {
        const metadata = buildSensorMetadata();
        window.durianChatbotMetadata = metadata;
        console.info('Durian chatbot metadata prepared:', metadata);
        installWebhookMetadataInjector(metadata);

        createChat({
            webhookUrl: WEBHOOK_URL,

            target: `#${CHAT_TARGET_ID}`,
            mode: 'window',

            chatInputKey: 'chatInput',
            chatSessionKey: 'sessionId',
            loadPreviousSession: true,
            metadata: buildPromptFarmContext(metadata),

            showWelcomeScreen: true,

            initialMessages: [
                'Hi! I’m Durian Expert Bot 🌱',
                'Ask me about durian farming.'
            ],

            i18n: {
                en: {
                    title: 'Durian Expert',
                    subtitle: 'Your farming assistant',
                    inputPlaceholder: 'Ask something...',
                },
            },
        });
    } catch (error) {
        console.error('Failed to initialize n8n chat widget:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}
