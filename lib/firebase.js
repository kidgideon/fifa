// firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHiq2HY7TJtAx0-OsAohn6bx2wFipv61c",
  authDomain: "fifa-935e7.firebaseapp.com",
  projectId: "fifa-935e7",
  storageBucket: "fifa-935e7.appspot.app",
  messagingSenderId: "342677069011",
  appId: "1:342677069011:web:cd50565e293cda022f0826",
  measurementId: "G-X0Z9T6K67Q",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Export the app and services
export { app, analytics, db, auth, storage };
