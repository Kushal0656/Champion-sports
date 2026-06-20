import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCWlFEGpitGuhx7ZAdTmFXV_UV72O_8HOs",
  authDomain: "champion-sports.firebaseapp.com",
  projectId: "champion-sports",
  storageBucket: "champion-sports.firebasestorage.app",
  messagingSenderId: "327761052374",
  appId: "1:327761052374:web:c2e35ad2e45d19ffd57f77",
  measurementId: "G-2H6C716HZ2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;