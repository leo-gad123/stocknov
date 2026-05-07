import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAueb8nNqYmHy2yU-z6MKNBhg1SvMKI00A",
  authDomain: "home-d9fb3.firebaseapp.com",
  databaseURL: "https://home-d9fb3-default-rtdb.firebaseio.com",
  projectId: "home-d9fb3",
  storageBucket: "home-d9fb3.firebasestorage.app",
  messagingSenderId: "739425830376",
  appId: "1:739425830376:web:9d2379d1ddd0c579e4905d",
  measurementId: "G-XNR673SZVD",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth };
