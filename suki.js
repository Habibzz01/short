// Complex logic for URL Shortener 2025

// URL Shortener Service
const urlShortenerService = {
    // Generate short code
    generateShortCode: (length = 6) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    },
    
    // Create short URL
    createShortUrl: (originalUrl, userId = 'anonymous') => {
        const shortCode = urlShortenerService.generateShortCode();
        const urlData = {
            originalUrl,
            shortCode,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: userId,
            totalClicks: 0
        };
        
        return firebase.database().ref(`urls/${shortCode}`).set(urlData)
            .then(() => {
                return {
                    ...urlData,
                    shortUrl: `${window.location.origin}/woi.html?code=${shortCode}`
                };
            });
    },
    
    // Get URL by short code
    getUrlByShortCode: (shortCode) => {
        return firebase.database().ref(`urls/${shortCode}`).once('value')
            .then(snapshot => {
                const data = snapshot.val();
                if (data) {
                    return {
                        ...data,
                        id: shortCode
                    };
                }
                return null;
            });
    },
    
    // Track click
    trackClick: (shortCode) => {
        // Get user IP
        return fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => {
                const clickData = {
                    ip: data.ip,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    userAgent: navigator.userAgent,
                    referrer: document.referrer
                };
                
                // Record click
                const clickRef = firebase.database().ref(`urls/${shortCode}/clicks`).push();
                return clickRef.set(clickData);
            })
            .catch(error => {
                console.error('Error getting IP:', error);
                // Still record click without IP
                const clickData = {
                    ip: 'Unknown',
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    userAgent: navigator.userAgent,
                    referrer: document.referrer
                };
                
                const clickRef = firebase.database().ref(`urls/${shortCode}/clicks`).push();
                return clickRef.set(clickData);
            })
            .then(() => {
                // Increment total clicks
                const totalClicksRef = firebase.database().ref(`urls/${shortCode}/totalClicks`);
                return totalClicksRef.transaction(currentClicks => {
                    return (currentClicks || 0) + 1;
                });
            });
    },
    
    // Get user URLs
    getUserUrls: (userId) => {
        return firebase.database().ref('urls').orderByChild('createdBy').equalTo(userId).once('value')
            .then(snapshot => {
                const urls = [];
                snapshot.forEach(childSnapshot => {
                    const urlData = childSnapshot.val();
                    urlData.id = childSnapshot.key;
                    urls.push(urlData);
                });
                
                // Sort by creation date (newest first)
                urls.sort((a, b) => b.createdAt - a.createdAt);
                
                return urls;
            });
    },
    
    // Delete URL
    deleteUrl: (shortCode) => {
        return firebase.database().ref(`urls/${shortCode}`).remove();
    },
    
    // Get URL analytics
    getUrlAnalytics: (shortCode) => {
        return firebase.database().ref(`urls/${shortCode}/clicks`).once('value')
            .then(snapshot => {
                const clicks = [];
                snapshot.forEach(childSnapshot => {
                    clicks.push(childSnapshot.val());
                });
                
                // Process analytics data
                const analytics = {
                    totalClicks: clicks.length,
                    todayClicks: 0,
                    weekClicks: 0,
                    monthClicks: 0,
                    ipAddresses: {},
                    referrers: {},
                    userAgents: {}
                };
                
                const now = new Date();
                
                clicks.forEach(click => {
                    const clickDate = new Date(click.timestamp);
                    const diffTime = Math.abs(now - clickDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 1) {
                        analytics.todayClicks++;
                    }
                    
                    if (diffDays <= 7) {
                        analytics.weekClicks++;
                    }
                    
                    if (diffDays <= 30) {
                        analytics.monthClicks++;
                    }
                    
                    // Count IP addresses
                    if (analytics.ipAddresses[click.ip]) {
                        analytics.ipAddresses[click.ip]++;
                    } else {
                        analytics.ipAddresses[click.ip] = 1;
                    }
                    
                    // Count referrers
                    const referrer = click.referrer || 'Direct';
                    if (analytics.referrers[referrer]) {
                        analytics.referrers[referrer]++;
                    } else {
                        analytics.referrers[referrer] = 1;
                    }
                    
                    // Count user agents
                    const userAgent = click.userAgent || 'Unknown';
                    if (analytics.userAgents[userAgent]) {
                        analytics.userAgents[userAgent]++;
                    } else {
                        analytics.userAgents[userAgent] = 1;
                    }
                });
                
                return analytics;
            });
    }
};

// User Profile Service
const userProfileService = {
    // Get user profile
    getUserProfile: (userId) => {
        return firebase.database().ref(`users/${userId}`).once('value')
            .then(snapshot => {
                return snapshot.val() || {};
            });
    },
    
    // Update user profile
    updateUserProfile: (userId, profileData) => {
        return firebase.database().ref(`users/${userId}`).update(profileData);
    },
    
    // Upload profile picture
    uploadProfilePicture: (userId, file) => {
        return new Promise((resolve, reject) => {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('Ukuran file terlalu besar. Maksimal 5MB.'));
                return;
            }
            
            // Convert to base64
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                
                // Update profile picture in auth
                const user = firebase.auth().currentUser;
                user.updateProfile({
                    photoURL: base64
                })
                    .then(() => {
                        // Save to database
                        return firebase.database().ref(`users/${userId}`).update({
                            photoURL: base64
                        });
                    })
                    .then(() => {
                        resolve(base64);
                    })
                    .catch(error => {
                        reject(error);
                    });
            };
            
            reader.onerror = () => {
                reject(new Error('Gagal membaca file'));
            };
            
            reader.readAsDataURL(file);
        });
    }
};

// Theme Service
const themeService = {
    // Get current theme
    getCurrentTheme: () => {
        return localStorage.getItem('theme') || 'light';
    },
    
    // Set theme
    setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update theme icon
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },
    
    // Toggle theme
    toggleTheme: () => {
        const currentTheme = themeService.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        themeService.setTheme(newTheme);
        return newTheme;
    },
    
    // Initialize theme
    initTheme: () => {
        const theme = themeService.getCurrentTheme();
        themeService.setTheme(theme);
    }
};

// Notification Service
const notificationService = {
    // Show notification
    show: (message, type = 'info', duration = 3000) => {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    },
    
    // Show success notification
    success: (message, duration) => {
        notificationService.show(message, 'success', duration);
    },
    
    // Show error notification
    error: (message, duration) => {
        notificationService.show(message, 'error', duration);
    },
    
    // Show info notification
    info: (message, duration) => {
        notificationService.show(message, 'info', duration);
    }
};

// Storage Service
const storageService = {
    // Get item from localStorage
    get: (key) => {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return localStorage.getItem(key);
        }
    },
    
    // Set item to localStorage
    set: (key, value) => {
        if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
        } else {
            localStorage.setItem(key, value);
        }
    },
    
    // Remove item from localStorage
    remove: (key) => {
        localStorage.removeItem(key);
    },
    
    // Clear all localStorage
    clear: () => {
        localStorage.clear();
    }
};

// Validation Service
const validationService = {
    // Validate email
    isEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Validate URL
    isUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Validate password strength
    isStrongPassword: (password) => {
        // At least 6 characters
        if (password.length < 6) return false;
        
        // Contains at least one number
        if (!/\d/.test(password)) return false;
        
        // Contains at least one letter
        if (!/[a-zA-Z]/.test(password)) return false;
        
        return true;
    }
};

// Utility functions
const utils = {
    // Format date
    formatDate: (timestamp) => {
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
    },
    
    // Copy to clipboard
    copyToClipboard: (text) => {
        return navigator.clipboard.writeText(text);
    },
    
    // Generate random string
    generateRandomString: (length = 10) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Initialize services
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    themeService.initTheme();
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);
        } else {
            // User is signed out
            console.log('User is signed out');
        }
    });
});

// Export services for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        urlShortenerService,
        userProfileService,
        themeService,
        notificationService,
        storageService,
        validationService,
        utils
    };
}