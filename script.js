// Initialize Firebase
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

// DOM Elements
const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const shortenBtn = document.getElementById('shortenBtn');
const resultContainer = document.getElementById('resultContainer');
const shortUrl = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const usageInfo = document.getElementById('usageInfo');
const urlListSection = document.getElementById('urlListSection');
const urlList = document.getElementById('urlList');
const loginPrompt = document.getElementById('loginPrompt');
const notification = document.getElementById('notification');
const themeToggle = document.getElementById('themeToggle');
const userSection = document.getElementById('userSection');

// State
let currentUser = null;
let userUrls = [];
let freeUsageCount = 0;
const MAX_FREE_USAGE = 2;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        updateUserUI();
        loadUserUrls();
    });
    
    // Event listeners
    urlForm.addEventListener('submit', handleUrlSubmit);
    copyBtn.addEventListener('click', copyToClipboard);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Load free usage count from localStorage
    freeUsageCount = parseInt(localStorage.getItem('freeUsageCount') || '0');
});

// Handle URL form submission
function handleUrlSubmit(e) {
    e.preventDefault();
    
    const originalUrl = urlInput.value.trim();
    if (!originalUrl) return;
    
    // Check if user is logged in or has free usage left
    if (!currentUser && freeUsageCount >= MAX_FREE_USAGE) {
        showNotification('Anda telah mencapai batas penggunaan gratis. Silakan daftar atau masuk untuk melanjutkan.', 'error');
        loginPrompt.style.display = 'block';
        return;
    }
    
    // Disable button and show loading state
    shortenBtn.disabled = true;
    shortenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    
    // Generate short code
    const shortCode = generateShortCode();
    
    // Save to database
    const urlData = {
        originalUrl,
        shortCode,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: currentUser ? currentUser.uid : 'anonymous',
        totalClicks: 0
    };
    
    database.ref(`urls/${shortCode}`).set(urlData)
        .then(() => {
            // Update free usage count if not logged in
            if (!currentUser) {
                freeUsageCount++;
                localStorage.setItem('freeUsageCount', freeUsageCount.toString());
                
                // Show usage info
                usageInfo.textContent = `Penggunaan gratis: ${freeUsageCount}/${MAX_FREE_USAGE}`;
                
                // Show login prompt if reached limit
                if (freeUsageCount >= MAX_FREE_USAGE) {
                    loginPrompt.style.display = 'block';
                }
            }
            
            // Show result
            const shortUrlValue = `${window.location.origin}/woi.html?code=${shortCode}`;
            shortUrl.href = shortUrlValue;
            shortUrl.textContent = shortUrlValue;
            resultContainer.classList.add('active');
            
            // Add to user URLs list
            userUrls.unshift({
                ...urlData,
                id: shortCode
            });
            
            // Update UI
            updateUrlList();
            
            // Reset form
            urlInput.value = '';
            
            // Show notification
            showNotification('Link berhasil dibuat!', 'success');
        })
        .catch(error => {
            console.error('Error creating short URL:', error);
            showNotification('Terjadi kesalahan. Silakan coba lagi.', 'error');
        })
        .finally(() => {
            // Re-enable button
            shortenBtn.disabled = false;
            shortenBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Pendekkan';
        });
}

// Generate random short code
function generateShortCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Copy short URL to clipboard
function copyToClipboard() {
    const url = shortUrl.href;
    
    navigator.clipboard.writeText(url)
        .then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin';
                copyBtn.classList.remove('copied');
            }, 2000);
            
            showNotification('Link berhasil disalin!', 'success');
        })
        .catch(err => {
            console.error('Error copying text: ', err);
            showNotification('Gagal menyalin link', 'error');
        });
}

// Load user URLs from database
function loadUserUrls() {
    if (!currentUser) {
        // Load anonymous URLs from localStorage
        const anonymousUrls = JSON.parse(localStorage.getItem('anonymousUrls') || '[]');
        userUrls = anonymousUrls;
        updateUrlList();
        return;
    }
    
    // Load user URLs from Firebase
    database.ref('urls').orderByChild('createdBy').equalTo(currentUser.uid).once('value')
        .then(snapshot => {
            userUrls = [];
            snapshot.forEach(childSnapshot => {
                const urlData = childSnapshot.val();
                urlData.id = childSnapshot.key;
                userUrls.push(urlData);
            });
            
            // Sort by creation date (newest first)
            userUrls.sort((a, b) => b.createdAt - a.createdAt);
            
            updateUrlList();
        })
        .catch(error => {
            console.error('Error loading user URLs:', error);
            showNotification('Gagal memuat link Anda', 'error');
        });
}

// Update URL list UI
function updateUrlList() {
    if (userUrls.length === 0) {
        urlListSection.style.display = 'none';
        return;
    }
    
    urlListSection.style.display = 'block';
    urlList.innerHTML = '';
    
    userUrls.forEach(url => {
        const urlItem = document.createElement('div');
        urlItem.className = 'url-item';
        
        const shortUrlValue = `${window.location.origin}/woi.html?code=${url.id}`;
        
        urlItem.innerHTML = `
            <div class="url-info">
                <h3>${shortUrlValue}</h3>
                <p>${url.originalUrl}</p>
            </div>
            <div class="url-stats">
                <div class="stat">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>${url.totalClicks || 0} klik</span>
                </div>
                <div class="stat">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(url.createdAt)}</span>
                </div>
            </div>
            ${currentUser ? `<button class="delete-btn" data-id="${url.id}">
                <i class="fas fa-trash"></i>
            </button>` : ''}
        `;
        
        urlList.appendChild(urlItem);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteUrl);
    });
}

// Handle delete URL
function handleDeleteUrl(e) {
    const urlId = e.currentTarget.getAttribute('data-id');
    
    if (!confirm('Apakah Anda yakin ingin menghapus link ini?')) return;
    
    database.ref(`urls/${urlId}`).remove()
        .then(() => {
            // Remove from local array
            userUrls = userUrls.filter(url => url.id !== urlId);
            
            // Update UI
            updateUrlList();
            
            showNotification('Link berhasil dihapus', 'success');
        })
        .catch(error => {
            console.error('Error deleting URL:', error);
            showNotification('Gagal menghapus link', 'error');
        });
}

// Update user UI based on authentication state
function updateUserUI() {
    if (currentUser) {
        // User is logged in
        userSection.innerHTML = `
            <img src="${currentUser.photoURL || 'https://picsum.photos/seed/user123/40/40.jpg'}" alt="User Avatar" class="user-avatar">
            <a href="profil.html" class="btn btn-outline">Profil</a>
            <button class="btn btn-primary" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i> Keluar
            </button>
        `;
        
        // Add logout event listener
        document.getElementById('logoutBtn').addEventListener('click', () => {
            firebase.auth().signOut()
                .then(() => {
                    showNotification('Anda telah keluar', 'info');
                })
                .catch(error => {
                    console.error('Error signing out:', error);
                    showNotification('Gagal keluar', 'error');
                });
        });
        
        // Hide login prompt
        loginPrompt.style.display = 'none';
    } else {
        // User is not logged in
        userSection.innerHTML = `
            <a href="login.html" class="btn btn-outline">
                <i class="fas fa-sign-in-alt"></i> Masuk
            </a>
            <a href="daftar.html" class="btn btn-primary">
                <i class="fas fa-user-plus"></i> Daftar
            </a>
        `;
        
        // Show usage info if there are free usage left
        if (freeUsageCount > 0 && freeUsageCount < MAX_FREE_USAGE) {
            usageInfo.textContent = `Penggunaan gratis: ${freeUsageCount}/${MAX_FREE_USAGE}`;
        }
    }
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Update theme icon
function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Show notification
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
        return 'Baru saja';
    }
    
    // Less than an hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} menit yang lalu`;
    }
    
    // Less than a day
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} jam yang lalu`;
    }
    
    // Less than a week
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} hari yang lalu`;
    }
    
    // More than a week
    return date.toLocaleDateString('id-ID');
}

// Profile page specific functions
if (window.location.pathname.includes('profil.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Profile page specific code
        const profileAvatar = document.getElementById('profileAvatar');
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const avatarInput = document.getElementById('avatarInput');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileBio = document.getElementById('profileBio');
        const totalLinks = document.getElementById('totalLinks');
        const totalClicks = document.getElementById('totalClicks');
        const editProfileForm = document.getElementById('editProfileForm');
        const nameInput = document.getElementById('nameInput');
        const bioInput = document.getElementById('bioInput');
        const settingsForm = document.getElementById('settingsForm');
        const passwordInput = document.getElementById('passwordInput');
        const confirmPasswordInput = document.getElementById('confirmPasswordInput');
        const userUrlList = document.getElementById('userUrlList');
        const analyticsContent = document.getElementById('analyticsContent');
        
        // Check if user is logged in
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            // Load user profile
            loadUserProfile();
            
            // Load user URLs
            loadUserUrls();
            
            // Load analytics
            loadAnalytics();
        });
        
        // Load user profile
        function loadUserProfile() {
            const user = firebase.auth().currentUser;
            
            profileName.textContent = user.displayName || 'Pengguna';
            profileEmail.textContent = user.email;
            profileAvatar.src = user.photoURL || 'https://picsum.photos/seed/user123/150/150.jpg';
            
            // Load additional profile data from database
            database.ref(`users/${user.uid}`).once('value')
                .then(snapshot => {
                    const profileData = snapshot.val() || {};
                    profileBio.textContent = profileData.bio || 'Tidak ada bio';
                    nameInput.value = user.displayName || '';
                    bioInput.value = profileData.bio || '';
                })
                .catch(error => {
                    console.error('Error loading user profile:', error);
                });
        }
        
        // Load user URLs
        function loadUserUrls() {
            const user = firebase.auth().currentUser;
            
            database.ref('urls').orderByChild('createdBy').equalTo(user.uid).once('value')
                .then(snapshot => {
                    const urls = [];
                    let totalClicksCount = 0;
                    
                    snapshot.forEach(childSnapshot => {
                        const urlData = childSnapshot.val();
                        urlData.id = childSnapshot.key;
                        urls.push(urlData);
                        totalClicksCount += urlData.totalClicks || 0;
                    });
                    
                    // Sort by creation date (newest first)
                    urls.sort((a, b) => b.createdAt - a.createdAt);
                    
                    // Update stats
                    totalLinks.textContent = urls.length;
                    totalClicks.textContent = totalClicksCount;
                    
                    // Update URL list
                    updateUserUrlList(urls);
                })
                .catch(error => {
                    console.error('Error loading user URLs:', error);
                });
        }
        
        // Update user URL list
        function updateUserUrlList(urls) {
            userUrlList.innerHTML = '';
            
            if (urls.length === 0) {
                userUrlList.innerHTML = '<p>Anda belum memiliki link</p>';
                return;
            }
            
            urls.forEach(url => {
                const urlItem = document.createElement('div');
                urlItem.className = 'url-item';
                
                const shortUrlValue = `${window.location.origin}/woi.html?code=${url.id}`;
                
                urlItem.innerHTML = `
                    <div class="url-info">
                        <h3>${shortUrlValue}</h3>
                        <p>${url.originalUrl}</p>
                    </div>
                    <div class="url-stats">
                        <div class="stat">
                            <i class="fas fa-mouse-pointer"></i>
                            <span>${url.totalClicks || 0} klik</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(url.createdAt)}</span>
                        </div>
                    </div>
                    <button class="delete-btn" data-id="${url.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                
                userUrlList.appendChild(urlItem);
            });
            
            // Add event listeners to delete buttons
            document.querySelectorAll('#userUrlList .delete-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteUrl);
            });
        }
        
        // Load analytics
        function loadAnalytics() {
            const user = firebase.auth().currentUser;
            
            database.ref('urls').orderByChild('createdBy').equalTo(user.uid).once('value')
                .then(snapshot => {
                    const urls = [];
                    const clicksData = {};
                    
                    snapshot.forEach(childSnapshot => {
                        const urlData = childSnapshot.val();
                        urlData.id = childSnapshot.key;
                        urls.push(urlData);
                        
                        // Load click data for this URL
                        database.ref(`urls/${urlData.id}/clicks`).once('value')
                            .then(clickSnapshot => {
                                const clicks = [];
                                clickSnapshot.forEach(childClickSnapshot => {
                                    const clickData = childClickSnapshot.val();
                                    clicks.push(clickData);
                                });
                                clicksData[urlData.id] = clicks;
                                
                                // Check if all URLs have been processed
                                if (Object.keys(clicksData).length === urls.length) {
                                    displayAnalytics(urls, clicksData);
                                }
                            })
                            .catch(error => {
                                console.error('Error loading click data:', error);
                            });
                    });
                    
                    if (urls.length === 0) {
                        analyticsContent.innerHTML = '<p>Belum ada data analitik</p>';
                    }
                })
                .catch(error => {
                    console.error('Error loading analytics:', error);
                    analyticsContent.innerHTML = '<p>Gagal memuat data analitik</p>';
                });
        }
        
        // Display analytics
        function displayAnalytics(urls, clicksData) {
            let totalClicks = 0;
            const todayClicks = [];
            const weekClicks = [];
            const monthClicks = [];
            const ipAddresses = {};
            
            // Process click data
            Object.keys(clicksData).forEach(urlId => {
                clicksData[urlId].forEach(click => {
                    totalClicks++;
                    
                    const clickDate = new Date(click.timestamp);
                    const now = new Date();
                    const diffTime = Math.abs(now - clickDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 1) {
                        todayClicks.push(click);
                    }
                    
                    if (diffDays <= 7) {
                        weekClicks.push(click);
                    }
                    
                    if (diffDays <= 30) {
                        monthClicks.push(click);
                    }
                    
                    // Count IP addresses
                    if (ipAddresses[click.ip]) {
                        ipAddresses[click.ip]++;
                    } else {
                        ipAddresses[click.ip] = 1;
                    }
                });
            });
            
            // Create analytics HTML
            analyticsContent.innerHTML = `
                <div class="analytics-summary">
                    <div class="stat-card">
                        <h3>Total Klik</h3>
                        <p>${totalClicks}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Klik Hari Ini</h3>
                        <p>${todayClicks.length}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Klik Minggu Ini</h3>
                        <p>${weekClicks.length}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Klik Bulan Ini</h3>
                        <p>${monthClicks.length}</p>
                    </div>
                </div>
                <div class="analytics-details">
                    <h3>IP Address Teratas</h3>
                    <ul>
                        ${Object.entries(ipAddresses)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([ip, count]) => `<li>${ip}: ${count} klik</li>`)
                            .join('')}
                    </ul>
                </div>
            `;
            
            // Add styles for analytics
            const style = document.createElement('style');
            style.textContent = `
                .analytics-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .stat-card {
                    background-color: var(--bg-color);
                    padding: 1.5rem;
                    border-radius: 10px;
                    text-align: center;
                }
                
                .stat-card h3 {
                    margin-bottom: 0.5rem;
                    color: var(--primary-color);
                }
                
                .stat-card p {
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                
                .analytics-details {
                    background-color: var(--bg-color);
                    padding: 1.5rem;
                    border-radius: 10px;
                }
                
                .analytics-details h3 {
                    margin-bottom: 1rem;
                    color: var(--primary-color);
                }
                
                .analytics-details ul {
                    list-style: none;
                }
                
                .analytics-details li {
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #e0e0e0;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Handle change avatar
        changeAvatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
        
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Ukuran file terlalu besar. Maksimal 5MB.', 'error');
                return;
            }
            
            // Convert to base64
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                
                // Update profile picture
                const user = firebase.auth().currentUser;
                user.updateProfile({
                    photoURL: base64
                })
                    .then(() => {
                        profileAvatar.src = base64;
                        showNotification('Foto profil berhasil diperbarui', 'success');
                    })
                    .catch(error => {
                        console.error('Error updating profile picture:', error);
                        showNotification('Gagal memperbarui foto profil', 'error');
                    });
            };
            reader.readAsDataURL(file);
        });
        
        // Handle edit profile form
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = nameInput.value.trim();
            const bio = bioInput.value.trim();
            
            if (!name) {
                showNotification('Nama tidak boleh kosong', 'error');
                return;
            }
            
            const user = firebase.auth().currentUser;
            
            // Update display name
            user.updateProfile({
                displayName: name
            })
                .then(() => {
                    profileName.textContent = name;
                    
                    // Update bio in database
                    return database.ref(`users/${user.uid}`).update({
                        bio
                    });
                })
                .then(() => {
                    profileBio.textContent = bio;
                    showNotification('Profil berhasil diperbarui', 'success');
                })
                .catch(error => {
                    console.error('Error updating profile:', error);
                    showNotification('Gagal memperbarui profil', 'error');
                });
        });
        
        // Handle settings form
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (!password) {
                showNotification('Password tidak boleh kosong', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Password minimal 6 karakter', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Password tidak cocok', 'error');
                return;
            }
            
            const user = firebase.auth().currentUser;
            
            user.updatePassword(password)
                .then(() => {
                    showNotification('Password berhasil diperbarui', 'success');
                    settingsForm.reset();
                })
                .catch(error => {
                    console.error('Error updating password:', error);
                    showNotification('Gagal memperbarui password', 'error');
                });
        });
        
        // Handle tabs
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    });
}

// Login page specific functions
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');
        const rememberMe = document.getElementById('rememberMe');
        const togglePassword = document.getElementById('togglePassword');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const githubLoginBtn = document.getElementById('githubLoginBtn');
        
        // Handle login form
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (!email || !password) {
                showNotification('Email dan password harus diisi', 'error');
                return;
            }
            
            // Disable button and show loading state
            const loginBtn = document.getElementById('loginBtn');
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';
            
            // Sign in with email and password
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => {
                    // Remember me functionality
                    if (rememberMe.checked) {
                        localStorage.setItem('rememberMe', 'true');
                        localStorage.setItem('email', email);
                    } else {
                        localStorage.removeItem('rememberMe');
                        localStorage.removeItem('email');
                    }
                    
                    showNotification('Login berhasil', 'success');
                    
                    // Redirect to profile page
                    setTimeout(() => {
                        window.location.href = 'profil.html';
                    }, 1000);
                })
                .catch(error => {
                    console.error('Error signing in:', error);
                    
                    let errorMessage = 'Login gagal';
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'Pengguna tidak ditemukan';
                    } else if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Password salah';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Email tidak valid';
                    }
                    
                    showNotification(errorMessage, 'error');
                })
                .finally(() => {
                    // Re-enable button
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
                });
        });
        
        // Handle toggle password
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = togglePassword.querySelector('i');
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
        
        // Handle Google login
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then(() => {
                    showNotification('Login dengan Google berhasil', 'success');
                    
                    // Redirect to profile page
                    setTimeout(() => {
                        window.location.href = 'profil.html';
                    }, 1000);
                })
                .catch(error => {
                    console.error('Error signing in with Google:', error);
                    showNotification('Login dengan Google gagal', 'error');
                });
        });
        
        // Handle GitHub login
        githubLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GithubAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then(() => {
                    showNotification('Login dengan GitHub berhasil', 'success');
                    
                    // Redirect to profile page
                    setTimeout(() => {
                        window.location.href = 'profil.html';
                    }, 1000);
                })
                .catch(error => {
                    console.error('Error signing in with GitHub:', error);
                    showNotification('Login dengan GitHub gagal', 'error');
                });
        });
        
        // Check for remember me
        if (localStorage.getItem('rememberMe') === 'true') {
            rememberMe.checked = true;
            emailInput.value = localStorage.getItem('email') || '';
        }
    });
}

// Register page specific functions
if (window.location.pathname.includes('daftar.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const registerForm = document.getElementById('registerForm');
        const nameInput = document.getElementById('nameInput');
        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');
        const confirmPasswordInput = document.getElementById('confirmPasswordInput');
        const togglePassword = document.getElementById('togglePassword');
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        const googleRegisterBtn = document.getElementById('googleRegisterBtn');
        const githubRegisterBtn = document.getElementById('githubRegisterBtn');
        
        // Handle register form
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (!name || !email || !password || !confirmPassword) {
                showNotification('Semua field harus diisi', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Password minimal 6 karakter', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Password tidak cocok', 'error');
                return;
            }
            
            // Disable button and show loading state
            const registerBtn = document.getElementById('registerBtn');
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendaftar...';
            
            // Create user with email and password
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Update display name
                    return userCredential.user.updateProfile({
                        displayName: name
                    });
                })
                .then(() => {
                    // Save additional user data to database
                    const user = firebase.auth().currentUser;
                    return database.ref(`users/${user.uid}`).set({
                        name,
                        email,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    });
                })
                .then(() => {
                    showNotification('Pendaftaran berhasil', 'success');
                    
                    // Redirect to profile page
                    setTimeout(() => {
                        window.location.href = 'profil.html';
                    }, 1000);
                })
                .catch(error => {
                    console.error('Error creating user:', error);
                    
                    let errorMessage = 'Pendaftaran gagal';
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'Email sudah digunakan';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Email tidak valid';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'Password terlalu lemah';
                    }
                    
                    showNotification(errorMessage, 'error');
                })
                .finally(() => {
                    // Re-enable button
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Daftar';
                });
        });
        
        // Handle toggle password
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = togglePassword.querySelector('i');
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
        
        // Handle toggle confirm password
        toggleConfirmPassword.addEventListener('click', () => {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            
            const icon = toggleConfirmPassword.querySelector('i');
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
        
        // Handle Google register
        googleRegisterBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then(result => {
                    // Check if this is a new user
                    if (result.additionalUserInfo.isNewUser) {
                        // Save additional user data to database
                        const user = result.user;
                        return database.ref(`users/${user.uid}`).set({
                            name: user.displayName,
                            email: user.email,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                })
                .then(() => {
                    showNotification('Pendaftaran dengan Google berhasil', 'success');
                    
                    // Redirect to profile page
                    setTimeout(() => {
                        window.location.href = 'profil.html';
                    }, 1000);
                })
                .catch(error => {
                    console.error('Error signing up with Google:', error);
                    showNotification('Pendaftaran dengan Google gagal', 'error');
                });
        });
        
        // Handle GitHub register
        githubRegisterBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GithubAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then(result => {
                    // Check if this is a new user
                    if (result.additionalUserInfo.isNewUser) {
                        // Save additional user data to database
                        const user = result.user;
                        return database.ref(`users/${user.uid}`).set({
                            name: user.displayName,
                            email: user.email,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                })
                .then(() => {
                    showNotification('Pendaftaran dengan GitHub berhasil', 'success');
                    
                    // Redirect to profile page
                    setTimeout(() => {
                        window.location.href = 'profil.html';
                    }, 1000);
                })
                .catch(error => {
                    console.error('Error signing up with GitHub:', error);
                    showNotification('Pendaftaran dengan GitHub gagal', 'error');
                });
        });
    });
}

// Forgot password page specific functions
if (window.location.pathname.includes('lupa.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const forgotForm = document.getElementById('forgotForm');
        const emailInput = document.getElementById('emailInput');
        
        // Handle forgot password form
        forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            
            if (!email) {
                showNotification('Email harus diisi', 'error');
                return;
            }
            
            // Disable button and show loading state
            const resetBtn = document.getElementById('resetBtn');
            resetBtn.disabled = true;
            resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
            
            // Send password reset email
            firebase.auth().sendPasswordResetEmail(email)
                .then(() => {
                    showNotification('Instruksi reset password telah dikirim ke email Anda', 'success');
                    
                    // Clear form
                    emailInput.value = '';
                    
                    // Redirect to login page after a delay
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000);
                })
                .catch(error => {
                    console.error('Error sending password reset email:', error);
                    
                    let errorMessage = 'Gagal mengirim email reset password';
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'Pengguna dengan email ini tidak ditemukan';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Email tidak valid';
                    }
                    
                    showNotification(errorMessage, 'error');
                })
                .finally(() => {
                    // Re-enable button
                    resetBtn.disabled = false;
                    resetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Instruksi Reset';
                });
        });
    });
}