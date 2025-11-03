// auth.js - Logic Autentikasi Firebase

// Pastikan firebase sudah diinisialisasi di HTML sebelum auth.js dimuat

const auth = firebase.auth();
const database = firebase.database();

// --- Providers ---
const googleProvider = new firebase.auth.GoogleAuthProvider();
const githubProvider = new firebase.auth.GithubAuthProvider();

// --- Fungsi Helper UI ---
function updateAuthUI(user) {
    const navAuth = document.getElementById('nav-auth');
    const navProfil = document.getElementById('nav-profil');
    const navLogout = document.getElementById('nav-logout');

    if (navAuth && navProfil && navLogout) {
        if (user) {
            // User sudah login
            navAuth.style.display = 'none';
            navProfil.style.display = 'inline';
            navLogout.style.display = 'inline';
        } else {
            // User belum login
            navAuth.style.display = 'inline';
            navProfil.style.display = 'none';
            navLogout.style.display = 'none';
        }
    }
}

// --- Auth State Listener ---
auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
    // Panggil fungsi dari script.js atau suki.js jika ada
    if (typeof handleAuthStateChange === 'function') {
        handleAuthStateChange(user);
    }
});

// --- 1. Register (Daftar.html) ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            // Simpan data user ke Realtime DB
            await database.ref('users/' + userCredential.user.uid).set({
                name: name,
                email: email,
                bio: "Halo! Saya pengguna baru URL Shortener 2025.",
                profilePic: "default_base64_image" // Placeholder untuk gambar default
            });
            alert('Pendaftaran berhasil! Anda akan dialihkan ke Beranda.');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Gagal mendaftar: ' + error.message);
        }
    });
}

// --- 2. Login (Login.html) ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            alert('Login berhasil! Anda akan dialihkan ke Beranda.');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Gagal login: ' + error.message);
        }
    });
}

// --- 3. Social Login (Login.html) ---
const googleLoginBtn = document.getElementById('google-login-btn');
const githubLoginBtn = document.getElementById('github-login-btn');

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            // Cek apakah user baru, jika ya, simpan data ke Realtime DB
            if (result.additionalUserInfo.isNewUser) {
                await database.ref('users/' + result.user.uid).set({
                    name: result.user.displayName,
                    email: result.user.email,
                    bio: "Halo! Saya pengguna baru URL Shortener 2025.",
                    profilePic: result.user.photoURL || "default_base64_image"
                });
            }
            alert('Login Google berhasil!');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Gagal login dengan Google: ' + error.message);
        }
    });
}

if (githubLoginBtn) {
    githubLoginBtn.addEventListener('click', async () => {
        try {
            const result = await auth.signInWithPopup(githubProvider);
            // Cek apakah user baru, jika ya, simpan data ke Realtime DB
            if (result.additionalUserInfo.isNewUser) {
                await database.ref('users/' + result.user.uid).set({
                    name: result.user.displayName,
                    email: result.user.email,
                    bio: "Halo! Saya pengguna baru URL Shortener 2025.",
                    profilePic: result.user.photoURL || "default_base64_image"
                });
            }
            alert('Login GitHub berhasil!');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Gagal login dengan GitHub: ' + error.message);
        }
    });
}

// --- 4. Lupa Password (Lupa.html) ---
const forgotPasswordForm = document.getElementById('forgot-password-form');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;

        try {
            await auth.sendPasswordResetEmail(email);
            alert('Tautan reset kata sandi telah dikirim ke email Anda!');
        } catch (error) {
            alert('Gagal mengirim tautan reset: ' + error.message);
        }
    });
}

// --- 5. Logout (Global) ---
const navLogout = document.getElementById('nav-logout');
if (navLogout) {
    navLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert('Anda telah keluar.');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Gagal keluar: ' + error.message);
        }
    });
}
