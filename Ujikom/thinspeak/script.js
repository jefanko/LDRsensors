document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIGURATION ---
    const REFRESH_INTERVAL_SECONDS = 5;
    const THINGSPEAK_CHANNEL_ID = '3018516';
    const THINGSPEAK_READ_API_KEY = 'M1CY0C218EVE677G';
    const ESP32_POSSIBLE_IPS = ['192.168.1.100', '192.168.4.1', '10.0.0.100'];

    // --- DOM ELEMENTS ---
    const elements = {
        temperature: document.getElementById('temperature'),
        humidity: document.getElementById('humidity'),
        soilMoisture: document.getElementById('soilMoisture'),
        lastUpdate: document.getElementById('lastUpdate'),
        connectionStatus: document.getElementById('connectionStatus'),
        deviceIP: document.getElementById('deviceIP'),
        refreshTimer: document.getElementById('refreshTimer')
    };

    let refreshCountdown = REFRESH_INTERVAL_SECONDS;

    // --- DATA FETCHING LOGIC ---

    /**
     * Fetches data from a local ESP32 device.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async function fetchFromESP32() {
        for (const ip of ESP32_POSSIBLE_IPS) {
            try {
                const response = await fetch(`http://${ip}/data`, { signal: AbortSignal.timeout(2000) });
                if (response.ok) {
                    const data = await response.json();
                    updateSensorDisplay(data);
                    updateStatus('🟢 ESP32 Local', ip);
                    return true;
                }
            } catch (error) {
                console.log(`Failed to connect to ESP32 at ${ip}:`, error.name);
            }
        }
        return false;
    }

    /**
     * Fetches the last feed from the ThingSpeak API.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async function fetchFromThingSpeak() {
        try {
            const apiUrl = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds/last.json?api_key=${THINGSPEAK_READ_API_KEY}`;
            const response = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
            if (response.ok) {
                const data = await response.json();
                const formattedData = {
                    temperature: parseFloat(data.field1) || 0,
                    humidity: parseFloat(data.field2) || 0,
                    soil_moisture: parseInt(data.field3) || 0
                };
                updateSensorDisplay(formattedData);
                updateStatus('🟢 ThingSpeak Cloud', 'Cloud API');
                return true;
            }
        } catch (error) {
            console.log('ThingSpeak API error:', error.name);
        }
        return false;
    }

    /**
     * Main function to fetch sensor data, trying different sources.
     */
    async function fetchSensorData() {
        console.log('Fetching sensor data...');
        if (await fetchFromESP32()) return;
        if (await fetchFromThingSpeak()) return;

        console.log('All real data sources failed, using simulated data.');
        generateSimulatedData();
        updateStatus('🟡 Mode Simulasi', 'Local Fallback');
    }

    // --- UI UPDATE AND SIMULATION ---

    /**
     * Updates the sensor values on the display.
     * @param {object} data - The sensor data object.
     */
    function updateSensorDisplay(data) {
        elements.temperature.textContent = (data.temperature || 0).toFixed(1);
        elements.humidity.textContent = (data.humidity || 0).toFixed(1);
        elements.soilMoisture.textContent = data.soil_moisture || 0;
        elements.lastUpdate.textContent = new Date().toLocaleTimeString('id-ID');
    }

    /**
     * Updates the system status information panel.
     * @param {string} status - The connection status message.
     * @param {string} source - The data source identifier.
     */
    function updateStatus(status, source) {
        elements.connectionStatus.innerHTML = status;
        elements.deviceIP.textContent = source;
    }

    /**
     * Generates and displays simulated sensor data as a fallback.
     */
    function generateSimulatedData() {
        const simulatedData = {
            temperature: 25 + (Math.random() - 0.5) * 5,
            humidity: 60 + (Math.random() - 0.5) * 10,
            soil_moisture: Math.round(45 + (Math.random() - 0.5) * 15)
        };
        updateSensorDisplay(simulatedData);
    }

    // --- TIMERS AND INITIALIZATION ---

    /**
     * Handles the countdown timer for the next refresh.
     */
    function handleRefreshTimer() {
        refreshCountdown--;
        if (refreshCountdown <= 0) {
            fetchSensorData();
            refreshCountdown = REFRESH_INTERVAL_SECONDS;
        }
        elements.refreshTimer.textContent = `Refresh dalam: ${refreshCountdown}s`;
    }

    /**
     * Initializes the application.
     */
    function init() {
        fetchSensorData(); // Initial fetch
        setInterval(handleRefreshTimer, 1000); // Start the countdown timer

        // Add manual refresh listener
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                event.preventDefault();
                console.log('Manual refresh triggered.');
                fetchSensorData();
                refreshCountdown = REFRESH_INTERVAL_SECONDS;
            }
        });
    }

    init();
});