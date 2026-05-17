(function() {
    const REMINDER_KEY_PREFIX = 'history_rec_';

    function waitForDependencies() {
        return new Promise(resolve => {
            const check = () => {
                if (window.VirtualSensorData && window._reminderHelpers) {
                    resolve();
                    return;
                }
                setTimeout(check, 300);
            };
            check();
        });
    }

    function average(records, key) {
        const values = records
            .map(record => Number(record[key]))
            .filter(value => Number.isFinite(value));

        if (!values.length) return null;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    function trend(records, key) {
        if (records.length < 6) return 0;
        const midpoint = Math.floor(records.length / 2);
        const first = average(records.slice(0, midpoint), key);
        const second = average(records.slice(midpoint), key);
        if (first === null || second === null) return 0;
        return second - first;
    }

    function getDueDate(timeframe) {
        const date = new Date();
        if (timeframe === 'today') {
            date.setHours(17, 0, 0, 0);
            if (date.getTime() <= Date.now()) {
                date.setTime(Date.now() + 60 * 60 * 1000);
            }
        } else if (timeframe === 'tomorrow') {
            date.setDate(date.getDate() + 1);
            date.setHours(9, 0, 0, 0);
        } else if (timeframe === 'week') {
            date.setDate(date.getDate() + 3);
            date.setHours(8, 0, 0, 0);
        } else {
            date.setDate(date.getDate() + 14);
            date.setHours(8, 0, 0, 0);
        }
        return date.toISOString();
    }

    function priorityRank(priority) {
        return { high: 3, medium: 2, low: 1 }[priority] || 0;
    }

    function buildRecommendation({ id, title, reason, action, priority, timeframe, icon }) {
        return {
            id: `${REMINDER_KEY_PREFIX}${id}`,
            title,
            reason,
            action,
            priority,
            timeframe,
            icon,
            datetime: getDueDate(timeframe),
            notes: `${reason} Recommended action: ${action}`
        };
    }

    function getZoneHistory(zone) {
        const store = window.VirtualSensorData;
        const history = store.getHistory(zone);
        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        return history.filter(record => record.timestamp >= cutoff);
    }

    function generateHistoryRecommendations() {
        const store = window.VirtualSensorData;
        const zones = store.zones || ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
        const recommendations = [];
        const apiWeather = window.DurianWeatherData?.summary || null;

        zones.forEach(zone => {
            const records = getZoneHistory(zone);
            if (!records.length) return;

            const avgMoisture = average(records, 'moisture');
            const avgTemp = average(records, 'temperature');
            const avgPh = average(records, 'ph');
            const avgEc = average(records, 'ec');
            const avgN = average(records, 'n');
            const avgP = average(records, 'p');
            const avgK = average(records, 'k');
            const moistureTrend = trend(records, 'moisture');
            const nutrientTrend = [trend(records, 'n'), trend(records, 'p'), trend(records, 'k')].reduce((sum, value) => sum + value, 0);

            const lowNutrients = [];
            if (avgN !== null && avgN < 18) lowNutrients.push(`N ${Math.round(avgN)}`);
            if (avgP !== null && avgP < 9) lowNutrients.push(`P ${Math.round(avgP)}`);
            if (avgK !== null && avgK < 18) lowNutrients.push(`K ${Math.round(avgK)}`);

            if (lowNutrients.length || nutrientTrend < -6) {
                recommendations.push(buildRecommendation({
                    id: `${zone}_fertilizer`,
                    title: `Apply fertilizer in ${zone}`,
                    reason: lowNutrients.length
                        ? `${zone} has low fertilizer indicators over the last 14 days: ${lowNutrients.join(', ')}.`
                        : `${zone} nutrient trend is dropping over the last 14 days.`,
                    action: 'Apply balanced durian fertilizer, then re-check NPK after watering stabilizes.',
                    priority: lowNutrients.length >= 2 ? 'high' : 'medium',
                    timeframe: 'week',
                    icon: 'seedling'
                }));
            }

            if (avgMoisture !== null && (avgMoisture < 45 || moistureTrend < -8)) {
                recommendations.push(buildRecommendation({
                    id: `${zone}_irrigation`,
                    title: `Schedule deep watering in ${zone}`,
                    reason: `${zone} moisture average is ${Math.round(avgMoisture)}% and the recent trend is ${moistureTrend < 0 ? 'falling' : 'low'}.`,
                    action: 'Run a longer evening irrigation cycle and inspect soil 15-20 cm deep.',
                    priority: avgMoisture < 35 ? 'high' : 'medium',
                    timeframe: 'today',
                    icon: 'tint'
                }));
            }

            if (avgMoisture !== null && avgMoisture > 78) {
                recommendations.push(buildRecommendation({
                    id: `${zone}_drainage`,
                    title: `Check drainage in ${zone}`,
                    reason: `${zone} has high soil moisture over the recent history (${Math.round(avgMoisture)}%).`,
                    action: 'Pause irrigation, inspect drainage paths, and check for standing water near roots.',
                    priority: 'high',
                    timeframe: 'today',
                    icon: 'cloud-rain'
                }));
            }

            if (avgPh !== null && avgPh < 6.0) {
                recommendations.push(buildRecommendation({
                    id: `${zone}_lime`,
                    title: `Correct acidic soil in ${zone}`,
                    reason: `${zone} pH average is ${avgPh.toFixed(1)}, below the durian comfort range.`,
                    action: 'Apply agricultural lime or dolomite lightly and schedule a retest in 30 days.',
                    priority: 'medium',
                    timeframe: 'week',
                    icon: 'flask'
                }));
            }

            if (avgEc !== null && avgEc > 1900) {
                recommendations.push(buildRecommendation({
                    id: `${zone}_salinity`,
                    title: `Reduce salinity risk in ${zone}`,
                    reason: `${zone} EC average is ${Math.round(avgEc)} uS/cm, showing salinity pressure.`,
                    action: 'Avoid heavy fertilizer this week and flush soil gradually if drainage is good.',
                    priority: avgEc > 2400 ? 'high' : 'medium',
                    timeframe: 'tomorrow',
                    icon: 'bolt'
                }));
            }

            if (avgTemp !== null && avgTemp > 34) {
                recommendations.push(buildRecommendation({
                    id: `${zone}_heat`,
                    title: `Prepare soil heat protection in ${zone}`,
                    reason: `${zone} soil temperature average is ${avgTemp.toFixed(1)}C over recent readings.`,
                    action: 'Add mulch, water during cooler hours, and inspect young trees for wilting.',
                    priority: 'medium',
                    timeframe: 'today',
                    icon: 'thermometer-half'
                }));
            }
        });

        if (apiWeather) {
            if (apiWeather.rainChance >= 65) {
                recommendations.push(buildRecommendation({
                    id: 'api_weather_rain_irrigation',
                    title: 'Review irrigation before rain',
                    reason: `OpenWeather shows a ${Math.round(apiWeather.rainChance)}% rain chance near the farm.`,
                    action: 'Check today\'s watering schedule and reduce or skip irrigation if soil moisture is already healthy.',
                    priority: apiWeather.rainChance >= 85 ? 'high' : 'medium',
                    timeframe: 'today',
                    icon: 'cloud-rain'
                }));
            }

            if (apiWeather.temperature >= 34) {
                recommendations.push(buildRecommendation({
                    id: 'api_weather_heat_protection',
                    title: 'Prepare heat protection',
                    reason: `OpenWeather current temperature is ${Math.round(apiWeather.temperature)}C.`,
                    action: 'Water during cooler hours, refresh mulch, and inspect young trees for heat stress.',
                    priority: apiWeather.temperature >= 37 ? 'high' : 'medium',
                    timeframe: 'today',
                    icon: 'temperature-high'
                }));
            }

            if (apiWeather.windKmh >= 28) {
                recommendations.push(buildRecommendation({
                    id: 'api_weather_wind_check',
                    title: 'Check wind protection',
                    reason: `OpenWeather wind speed is about ${Math.round(apiWeather.windKmh)} km/h.`,
                    action: 'Secure young trees, supports, and loose irrigation lines before stronger gusts arrive.',
                    priority: apiWeather.windKmh >= 40 ? 'high' : 'medium',
                    timeframe: 'today',
                    icon: 'wind'
                }));
            }

            if (apiWeather.humidity >= 88) {
                recommendations.push(buildRecommendation({
                    id: 'api_weather_humidity_monitor',
                    title: 'Monitor disease risk',
                    reason: `OpenWeather humidity is ${Math.round(apiWeather.humidity)}%, which can raise fungal pressure.`,
                    action: 'Improve airflow around dense areas and avoid wetting leaves during evening irrigation.',
                    priority: 'medium',
                    timeframe: 'tomorrow',
                    icon: 'droplet'
                }));
            }
        }

        return recommendations
            .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
            .slice(0, 6);
    }

    function reminderExists(recommendation) {
        return window._reminderHelpers
            .loadReminders()
            .some(reminder => reminder.sourceRecommendationId === recommendation.id || reminder.id === recommendation.id);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderRecommendations() {
        const container = document.getElementById('recommendedReminderList');
        if (!container) return;

        const recommendations = generateHistoryRecommendations();
        if (!recommendations.length) {
            container.innerHTML = '<p style="margin:0; color:#64748b; background:#f8fafc; padding:0.75rem; border-radius:6px;">No urgent history-based reminders right now.</p>';
            return;
        }

        container.innerHTML = recommendations.map(recommendation => {
            const exists = reminderExists(recommendation);
            return `
                <div class="history-rec-card priority-${recommendation.priority}" data-rec-id="${escapeHtml(recommendation.id)}" style="border:1px solid #e2e8f0; border-left:4px solid ${recommendation.priority === 'high' ? '#ef4444' : recommendation.priority === 'medium' ? '#f59e0b' : '#10b981'}; background:#f8fafc; border-radius:8px; padding:0.85rem;">
                    <div style="display:flex; justify-content:space-between; gap:1rem; align-items:flex-start;">
                        <div>
                            <div style="display:flex; align-items:center; gap:0.5rem; font-weight:700; color:#0f172a;">
                                <i class="fas fa-${escapeHtml(recommendation.icon)}"></i>
                                <span>${escapeHtml(recommendation.title)}</span>
                            </div>
                            <p style="margin:0.45rem 0 0; color:#475569;">${escapeHtml(recommendation.reason)}</p>
                            <p style="margin:0.35rem 0 0; color:#64748b;">${escapeHtml(recommendation.action)}</p>
                        </div>
                        <button class="btn-primary add-history-reminder" data-rec-id="${escapeHtml(recommendation.id)}" ${exists ? 'disabled' : ''} style="padding:0.45rem 0.75rem; border-radius:6px; white-space:nowrap;">
                            ${exists ? 'Added' : 'Add to reminders'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.add-history-reminder').forEach(button => {
            button.addEventListener('click', () => {
                const recommendation = recommendations.find(item => item.id === button.dataset.recId);
                if (!recommendation || reminderExists(recommendation)) return;

                window._reminderHelpers.addReminder({
                    id: recommendation.id,
                    title: recommendation.title,
                    datetime: recommendation.datetime,
                    durationMinutes: 60,
                    notes: recommendation.notes,
                    sourceRecommendationId: recommendation.id,
                    priority: recommendation.priority
                });

                renderRecommendations();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await waitForDependencies();
        renderRecommendations();

        if (window.firebaseDashboard) {
            window.firebaseDashboard.onUpdate(renderRecommendations);
        }

        window.addEventListener('virtual-sensors:test-scenario-change', renderRecommendations);
        window.addEventListener('durian-weather-updated', renderRecommendations);
    });
})();
