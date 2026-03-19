import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC5FdLBYEG8Zsf30sI6X9hFJ_acL7amKoA",
    authDomain: "sports-9b2da.firebaseapp.com",
    projectId: "sports-9b2da",
    storageBucket: "sports-9b2da.firebasestorage.app",
    messagingSenderId: "588136709030",
    appId: "1:588136709030:web:bc1de20887f9dd4a4e2d67",
    measurementId: "G-5JRYVDV7V8"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
