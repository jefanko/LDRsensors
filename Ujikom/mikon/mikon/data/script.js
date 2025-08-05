const DATA_REFRESH_INTERVAL = 5000;
const SENSOR_DATA_ENDPOINT = "/data";
const RELAY_CONTROL_ENDPOINT = "/update";

const temperatureElement = document.getElementById('temperature');
const humidityElement = document.getElementById('humidity');
const soilElement = document.getElementById('soil');
const relay1Toggle = document.getElementById('relay1');
const relay2Toggle = document.getElementById('relay2');
const relay1Status = document.getElementById('relay1-status');
const relay2Status = document.getElementById('relay2-status');
const connectionStatus = document.getElementById('connection-status');
const lastUpdateElement = document.getElementById('last-update');

function updateSensorData() {
    fetch(SENSOR_DATA_ENDPOINT)
        .then(response => response.json())
        .then(data => {
            temperatureElement.textContent = data.temperature.toFixed(1);
            humidityElement.textContent = data.humidity.toFixed(1);
            soilElement.textContent = data.soil;
            
            relay1Toggle.checked = data.relay1;
            relay2Toggle.checked = data.relay2;
            relay1Status.textContent = data.relay1 ? "ON" : "OFF";
            relay2Status.textContent = data.relay2 ? "ON" : "OFF";
            
            connectionStatus.textContent = "Terhubung";
            connectionStatus.style.color = "green";
            
            const now = new Date();
            lastUpdateElement.textContent = `Terakhir Diperbarui: ${now.toLocaleTimeString()}`;
        })
        .catch(error => {
            console.error('Error:', error);
            connectionStatus.textContent = "Koneksi Terputus";
            connectionStatus.style.color = "red";
        });
}

function controlRelay(relayNum, state) {
    fetch(`${RELAY_CONTROL_ENDPOINT}?relay=${relayNum}&state=${state ? 1 : 0}`)
        .then(response => response.text())
        .then(data => {
            console.log(`Relay ${relayNum} set to ${state}: ${data}`);
        })
        .catch(error => {
            console.error(`Error controlling relay ${relayNum}:`, error);
            if (relayNum === 1) {
                relay1Toggle.checked = !state;
                relay1Status.textContent = state ? "OFF" : "ON";
            } else {
                relay2Toggle.checked = !state;
                relay2Status.textContent = state ? "OFF" : "ON";
            }
        });
}

relay1Toggle.addEventListener('change', () => {
    const state = relay1Toggle.checked;
    relay1Status.textContent = state ? "ON" : "OFF";
    controlRelay(1, state);
});

relay2Toggle.addEventListener('change', () => {
    const state = relay2Toggle.checked;
    relay2Status.textContent = state ? "ON" : "OFF";
    controlRelay(2, state);
});

setInterval(updateSensorData, DATA_REFRESH_INTERVAL);
window.addEventListener('DOMContentLoaded', updateSensorData);