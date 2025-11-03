// Firebase Authentication configuration
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Authentication service
const authService = {
    // Sign up with email and password
    signUp: (email, password, displayName) => {
        return firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Update display name
                return userCredential.user.updateProfile({
                    displayName: displayName
                }).then(() => {
                    // Save additional user data to database
                    return firebase.database().ref(`users/${userCredential.user.uid}`).set({
                        name: displayName,
                        email: email,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    });
                }).then(() => {
                    return userCredential.user;
                });
            });
    },
    
    // Sign in with email and password
    signIn: (email, password) => {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    },
    
    // Sign in with Google
    signInWithGoogle: () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        return firebase.auth().signInWithPopup(provider)
            .then(result => {
                // Check if this is a new user
                if (result.additionalUserInfo.isNewUser) {
                    // Save additional user data to database
                    const user = result.user;
                    return firebase.database().ref(`users/${user.uid}`).set({
                        name: user.displayName,
                        email: user.email,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => {
                        return result.user;
                    });
                }
                return result.user;
            });
    },
    
    // Sign in with GitHub
    signInWithGitHub: () => {
        const provider = new firebase.auth.GithubAuthProvider();
        return firebase.auth().signInWithPopup(provider)
            .then(result => {
                // Check if this is a new user
                if (result.additionalUserInfo.isNewUser) {
                    // Save additional user data to database
                    const user = result.user;
                    return firebase.database().ref(`users/${user.uid}`).set({
                        name: user.displayName,
                        email: user.email,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => {
                        return result.user;
                    });
                }
                return result.user;
            });
    },
    
    // Sign out
    signOut: () => {
        return firebase.auth().signOut();
    },
    
    // Send password reset email
    resetPassword: (email) => {
        return firebase.auth().sendPasswordResetEmail(email);
    },
    
    // Update password
    updatePassword: (newPassword) => {
        const user = firebase.auth().currentUser;
        return user.updatePassword(newPassword);
    },
    
    // Update profile
    updateProfile: (profileData) => {
        const user = firebase.auth().currentUser;
        return user.updateProfile(profileData);
    },
    
    // Get current user
    getCurrentUser: () => {
        return firebase.auth().currentUser;
    },
    
    // Listen to auth state changes
    onAuthStateChanged: (callback) => {
        return firebase.auth().onAuthStateChanged(callback);
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
}