import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAXn_OpRpcD8-ZVcgScqcxg-GzquN2Qk0U",
  authDomain: "cricket-app-54fea.firebaseapp.com",
  projectId: "cricket-app-54fea",
  storageBucket: "cricket-app-54fea.firebasestorage.app",
  messagingSenderId: "806125625113",
  appId: "1:806125625113:web:3d4c27bae60f0d871c2f88",
  measurementId: "G-1H3SMWTQT1",
  databaseURL: "https://cricket-app-54fea-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase only if it hasn't been initialized already (important for Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
