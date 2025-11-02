// Import modul Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    GoogleAuthProvider, 
    GithubAuthProvider, 
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Konfigurasi Firebase
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
const auth = getAuth(app);
const database = getDatabase(app);

// Provider untuk login sosial
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthEventListeners();
    
    // Periksa status autentikasi
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User sudah login, redirect ke halaman utama jika di halaman login/daftar
            if (window.location.pathname.endsWith('login.html') || 
                window.location.pathname.endsWith('daftar.html') ||
                window.location.pathname.endsWith('lupa.html')) {
                window.location.href = 'index.html';
            }
        } else {
            // User belum login, redirect ke halaman login jika di halaman yang membutuhkan auth
            if (window.location.pathname.endsWith('profil.html')) {
                window.location.href = 'login.html';
            }
        }
    });
});

// Inisialisasi event listeners untuk autentikasi
function initializeAuthEventListeners() {
    // Form pendaftaran
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Form login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Form lupa password
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Login dengan Google
    const googleLoginBtn = document.getElementById('google-login');
    const googleRegisterBtn = document.getElementById('google-register');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => handleSocialLogin(googleProvider));
    }
    
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', () => handleSocialLogin(googleProvider));
    }
    
    // Login dengan GitHub
    const githubLoginBtn = document.getElementById('github-login');
    const githubRegisterBtn = document.getElementById('github-register');
    
    if (githubLoginBtn) {
        githubLoginBtn.addEventListener('click', () => handleSocialLogin(githubProvider));
    }
    
    if (githubRegisterBtn) {
        githubRegisterBtn.addEventListener('click', () => handleSocialLogin(githubProvider));
    }
}

// Handle pendaftaran dengan email dan password
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('name-input').value.trim();
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    const confirmPassword = document.getElementById('confirm-password-input').value;
    
    // Validasi
    if (!name || !email || !password || !confirmPassword) {
        showAlert('Harap isi semua field', 'danger');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Kata sandi tidak cocok', 'danger');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Kata sandi harus minimal 6 karakter', 'danger');
        return;
    }
    
    // Daftar user dengan Firebase Auth
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Update profil user dengan nama
            return updateProfile(user, {
                displayName: name
            }).then(() => {
                // Simpan data user tambahan ke Realtime Database
                return set(ref(database, 'users/' + user.uid), {
                    name: name,
                    email: email,
                    createdAt: new Date().toISOString(),
                    bio: 'Bio pengguna akan muncul di sini. Edit bio Anda untuk memberikan informasi lebih tentang diri Anda.'
                });
            });
        })
        .then(() => {
            showAlert('Pendaftaran berhasil! Mengarahkan ke halaman utama...', 'success');
            
            // Redirect ke halaman utama setelah 2 detik
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        })
        .catch((error) => {
            console.error('Error during registration:', error);
            
            let errorMessage = 'Terjadi kesalahan saat pendaftaran';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email sudah digunakan. Silakan gunakan email lain.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Kata sandi terlalu lemah. Gunakan kata sandi yang lebih kuat.';
                    break;
            }
            
            showAlert(errorMessage, 'danger');
        });
}

// Handle login dengan email dan password
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    
    // Validasi
    if (!email || !password) {
        showAlert('Harap isi semua field', 'danger');
        return;
    }
    
    // Login user dengan Firebase Auth
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showAlert('Login berhasil! Mengarahkan ke halaman utama...', 'success');
            
            // Redirect ke halaman utama setelah 1 detik
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        })
        .catch((error) => {
            console.error('Error during login:', error);
            
            let errorMessage = 'Terjadi kesalahan saat login';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Akun ini telah dinonaktifkan.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Tidak ada akun dengan email tersebut.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Kata sandi salah.';
                    break;
            }
            
            showAlert(errorMessage, 'danger');
        });
}

// Handle login dengan provider sosial (Google/GitHub)
function handleSocialLogin(provider) {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            
            // Cek apakah user sudah ada di database
            const userRef = ref(database, 'users/' + user.uid);
            
            // Jika user baru, simpan data ke database
            if (result._tokenResponse.isNewUser) {
                set(userRef, {
                    name: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    bio: 'Bio pengguna akan muncul di sini. Edit bio Anda untuk memberikan informasi lebih tentang diri Anda.'
                });
            }
            
            showAlert('Login berhasil! Mengarahkan ke halaman utama...', 'success');
            
            // Redirect ke halaman utama setelah 1 detik
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        })
        .catch((error) => {
            console.error('Error during social login:', error);
            
            let errorMessage = 'Terjadi kesalahan saat login';
            
            switch (error.code) {
                case 'auth/account-exists-with-different-credential':
                    errorMessage = 'Akun sudah terdaftar dengan metode login yang berbeda.';
                    break;
                case 'auth/popup-closed-by-user':
                    errorMessage = 'Popup login ditutup sebelum proses selesai.';
                    break;
            }
            
            showAlert(errorMessage, 'danger');
        });
}

// Handle lupa password
function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('email-input').value.trim();
    
    // Validasi
    if (!email) {
        showAlert('Harap masukkan alamat email', 'danger');
        return;
    }
    
    // Kirim email reset password
    sendPasswordResetEmail(auth, email)
        .then(() => {
            showAlert('Email reset kata sandi telah dikirim. Periksa inbox email Anda.', 'success');
        })
        .catch((error) => {
            console.error('Error sending password reset email:', error);
            
            let errorMessage = 'Terjadi kesalahan saat mengirim email reset';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Format email tidak valid.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Tidak ada akun dengan email tersebut.';
                    break;
            }
            
            showAlert(errorMessage, 'danger');
        });
}

// Tampilkan alert
function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    // Hapus alert yang sudah ada
    const existingAlert = alertContainer.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
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
export { auth, database };