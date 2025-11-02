// File untuk logika kompleks dan fungsi utilitas

// Konversi gambar ke Base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Kompres gambar sebelum dikonversi ke Base64
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            let width = img.width;
            let height = img.height;
            
            // Hitung ukuran baru yang mempertahankan aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            
            // Set ukuran canvas
            canvas.width = width;
            canvas.height = height;
            
            // Gambar ulang gambar dengan ukuran baru
            ctx.drawImage(img, 0, 0, width, height);
            
            // Konversi ke format WebP dengan kualitas tertentu
            canvas.toBlob(blob => {
                resolve(blob);
            }, 'image/webp', quality);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// Generate ID unik
function generateUniqueId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// Validasi URL yang lebih komprehensif
function isValidUrlAdvanced(string) {
    try {
        const url = new URL(string);
        
        // Validasi protokol (harus http atau https)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }
        
        // Validasi hostname (tidak boleh kosong)
        if (!url.hostname) {
            return false;
        }
        
        return true;
    } catch (_) {
        return false;
    }
}

// Format angka dengan pemisah ribuan
function formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

// Format tanggal lengkap
function formatDateFull(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Hitung selisih waktu (time ago)
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + ' tahun yang lalu';
    }
    
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + ' bulan yang lalu';
    }
    
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + ' hari yang lalu';
    }
    
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + ' jam yang lalu';
    }
    
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + ' menit yang lalu';
    }
    
    return 'Baru saja';
}

// Debounce function untuk optimasi performa
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function untuk optimasi performa
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Enkripsi sederhana untuk data sensitif (hanya untuk demo)
function simpleEncrypt(text) {
    // Dalam implementasi nyata, gunakan library enkripsi yang proper
    return btoa(text);
}

// Dekripsi sederhana
function simpleDecrypt(encryptedText) {
    // Dalam implementasi nyata, gunakan library enkripsi yang proper
    return atob(encryptedText);
}

// Ambil informasi IP pengguna (hanya untuk demo)
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error getting IP:', error);
        return 'unknown';
    }
}

// Simpan data ke localStorage dengan expiry
function setWithExpiry(key, value, ttl) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
}

// Ambil data dari localStorage dengan expiry
function getWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    
    if (!itemStr) {
        return null;
    }
    
    const item = JSON.parse(itemStr);
    const now = new Date();
    
    if (now.getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    
    return item.value;
}

// Export semua fungsi
export {
    convertImageToBase64,
    compressImage,
    generateUniqueId,
    isValidUrlAdvanced,
    formatNumber,
    formatDateFull,
    timeAgo,
    debounce,
    throttle,
    simpleEncrypt,
    simpleDecrypt,
    getUserIP,
    setWithExpiry,
    getWithExpiry
};