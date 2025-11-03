// suki.js - Logic Kompleks (Redirect dan Tracking)

// Fungsi untuk mendapatkan IP Address (Simulasi karena tidak ada backend)
// Dalam implementasi nyata, ini akan dilakukan di sisi server
async function getIpAddress() {
    try {
        // Menggunakan layanan pihak ketiga untuk mendapatkan IP publik
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("Gagal mendapatkan IP Address:", error);
        return 'unknown_ip';
    }
}

// Logic untuk halaman woi.html (Redirect dan Tracking)
if (window.location.pathname.includes('woi.html')) {
    // Inisialisasi Firebase di woi.html
    const firebaseConfig = {
        apiKey: "AIzaSyDfdWsO1H11PjSY7IecaX_QICc14yLOtpQ",
        authDomain: "xbibzstorage.firebaseapp.com",
        databaseURL: "https://xbibzstorage-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "xbibzstorage",
        storageBucket: "xbibzstorage.firebasestorage.app",
        messagingSenderId: "288109423771",
        appId: "1:288109423771:web:6303592da70243b7016a3e",
        measurementId: "G-7Q0X7V3HVM"
    };
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    const urlParams = new URLSearchParams(window.location.search);
    const shortId = urlParams.get('id');

    if (shortId) {
        // 1. Ambil URL asli dari Firebase
        database.ref('urls/' + shortId).once('value', async (snapshot) => {
            const urlData = snapshot.val();

            if (urlData) {
                const longUrl = urlData.longUrl;
                const currentClicks = urlData.clicks || 0;
                const ipAddresses = urlData.ipAddresses || {};
                const userIp = await getIpAddress();

                // 2. Update data klik dan IP Address
                const updates = {};
                updates['/urls/' + shortId + '/clicks'] = currentClicks + 1;

                // Update hitungan IP
                if (ipAddresses[userIp]) {
                    updates['/urls/' + shortId + '/ipAddresses/' + userIp] = ipAddresses[userIp] + 1;
                } else {
                    updates['/urls/' + shortId + '/ipAddresses/' + userIp] = 1;
                }

                await database.ref().update(updates);

                // 3. Mulai hitungan mundur dan redirect
                const countdownElement = document.getElementById('countdown');
                let seconds = 5;

                const interval = setInterval(() => {
                    seconds--;
                    countdownElement.textContent = `Anda akan dialihkan dalam ${seconds} detik...`;
                    if (seconds <= 0) {
                        clearInterval(interval);
                        // Pastikan URL memiliki protokol (http/https)
                        const finalUrl = longUrl.startsWith('http') || longUrl.startsWith('https') ? longUrl : `http://${longUrl}`;
                        window.location.href = finalUrl;
                    }
                }, 1000);

            } else {
                document.getElementById('countdown').textContent = "URL pendek tidak valid!";
            }
        });
    } else {
        document.getElementById('countdown').textContent = "ID URL pendek tidak ditemukan!";
    }
}

// Logic Tema Terang/Gelap (untuk halaman woi.html yang tidak memuat script.js)
(function() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }
})();
