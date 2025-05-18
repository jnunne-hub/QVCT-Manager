// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- CONFIG FIREBASE --- (Assure-toi que c'est correct)
const firebaseConfig = {
  apiKey: "AIzaSyBHKKxPs7QPBVceajWSHLma5XSxGpl_Q6w",
  authDomain: "qvct-manager-app.firebaseapp.com",
  projectId: "qvct-manager-app",
  storageBucket: "qvct-manager-app.firebasestorage.app",
  messagingSenderId: "349381960575",
  appId: "1:349381960575:web:eed97ccbecd4cd77b3704a"
};

// --- INITIALISATION FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- DOM Elements (from index.html) ---
const authContainer = document.getElementById('authContainer');
const authLoader = document.getElementById('authLoader');
const loginScreen = document.getElementById('loginScreen');
const loginBtn = document.getElementById('loginBtn');
const authErrorMessage = document.getElementById('authErrorMessage');
const unauthorizedScreen = document.getElementById('unauthorizedScreen');
const logoutUnauthorizedBtn = document.getElementById('logoutUnauthorizedBtn');
const appShell = document.getElementById('appShell');

// --- État ---
let currentFirebaseUser = null;

// --- UI State Functions for Auth ---
export function showAuthLoadingUI() {
    if (authLoader) authLoader.style.display = 'flex';
    if (loginScreen) loginScreen.style.display = 'none';
    if (unauthorizedScreen) unauthorizedScreen.style.display = 'none';
    if (appShell) appShell.style.display = 'none';
    document.body.classList.remove('app-loaded');
}

export function showLoginUI(errorMessage = "") {
    if (authLoader) authLoader.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
    if (unauthorizedScreen) unauthorizedScreen.style.display = 'none';
    if (appShell) appShell.style.display = 'none';
    if (authErrorMessage) {
        authErrorMessage.textContent = errorMessage;
        authErrorMessage.classList.toggle('error', !!errorMessage);
    }
    document.body.classList.remove('app-loaded');
    if (typeof feather !== 'undefined') feather.replace();
}

export function showUnauthorizedUI() {
    if (authLoader) authLoader.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'none';
    if (unauthorizedScreen) unauthorizedScreen.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
    document.body.classList.remove('app-loaded');
    if (typeof feather !== 'undefined') feather.replace();
}

export function showAppUI() {
    if (authLoader) authLoader.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'none';
    if (unauthorizedScreen) unauthorizedScreen.style.display = 'none';
    if (authContainer) authContainer.style.display = 'none'; // Hide the whole auth section
    
    if (appShell) appShell.style.display = 'block';
    document.body.classList.add('app-loaded');
    // Le chargement du contenu de l'app et feather.replace() sera géré par script.js
}

// --- Authorization Logic ---
async function isUserAuthorizedInFirestore(email) {
    if (!email) return false;
    const emailToCheck = email.toLowerCase(); // Normalize email
    console.log(`isUserAuthorizedInFirestore: Checking for normalized email: ${emailToCheck}`);

    try {
        const membersCollectionRef = collection(db, "members"); // Check in 'members' collection
        const q = query(membersCollectionRef, where("contact", "==", emailToCheck)); // Field is 'contact'

        const querySnapshot = await getDocs(q);
        console.log(`isUserAuthorizedInFirestore: Query for ${emailToCheck} in 'members' (field 'contact'). Found: ${querySnapshot.size} docs.`);
        querySnapshot.forEach(doc => {
            console.log("isUserAuthorizedInFirestore: Matched member doc:", doc.id, "=>", doc.data());
        });
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking user authorization in Firestore:", error);
        return false; // Default to not authorized on error
    }
}

// --- Firebase Auth State Listener ---
// This function will be called by script.js
export function listenToAuthChanges(onUserAuthenticated, onUserNotAuthenticated) {
    onAuthStateChanged(auth, async (user) => {
        showAuthLoadingUI();
        if (user) {
            currentFirebaseUser = user;
            console.log("Auth state changed: User signed in:", user.email);
            const authorized = await isUserAuthorizedInFirestore(user.email);
            if (authorized) {
                console.log("User is AUTHORIZED.");
                if (onUserAuthenticated) onUserAuthenticated(user); // Callback to script.js
            } else {
                console.warn("User is NOT AUTHORIZED in Firestore:", user.email);
                await handleSignOut(); // Sign out if not in Firestore list
                showUnauthorizedUI(); // Show unauthorized screen
            }
        } else {
            currentFirebaseUser = null;
            console.log("Auth state changed: User signed out or not signed in.");
            if (onUserNotAuthenticated) onUserNotAuthenticated(); // Callback to script.js
            showLoginUI();
        }
    });
}

// --- Sign-in and Sign-out Handlers ---
export async function handleSignIn() {
    showAuthLoadingUI();
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Google Sign-In successful via popup, user:", result.user.email);
        // onAuthStateChanged will handle the rest
    } catch (error) {
        console.error("Google Sign-In error:", error);
        let message = "Erreur de connexion. Veuillez réessayer.";
        if (error.code === 'auth/popup-closed-by-user') message = "Connexion annulée.";
        else if (error.code === 'auth/network-request-failed') message = "Problème de réseau. Vérifiez votre connexion.";
        showLoginUI(message);
    }
}

export async function handleSignOut() {
    if (!currentFirebaseUser) { // If already signed out, just ensure UI is correct
        showLoginUI();
        if(authContainer) authContainer.style.display = 'block';
        return;
    }
    showAuthLoadingUI();
    try {
        await signOut(auth);
        console.log("Sign-out successful.");
        // onAuthStateChanged will handle UI update to login screen
        if(authContainer) authContainer.style.display = 'block'; // Ensure auth section is visible
    } catch (error) {
        console.error("Sign-out error:", error);
        showLoginUI("Erreur lors de la déconnexion.");
        if(authContainer) authContainer.style.display = 'block';
    }
}

// --- Utility to get current user (if needed by other modules) ---
export function getCurrentUser() {
    return currentFirebaseUser;
}
// --- Utility to get Firestore DB instance (if needed by other modules) ---
export function getDb() {
    return db;
}


// Initial event listeners for auth buttons (can be moved to script.js if preferred for consistency)
if (loginBtn) loginBtn.addEventListener('click', handleSignIn);
if (logoutUnauthorizedBtn) logoutUnauthorizedBtn.addEventListener('click', handleSignOut);