import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getAuth, type Auth } from "firebase/auth";

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

let _app: FirebaseApp | null = null;
let _db: Database | null = null;
let _auth: Auth | null = null;

function getFirebaseApp() {
  if (!_app) {
    _app = initializeApp(firebaseConfig);
  }
  return _app;
}

function getDb() {
  if (!_db) {
    _db = getDatabase(getFirebaseApp());
  }
  return _db;
}

function getFirebaseAuth() {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

// Use getters to lazily initialize (avoids SSR issues)
export const app = typeof window !== "undefined" ? getFirebaseApp() : (null as unknown as FirebaseApp);
export const db = typeof window !== "undefined" ? getDb() : (null as unknown as Database);
export const auth = typeof window !== "undefined" ? getFirebaseAuth() : (null as unknown as Auth);
