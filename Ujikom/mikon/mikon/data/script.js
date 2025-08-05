// Inisialisasi grafik gauge menggunakan Chart.js
const tempGauge = new Chart(document.getElementById('temp-gauge'), {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [0, 50], // Nilai awal, max 50 untuk suhu
            backgroundColor: ['#f39c12', '#eeeeee'],
            borderWidth: 0
        }]
    },
    options: {
        rotation: 1 * Math.PI,
        circumference: 1 * Math.PI,
        cutout: '80%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        }
    }
});

const humGauge = new Chart(document.getElementById('hum-gauge'), {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [0, 100], // Nilai awal, max 100
            backgroundColor: ['#3498db', '#eeeeee'],
            borderWidth: 0
        }]
    },
    options: {
        rotation: 1 * Math.PI,
        circumference: 1 * Math.PI,
        cutout: '80%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        }
    }
});

const soilGauge = new Chart(document.getElementById('soil-gauge'), {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [0, 100], // Nilai awal, max 100
            backgroundColor: ['#27ae60', '#eeeeee'],
            borderWidth: 0
        }]
    },
    options: {
        rotation: 1 * Math.PI,
        circumference: 1 * Math.PI,
        cutout: '80%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        }
    }
});

// Fungsi untuk memperbarui data pada gauge
function updateGauge(gauge, value, maxValue) {
    gauge.data.datasets[0].data[0] = value;
    gauge.data.datasets[0].data[1] = maxValue - value;
    gauge.update();
}

// Variabel untuk menyimpan status kontrol relay
let relay1State = false;
let relay2State = false;

// Fungsi untuk mengambil data sensor dari server (ESP32)
function fetchSensorData() {
    fetch('/data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Perbarui nilai dan tampilan gauge
            updateGauge(tempGauge, data.temperature, 50);
            updateGauge(humGauge, data.humidity, 100);
            updateGauge(soilGauge, data.soil, 100);

            document.getElementById('temp-value').textContent = data.temperature.toFixed(1) + '°C';
            document.getElementById('hum-value').textContent = data.humidity.toFixed(1) + '%';
            document.getElementById('soil-value').textContent = data.soil + '%';

            // Sinkronisasi status tombol relay dengan data dari server
            if (relay1State !== data.relay1) {
                relay1State = data.relay1;
                document.getElementById('relay1').checked = relay1State;
            }

            if (relay2State !== data.relay2) {
                relay2State = data.relay2;
                document.getElementById('relay2').checked = relay2State;
            }

            // Perbarui teks status (ON/OFF) dan tampilan kartu kontrol
            const relay1Status = document.getElementById('relay1-status');
            relay1Status.textContent = relay1State ? "ON" : "OFF";
            relay1Status.className = relay1State ? "status on" : "status off";
            document.getElementById('relay1-control').classList.toggle('active', relay1State);

            const relay2Status = document.getElementById('relay2-status');
            relay2Status.textContent = relay2State ? "ON" : "OFF";
            relay2Status.className = relay2State ? "status on" : "status off";
            document.getElementById('relay2-control').classList.toggle('active', relay2State);

            // Perbarui status koneksi menjadi "Terhubung"
            document.getElementById('connection-dot').classList.add("connected");
            document.getElementById('connection-status').textContent = "Terhubung";

            // Perbarui waktu terakhir update
            const now = new Date();
            document.getElementById('last-update').innerHTML =
                `<i class="fas fa-sync-alt"></i> Terakhir Diperbarui: ${now.toLocaleTimeString('id-ID')}`;
        })
        .catch(error => {
            console.error('Gagal mengambil data:', error);
            // Ubah status koneksi menjadi "Terputus" jika terjadi error
            document.getElementById('connection-dot').classList.remove("connected");
            document.getElementById('connection-status').textContent = "Koneksi Terputus";
        });
}

// Fungsi untuk mengirim perintah kontrol relay ke server
function controlRelay(relayNum, state) {
    fetch(`/update?relay=${relayNum}&state=${state ? 1 : 0}`)
        .then(response => response.text())
        .then(data => {
            console.log(`Relay ${relayNum} diatur ke ${state}: ${data}`);
            // Panggil fetchSensorData lagi untuk sinkronisasi cepat
            fetchSensorData();
        })
        .catch(error => {
            console.error(`Gagal mengontrol relay ${relayNum}:`, error);
        });
}

// Event listener untuk setiap tombol relay
document.getElementById('relay1').addEventListener('change', function () {
    relay1State = this.checked;
    controlRelay(1, relay1State);
});

document.getElementById('relay2').addEventListener('change', function () {
    relay2State = this.checked;
    controlRelay(2, relay2State);
});

// Memanggil fungsi fetchSensorData secara berkala (setiap 3 detik)
setInterval(fetchSensorData, 3000);

// Memanggil fetchSensorData saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', fetchSensorData);