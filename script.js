// Konfigurasi Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Variabel global
let currentUser = null;
let userUrls = [];

// Inisialisasi aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeAuthState();
    initializeEventListeners();
    
    // Jika di halaman index, muat URL
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadUserUrls();
    }
    
    // Jika di halaman profil, muat data profil
    if (window.location.pathname.endsWith('profil.html')) {
        loadProfileData();
    }
    
    // Jika di halaman woi, jalankan redirect
    if (window.location.pathname.endsWith('woi.html')) {
        initializeRedirect();
    }
});

// Inisialisasi tema
function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Periksa preferensi tema yang disimpan
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        updateThemeIcon(savedTheme);
        
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            updateThemeIcon(isDarkMode ? 'dark' : 'light');
        });
    }
}

// Perbarui ikon tema
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// Inisialisasi status autentikasi
function initializeAuthState() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        
        // Perbarui UI berdasarkan status login
        updateUIForAuthState(!!user);
        
        // Jika user login dan di halaman index, muat URL
        if (user && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
            loadUserUrls();
        }
        
        // Jika user login dan di halaman profil, muat data profil
        if (user && window.location.pathname.endsWith('profil.html')) {
            loadProfileData();
        }
    });
}

// Perbarui UI berdasarkan status autentikasi
function updateUIForAuthState(isLoggedIn) {
    const logoutLink = document.getElementById('logout-link');
    const navLinks = document.querySelector('.nav-links');
    
    if (logoutLink) {
        if (isLoggedIn) {
            logoutLink.style.display = 'block';
        } else {
            logoutLink.style.display = 'none';
        }
    }
    
    // Jika tidak login dan di halaman index, batasi pembuatan URL
    if (!isLoggedIn && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
        const urlInput = document.getElementById('url-input');
        const shortenBtn = document.getElementById('shorten-btn');
        
        if (urlInput && shortenBtn) {
            // Tambah placeholder untuk memberi tahu batasan
            urlInput.placeholder = "Login untuk membuat lebih dari 2 URL short";
            
            // Batasi pembuatan URL untuk guest
            shortenBtn.addEventListener('click', handleGuestShorten);
        }
    }
}

// Inisialisasi event listeners
function initializeEventListeners() {
    // Logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Shorten URL (untuk user yang login)
    const shortenBtn = document.getElementById('shorten-btn');
    if (shortenBtn && currentUser) {
        shortenBtn.addEventListener('click', handleShortenUrl);
    }
    
    // Simpan profil
    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleSaveProfile);
    }
    
    // Upload foto profil
    const photoInput = document.getElementById('photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoUpload);
    }
}

// Handle logout
function handleLogout(e) {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        showAlert('Terjadi kesalahan saat logout', 'danger');
    });
}

// Handle shorten URL untuk guest (terbatas 2 URL)
function handleGuestShorten() {
    const urlInput = document.getElementById('url-input');
    const url = urlInput.value.trim();
    
    if (!url) {
        showAlert('Masukkan URL yang valid', 'danger');
        return;
    }
    
    // Validasi URL
    if (!isValidUrl(url)) {
        showAlert('Masukkan URL yang valid (contoh: https://example.com)', 'danger');
        return;
    }
    
    // Cek jumlah URL yang sudah dibuat (simpan di localStorage)
    let guestUrls = JSON.parse(localStorage.getItem('guestUrls') || '[]');
    
    if (guestUrls.length >= 2) {
        showAlert('Anda hanya dapat membuat 2 URL short tanpa login. Silakan daftar atau login untuk akses penuh.', 'danger');
        return;
    }
    
    // Generate short URL
    const shortCode = generateShortCode();
    const shortUrl = `${window.location.origin}/woi.html?code=${shortCode}`;
    
    // Simpan URL guest
    const urlData = {
        original: url,
        short: shortUrl,
        shortCode: shortCode,
        createdAt: new Date().toISOString(),
        clicks: 0
    };
    
    guestUrls.push(urlData);
    localStorage.setItem('guestUrls', JSON.stringify(guestUrls));
    
    // Tampilkan URL yang dibuat
    displayGuestUrl(urlData);
    
    // Reset input
    urlInput.value = '';
    
    showAlert('URL berhasil dipersingkat!', 'success');
}

// Handle shorten URL untuk user yang login
function handleShortenUrl() {
    const urlInput = document.getElementById('url-input');
    const url = urlInput.value.trim();
    
    if (!url) {
        showAlert('Masukkan URL yang valid', 'danger');
        return;
    }
    
    // Validasi URL
    if (!isValidUrl(url)) {
        showAlert('Masukkan URL yang valid (contoh: https://example.com)', 'danger');
        return;
    }
    
    // Generate short URL
    const shortCode = generateShortCode();
    const shortUrl = `${window.location.origin}/woi.html?code=${shortCode}`;
    
    // Simpan ke Firebase
    const urlData = {
        original: url,
        short: shortUrl,
        shortCode: shortCode,
        createdAt: new Date().toISOString(),
        clicks: 0,
        userId: currentUser.uid
    };
    
    const newUrlRef = push(ref(database, 'urls'));
    set(newUrlRef, urlData)
        .then(() => {
            // Reset input
            urlInput.value = '';
            showAlert('URL berhasil dipersingkat!', 'success');
            
            // Muat ulang daftar URL
            loadUserUrls();
        })
        .catch((error) => {
            showAlert('Terjadi kesalahan saat menyimpan URL', 'danger');
        });
}

// Generate kode pendek untuk URL
function generateShortCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Validasi URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Muat URL user dari Firebase
function loadUserUrls() {
    if (!currentUser) {
        // Jika guest, muat URL dari localStorage
        loadGuestUrls();
        return;
    }
    
    const urlsRef = ref(database, 'urls');
    onValue(urlsRef, (snapshot) => {
        const data = snapshot.val();
        userUrls = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key].userId === currentUser.uid) {
                    userUrls.push({ id: key, ...data[key] });
                }
            });
        }
        
        displayUserUrls();
        updateStats();
    });
}

// Muat URL guest dari localStorage
function loadGuestUrls() {
    const guestUrls = JSON.parse(localStorage.getItem('guestUrls') || '[]');
    userUrls = guestUrls.map((url, index) => ({ id: `guest-${index}`, ...url }));
    displayUserUrls();
    updateStats();
}

// Tampilkan URL user
function displayUserUrls() {
    const urlList = document.getElementById('url-list');
    if (!urlList) return;
    
    urlList.innerHTML = '';
    
    if (userUrls.length === 0) {
        urlList.innerHTML = '<p style="text-align: center; color: var(--text);">Belum ada URL yang dibuat.</p>';
        return;
    }
    
    userUrls.forEach(url => {
        const urlCard = document.createElement('div');
        urlCard.className = 'url-card';
        
        urlCard.innerHTML = `
            <div class="url-info">
                <div class="url-original">${url.original}</div>
                <div class="url-short">${url.short}</div>
                <div class="url-stats">
                    <span><i class="fas fa-mouse-pointer"></i> ${url.clicks || 0} klik</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(url.createdAt)}</span>
                </div>
            </div>
            <div class="url-actions">
                <button class="btn-action btn-copy" data-url="${url.short}">
                    <i class="fas fa-copy"></i> Salin
                </button>
                ${currentUser ? `<button class="btn-action btn-delete" data-id="${url.id}">
                    <i class="fas fa-trash"></i> Hapus
                </button>` : ''}
            </div>
        `;
        
        urlList.appendChild(urlCard);
    });
    
    // Tambah event listeners untuk tombol aksi
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', handleCopyUrl);
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', handleDeleteUrl);
    });
}

// Tampilkan URL guest
function displayGuestUrl(urlData) {
    const urlList = document.getElementById('url-list');
    if (!urlList) return;
    
    const urlCard = document.createElement('div');
    urlCard.className = 'url-card';
    
    urlCard.innerHTML = `
        <div class="url-info">
            <div class="url-original">${urlData.original}</div>
            <div class="url-short">${urlData.short}</div>
            <div class="url-stats">
                <span><i class="fas fa-mouse-pointer"></i> ${urlData.clicks || 0} klik</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(urlData.createdAt)}</span>
            </div>
        </div>
        <div class="url-actions">
            <button class="btn-action btn-copy" data-url="${urlData.short}">
                <i class="fas fa-copy"></i> Salin
            </button>
        </div>
    `;
    
    urlList.appendChild(urlCard);
    
    // Tambah event listener untuk tombol salin
    urlCard.querySelector('.btn-copy').addEventListener('click', handleCopyUrl);
    
    updateStats();
}

// Handle copy URL
function handleCopyUrl(e) {
    const url = e.currentTarget.getAttribute('data-url');
    
    navigator.clipboard.writeText(url).then(() => {
        const originalText = e.currentTarget.innerHTML;
        e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
        
        setTimeout(() => {
            e.currentTarget.innerHTML = originalText;
        }, 2000);
    }).catch(() => {
        showAlert('Gagal menyalin URL', 'danger');
    });
}

// Handle delete URL
function handleDeleteUrl(e) {
    const urlId = e.currentTarget.getAttribute('data-id');
    
    if (confirm('Apakah Anda yakin ingin menghapus URL ini?')) {
        remove(ref(database, `urls/${urlId}`))
            .then(() => {
                showAlert('URL berhasil dihapus', 'success');
            })
            .catch((error) => {
                showAlert('Terjadi kesalahan saat menghapus URL', 'danger');
            });
    }
}

// Update statistik
function updateStats() {
    const totalUrls = document.getElementById('total-urls');
    const totalClicks = document.getElementById('total-clicks');
    const todayClicks = document.getElementById('today-clicks');
    
    if (totalUrls) {
        totalUrls.textContent = userUrls.length;
    }
    
    if (totalClicks) {
        const total = userUrls.reduce((sum, url) => sum + (url.clicks || 0), 0);
        totalClicks.textContent = total;
    }
    
    if (todayClicks) {
        // Untuk sederhana, kita asumsikan 10% dari total klik adalah klik hari ini
        const total = userUrls.reduce((sum, url) => sum + (url.clicks || 0), 0);
        todayClicks.textContent = Math.floor(total * 0.1);
    }
}

// Muat data profil
function loadProfileData() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const userRef = ref(database, `users/${currentUser.uid}`);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Isi form dengan data user
            document.getElementById('profile-name').textContent = userData.name || currentUser.displayName || 'Pengguna';
            document.getElementById('profile-bio').textContent = userData.bio || 'Bio pengguna akan muncul di sini. Edit bio Anda untuk memberikan informasi lebih tentang diri Anda.';
            document.getElementById('name-input').value = userData.name || currentUser.displayName || '';
            document.getElementById('bio-input').value = userData.bio || '';
            
            // Set foto profil jika ada
            if (userData.photoURL) {
                document.getElementById('profile-picture').src = userData.photoURL;
            }
        } else {
            // Jika data user belum ada, buat data default
            const userData = {
                name: currentUser.displayName || 'Pengguna',
                email: currentUser.email,
                createdAt: new Date().toISOString(),
                bio: 'Bio pengguna akan muncul di sini. Edit bio Anda untuk memberikan informasi lebih tentang diri Anda.'
            };
            
            set(userRef, userData);
            
            // Isi form dengan data default
            document.getElementById('profile-name').textContent = userData.name;
            document.getElementById('profile-bio').textContent = userData.bio;
            document.getElementById('name-input').value = userData.name;
            document.getElementById('bio-input').value = userData.bio;
        }
        
        // Update statistik profil
        updateProfileStats();
    });
}

// Update statistik profil
function updateProfileStats() {
    // Hitung jumlah URL yang dibuat user
    const urlsRef = ref(database, 'urls');
    get(urlsRef).then((snapshot) => {
        const data = snapshot.val();
        let userUrlCount = 0;
        let userClickCount = 0;
        
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key].userId === currentUser.uid) {
                    userUrlCount++;
                    userClickCount += data[key].clicks || 0;
                }
            });
        }
        
        document.getElementById('profile-urls').textContent = userUrlCount;
        document.getElementById('profile-clicks').textContent = userClickCount;
    });
}

// Handle simpan profil
function handleSaveProfile() {
    const name = document.getElementById('name-input').value.trim();
    const bio = document.getElementById('bio-input').value.trim();
    
    if (!name) {
        showAlert('Nama tidak boleh kosong', 'danger');
        return;
    }
    
    const updates = {
        name: name,
        bio: bio,
        updatedAt: new Date().toISOString()
    };
    
    // Update di Firebase
    update(ref(database, `users/${currentUser.uid}`), updates)
        .then(() => {
            showAlert('Profil berhasil diperbarui', 'success');
            
            // Perbarui tampilan
            document.getElementById('profile-name').textContent = name;
            document.getElementById('profile-bio').textContent = bio;
        })
        .catch((error) => {
            showAlert('Terjadi kesalahan saat memperbarui profil', 'danger');
        });
}

// Handle upload foto
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validasi tipe file
    if (!file.type.match('image.*')) {
        showAlert('Harap pilih file gambar', 'danger');
        return;
    }
    
    // Validasi ukuran file (maks 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('Ukuran file terlalu besar. Maksimal 5MB', 'danger');
        return;
    }
    
    // Tampilkan preview
    const reader = new FileReader();
    reader.onload = function(event) {
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = `<img src="${event.target.result}" style="max-width: 150px; border-radius: 8px;" alt="Preview">`;
        
        // Simpan ke Firebase (dalam implementasi nyata, gunakan Firebase Storage)
        // Untuk demo, kita simpan sebagai base64 di Realtime Database
        update(ref(database, `users/${currentUser.uid}`), {
            photoURL: event.target.result,
            updatedAt: new Date().toISOString()
        }).then(() => {
            document.getElementById('profile-picture').src = event.target.result;
            showAlert('Foto profil berhasil diperbarui', 'success');
        }).catch((error) => {
            showAlert('Terjadi kesalahan saat mengunggah foto', 'danger');
        });
    };
    
    reader.readAsDataURL(file);
}

// Inisialisasi redirect di halaman woi.html
function initializeRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) {
        document.querySelector('.redirect-title').textContent = 'URL Tidak Valid';
        document.querySelector('.redirect-message').textContent = 'URL short yang Anda akses tidak valid.';
        document.getElementById('countdown').style.display = 'none';
        document.getElementById('redirect-btn').style.display = 'none';
        return;
    }
    
    // Cari URL asli berdasarkan kode
    findOriginalUrl(code).then(originalUrl => {
        if (originalUrl) {
            // Update hitungan klik
            updateClickCount(code);
            
            // Mulai hitungan mundur
            startCountdown(originalUrl);
        } else {
            document.querySelector('.redirect-title').textContent = 'URL Tidak Ditemukan';
            document.querySelector('.redirect-message').textContent = 'URL short yang Anda akses tidak ditemukan atau telah dihapus.';
            document.getElementById('countdown').style.display = 'none';
            document.getElementById('redirect-btn').style.display = 'none';
        }
    });
}

// Cari URL asli berdasarkan kode
function findOriginalUrl(code) {
    return new Promise((resolve) => {
        // Cek di Firebase terlebih dahulu
        const urlsRef = ref(database, 'urls');
        get(urlsRef).then((snapshot) => {
            const data = snapshot.val();
            
            if (data) {
                for (let key in data) {
                    if (data[key].shortCode === code) {
                        resolve(data[key].original);
                        return;
                    }
                }
            }
            
            // Jika tidak ditemukan di Firebase, cek di localStorage (untuk guest URLs)
            const guestUrls = JSON.parse(localStorage.getItem('guestUrls') || '[]');
            const guestUrl = guestUrls.find(url => url.shortCode === code);
            
            if (guestUrl) {
                // Update klik untuk guest URL
                guestUrl.clicks = (guestUrl.clicks || 0) + 1;
                localStorage.setItem('guestUrls', JSON.stringify(guestUrls));
                
                resolve(guestUrl.original);
                return;
            }
            
            resolve(null);
        });
    });
}

// Update jumlah klik
function updateClickCount(code) {
    const urlsRef = ref(database, 'urls');
    get(urlsRef).then((snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            for (let key in data) {
                if (data[key].shortCode === code) {
                    const currentClicks = data[key].clicks || 0;
                    update(ref(database, `urls/${key}`), {
                        clicks: currentClicks + 1
                    });
                    break;
                }
            }
        }
    });
}

// Mulai hitungan mundur
function startCountdown(originalUrl) {
    let countdown = 5;
    const countdownElement = document.getElementById('countdown');
    const redirectBtn = document.getElementById('redirect-btn');
    
    redirectBtn.href = originalUrl;
    
    const countdownInterval = setInterval(() => {
        countdownElement.textContent = countdown;
        countdown--;
        
        if (countdown < 0) {
            clearInterval(countdownInterval);
            window.location.href = originalUrl;
        }
    }, 1000);
    
    // Handle klik manual
    redirectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearInterval(countdownInterval);
        window.location.href = originalUrl;
    });
}

// Format tanggal
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Tampilkan alert
function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.display = 'block';
    
    alertContainer.appendChild(alert);
    
    // Hapus alert setelah 5 detik
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Ekspor fungsi untuk digunakan di file lain
export { database, auth, currentUser, showAlert };