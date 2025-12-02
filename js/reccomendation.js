// recommendation.js
class RecommendationDashboard {
    constructor() {
        this.firebaseDashboard = null;
        this.init();
    }

    init() {
        this.waitForFirebase();
    }

    waitForFirebase() {
        if (window.firebaseDashboard) {
            this.firebaseDashboard = window.firebaseDashboard;
            this.setupFirebaseListener();
        } else {
            // Keep checking until the global object is available
            setTimeout(() => this.waitForFirebase(), 500);
        }
    }

    setupFirebaseListener() {
        if (this.firebaseDashboard) {
            console.log("💡 Recommendation script connected. Setting up listener.");
            // Register callback to be notified when data updates
            this.firebaseDashboard.onUpdate(() => {
                this.updateRecommendations();
            });
            // Initial update
            this.updateRecommendations();
        }
    }

    updateRecommendations() {
        if (!this.firebaseDashboard) return;

        const allDevices = this.firebaseDashboard.getDevices();
        const aggregatedData = this.aggregateData(allDevices);

        if (!aggregatedData.hasData) {
            this.setLoadingState("No sensor data available. Check device connection.");
            return;
        }

        console.log("🔄 Updating recommendations with data:", aggregatedData);

        // --- 1. Soil Moisture Recommendation ---
        this.applyMoistureRec(aggregatedData.moisture);

        // --- 2. Temperature Recommendation ---
        this.applyTemperatureRec(aggregatedData.temperature);

        // --- 3. pH Recommendation ---
        this.applyPhRec(aggregatedData.ph);

        // --- 4. Nutrient Recommendation ---
        this.applyNutrientRec(aggregatedData.n, aggregatedData.p, aggregatedData.k);

        // --- 5. Update Weather/Time (Static placeholders for now) ---
        this.updateWeatherPlaceholders();
    }

    // Helper function to aggregate data (similar to firebase-dashboard.js)
    aggregateData(allDevices) {
        let totalMoisture = 0;
        let totalTemp = 0;
        let totalPh = 0;
        let totalN = 0;
        let totalP = 0;
        let totalK = 0;
        let deviceCount = 0;

        for (const device of allDevices) {
            if (device.sensorData) {
                if (device.sensorData.moisture !== undefined) { totalMoisture += device.sensorData.moisture; }
                if (device.sensorData.temperature !== undefined) { totalTemp += device.sensorData.temperature; }
                if (device.sensorData.ph !== undefined) { totalPh += device.sensorData.ph; }
                if (device.sensorData.n !== undefined) { totalN += device.sensorData.n; }
                if (device.sensorData.p !== undefined) { totalP += device.sensorData.p; }
                if (device.sensorData.k !== undefined) { totalK += device.sensorData.k; }
                deviceCount++;
            }
        }

        return {
            hasData: deviceCount > 0,
            moisture: deviceCount > 0 ? totalMoisture / deviceCount : null,
            temperature: deviceCount > 0 ? totalTemp / deviceCount : null,
            ph: deviceCount > 0 ? totalPh / deviceCount : null,
            n: deviceCount > 0 ? totalN / deviceCount : null,
            p: deviceCount > 0 ? totalP / deviceCount : null,
            k: deviceCount > 0 ? totalK / deviceCount : null,
        };
    }

    // --- Dynamic Logic Functions ---

    applyMoistureRec(moisture) {
        const valueEl = document.getElementById('moisture-value');
        const descEl = document.getElementById('moisture-recommendation');
        if (!valueEl || !descEl || moisture === null) {
            this.setMetricError(valueEl, descEl, '--%', "No data for moisture.");
            return;
        }

        const card = valueEl.closest('.recommendation-card');
        card.classList.remove('low', 'optimal', 'high');

        valueEl.textContent = `${Math.round(moisture)}%`;

        if (moisture < 35) {
            card.classList.add('low');
            descEl.textContent = "CRITICAL: Soil is too dry. Initiate immediate deep watering (4-6 hours) to prevent stress and root damage.";
        } else if (moisture < 50) {
            card.classList.add('low');
            descEl.textContent = "LOW: Soil is drying out. Initiate a long watering cycle (2-3 hours) later this evening.";
        } else if (moisture < 70) {
            card.classList.add('optimal');
            descEl.textContent = "OPTIMAL: Soil moisture is excellent. Maintain current schedule and monitor closely. No action required today.";
        } else {
            card.classList.add('high');
            descEl.textContent = "HIGH: Soil is saturated. Halt all irrigation immediately to prevent root rot. Monitor drainage for the next 24 hours.";
        }
    }

    applyTemperatureRec(temp) {
        const valueEl = document.getElementById('temperature-value');
        const descEl = document.getElementById('temperature-recommendation');
        if (!valueEl || !descEl || temp === null) {
            this.setMetricError(valueEl, descEl, '--°C', "No data for temperature.");
            return;
        }

        const card = valueEl.closest('.recommendation-card');
        card.classList.remove('low', 'optimal', 'high');

        valueEl.textContent = `${Math.round(temp)}°C`;

        if (temp < 20) {
            card.classList.add('low');
            descEl.textContent = "LOW: Temperatures are cool. Ensure young trees have mulch coverage to conserve heat and protect shallow roots.";
        } else if (temp > 35) {
            card.classList.add('high');
            descEl.textContent = "HIGH HEAT: Temperatures are stressing the canopy. Use overhead misting or schedule irrigation during the cooler part of the day (e.g., 4 PM).";
        } else {
            card.classList.add('optimal');
            descEl.textContent = "IDEAL: Temperature is perfect for photosynthesis and fruit maturity. Maintain current routine.";
        }
    }

    applyPhRec(ph) {
        const valueEl = document.getElementById('ph-value');
        const descEl = document.getElementById('ph-recommendation');
        if (!valueEl || !descEl || ph === null) {
            this.setMetricError(valueEl, descEl, '--', "No data for pH.");
            return;
        }

        const card = valueEl.closest('.recommendation-card');
        card.classList.remove('low', 'optimal', 'high');

        valueEl.textContent = ph.toFixed(1);

        if (ph < 5.5) {
            card.classList.add('low');
            descEl.textContent = "ACIDIC: pH is too low. Apply lime or dolomite to increase pH level. Note: Wait 2 weeks before retesting.";
        } else if (ph > 7.5) {
            card.classList.add('high');
            descEl.textContent = "ALKALINE: pH is too high. Apply sulfur or organic matter like peat to lower pH and improve nutrient uptake.";
        } else {
            card.classList.add('optimal');
            descEl.textContent = "BALANCED: pH is optimal (5.5 - 7.5). All nutrients are highly available. Continue with current feeding schedule.";
        }
    }

    applyNutrientRec(n, p, k) {
        const valueEl = document.getElementById('nutrients-value');
        const descEl = document.getElementById('nutrients-recommendation');
        if (!valueEl || !descEl || n === null || p === null || k === null) {
            this.setMetricError(valueEl, descEl, '-- mg/kg', "Incomplete NPK data.");
            return;
        }

        const card = valueEl.closest('.recommendation-card');
        card.classList.remove('low', 'optimal', 'high');

        const sumNpk = Math.round(n + p + k);
        valueEl.textContent = `${sumNpk} mg/kg`;

        let recommendation = "NPK levels are generally balanced. Continue current fertilization routine.";

        const nDef = n < 10; // Placeholder thresholds
        const pDef = p < 5;
        const kDef = k < 5;

        if (nDef || pDef || kDef) {
            card.classList.add('low');

            recommendation = "DEFICIENT: Your soil is low in one or more primary nutrients. ";
            if (nDef) recommendation += `**Nitrogen (N) is low** (Current: ${Math.round(n)} mg/kg). Use a foliar spray or urea. `;
            if (pDef) recommendation += `**Phosphorus (P) is low** (Current: ${Math.round(p)} mg/kg). Apply rock phosphate. `;
            if (kDef) recommendation += `**Potassium (K) is low** (Current: ${Math.round(k)} mg/kg). Apply Muriate of Potash (MOP). `;

            recommendation += "Focus on balancing specific deficits.";
        } else {
            card.classList.add('optimal');
        }

        descEl.textContent = recommendation;
    }

    // --- Utility Functions ---

    setLoadingState(message) {
        document.getElementById('moisture-recommendation').textContent = message;
        document.getElementById('temperature-recommendation').textContent = message;
        document.getElementById('ph-recommendation').textContent = message;
        document.getElementById('nutrients-recommendation').textContent = message;
    }

    setMetricError(valueEl, descEl, defaultValue, defaultText) {
        if (valueEl) valueEl.textContent = defaultValue;
        if (descEl) descEl.textContent = defaultText;
    }

    updateWeatherPlaceholders() {
        // These values are static placeholders since Firebase Dashboard Manager
        // doesn't provide dedicated weather aggregation outside of the main chart data
        document.getElementById('current-temp').textContent = '29°C';
        document.getElementById('current-humidity').textContent = '78%';
        document.getElementById('current-wind').textContent = '10 km/h';
        document.getElementById('current-rain').textContent = '10%';
        document.getElementById('weather-update-time').textContent = 'Just now';
    }
}

// Initialize recommendation dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.recommendationDashboard = new RecommendationDashboard();
});