// script.js - Logic Aplikasi Utama (kecuali Auth)

// Variabel global
let currentUser = null;
let urlLimit = 2; // Batas default untuk non-login
let urlsCreated = 0;

// --- Fungsi Helper ---

/**
 * Mengambil data pengguna dari Realtime Database
 * @param {string} uid - User ID
 * @returns {Promise<object>} Data pengguna
 */
async function getUserData(uid) {
    const snapshot = await database.ref('users/' + uid).once('value');
    return snapshot.val();
}

/**
 * Menghasilkan ID pendek acak
 * @param {number} length - Panjang ID
 * @returns {string} ID pendek
 */
function generateShortId(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Menangani perubahan status autentikasi (dipanggil dari auth.js)
 * @param {firebase.User} user - Objek pengguna Firebase
 */
function handleAuthStateChange(user) {
    currentUser = user;
    const limitInfo = document.getElementById('limit-info');
    const userDashboard = document.getElementById('user-dashboard');

    if (currentUser) {
        // User login - Full akses
        urlLimit = Infinity;
        if (limitInfo) limitInfo.style.display = 'none';
        if (userDashboard) userDashboard.style.display = 'block';
        loadUserUrls(currentUser.uid);
        loadUserProfile(currentUser.uid); // Untuk halaman profil
    } else {
        // User non-login - Batas 2 URL
        urlLimit = 2;
        urlsCreated = parseInt(localStorage.getItem('nonAuthUrlsCreated') || '0');
        if (limitInfo) {
            limitInfo.textContent = `Anda belum login. Batas pembuatan URL: ${urlsCreated} dari ${urlLimit}.`;
            limitInfo.style.display = 'block';
        }
        if (userDashboard) userDashboard.style.display = 'none';
    }
}

// --- Logic URL Shortener (index.html) ---
const shortenerForm = document.getElementById('shortener-form');
if (shortenerForm) {
    shortenerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const longUrl = document.getElementById('long-url').value;
        let customAlias = document.getElementById('custom-alias').value;

        if (!currentUser && urlsCreated >= urlLimit) {
            alert('Batas pembuatan URL untuk non-login telah tercapai. Silakan login untuk akses penuh!');
            return;
        }

        let shortId = customAlias || generateShortId();

        // Cek ketersediaan ID
        const snapshot = await database.ref('urls/' + shortId).once('value');
        if (snapshot.exists()) {
            alert('Alias kustom sudah digunakan atau ID acak bentrok. Coba lagi atau gunakan alias lain.');
            return;
        }

        // Data URL
        const urlData = {
            longUrl: longUrl,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            clicks: 0,
            userId: currentUser ? currentUser.uid : 'guest',
            ipAddresses: {} // Untuk menyimpan IP address pengunjung
        };

        try {
            await database.ref('urls/' + shortId).set(urlData);

            if (!currentUser) {
                urlsCreated++;
                localStorage.setItem('nonAuthUrlsCreated', urlsCreated);
                document.getElementById('limit-info').textContent = `Anda belum login. Batas pembuatan URL: ${urlsCreated} dari ${urlLimit}.`;
            } else {
                // Update daftar URL jika user login
                loadUserUrls(currentUser.uid);
            }

            const shortUrlOutput = `${window.location.origin}/woi.html?id=${shortId}`;
            document.getElementById('short-url-output').textContent = shortUrlOutput;
            document.getElementById('result-box').style.display = 'flex';
            document.getElementById('long-url').value = '';
            document.getElementById('custom-alias').value = '';

            alert('URL berhasil diperpendek!');
        } catch (error) {
            alert('Gagal memperpendek URL: ' + error.message);
        }
    });
}

// --- Logic Copy Button ---
const copyBtn = document.getElementById('copy-btn');
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const shortUrl = document.getElementById('short-url-output').textContent;
        navigator.clipboard.writeText(shortUrl).then(() => {
            alert('URL berhasil disalin!');
        }).catch(err => {
            console.error('Gagal menyalin: ', err);
            alert('Gagal menyalin URL. Silakan salin manual.');
        });
    });
}

// --- Logic Dashboard URL (index.html - hanya untuk user login) ---
function loadUserUrls(uid) {
    const urlList = document.getElementById('url-list');
    if (!urlList) return;

    // Hapus listener sebelumnya jika ada
    database.ref('urls').off('value');

    database.ref('urls').orderByChild('userId').equalTo(uid).on('value', (snapshot) => {
        urlList.innerHTML = ''; // Bersihkan daftar
        snapshot.forEach((childSnapshot) => {
            const shortId = childSnapshot.key;
            const url = childSnapshot.val();
            const shortUrl = `${window.location.origin}/woi.html?id=${shortId}`;

            const row = urlList.insertRow();
            row.innerHTML = `
                <td><a href="${shortUrl}" target="_blank">${shortId}</a></td>
                <td>${url.longUrl}</td>
                <td>${url.clicks}</td>
                <td>
                    <button class="btn-danger action-btn" onclick="deleteUrl('${shortId}')"><i class="fas fa-trash"></i> Hapus</button>
                    <button class="btn-info action-btn" onclick="showStats('${shortId}')"><i class="fas fa-chart-bar"></i> Statistik</button>
                </td>
            `;
        });
    });
}

// Fungsi Delete URL
function deleteUrl(shortId) {
    if (confirm(`Anda yakin ingin menghapus URL pendek: ${shortId}?`)) {
        database.ref('urls/' + shortId).remove()
            .then(() => {
                alert('URL berhasil dihapus!');
            })
            .catch((error) => {
                alert('Gagal menghapus URL: ' + error.message);
            });
    }
}

// Fungsi Tampilkan Statistik (Simulasi karena tidak ada backend)
function showStats(shortId) {
    database.ref('urls/' + shortId).once('value', (snapshot) => {
        const url = snapshot.val();
        if (url) {
            let ipList = '';
            if (url.ipAddresses) {
                ipList = Object.keys(url.ipAddresses).map(ip => {
                    return `<li>${ip} (${url.ipAddresses[ip]} klik)</li>`;
                }).join('');
            } else {
                ipList = '<li>Belum ada data IP.</li>';
            }

            alert(`Statistik untuk ${shortId}:\n\nTotal Klik: ${url.clicks}\n\nIP Pengunjung:\n${ipList}`);
        } else {
            alert('Data URL tidak ditemukan.');
        }
    });
}

// --- Logic Profil (profil.html) ---
const profileForm = document.getElementById('profile-form');
const profilePicInput = document.getElementById('change-pic-input');
const profilePicImg = document.getElementById('profile-pic-img');

function loadUserProfile(uid) {
    if (window.location.pathname.includes('profil.html')) {
        getUserData(uid).then(data => {
            if (data) {
                document.getElementById('profile-name').value = data.name || '';
                document.getElementById('profile-bio').value = data.bio || '';
                if (data.profilePic && data.profilePic !== "default_base64_image") {
                    profilePicImg.src = data.profilePic;
                }
            }
        });
    }
}

if (profilePicInput) {
    profilePicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                profilePicImg.src = event.target.result;
                // Simpan Base64 ke Realtime DB saat form disubmit
            };
            reader.readAsDataURL(file);
        }
    });
}

if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Anda harus login untuk menyimpan profil.');
            return;
        }

        const newName = document.getElementById('profile-name').value;
        const newBio = document.getElementById('profile-bio').value;
        const newPicBase64 = profilePicImg.src;

        try {
            // Update display name di Firebase Auth
            await currentUser.updateProfile({ displayName: newName });

            // Update data di Realtime DB
            await database.ref('users/' + currentUser.uid).update({
                name: newName,
                bio: newBio,
                profilePic: newPicBase64
            });

            alert('Profil berhasil diperbarui!');
        } catch (error) {
            alert('Gagal memperbarui profil: ' + error.message);
        }
    });
}

// --- Logic Tema Terang/Gelap (Global) ---
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        themeToggle.className = currentTheme === 'dark' ? 'fas fa-moon theme-toggle' : 'fas fa-sun theme-toggle';
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeToggle.className = 'fas fa-sun theme-toggle';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.className = 'fas fa-moon theme-toggle';
        }
    });
}

// Panggil handleAuthStateChange saat script dimuat untuk inisialisasi UI
// Ini akan dipanggil ulang oleh auth.js setelah Firebase selesai inisialisasi
if (auth.currentUser) {
    handleAuthStateChange(auth.currentUser);
} else {
    handleAuthStateChange(null);
}
