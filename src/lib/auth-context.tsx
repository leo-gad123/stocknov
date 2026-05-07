import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db } from "./firebase";

export type UserRole = "admin" | "standard";

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (email: string, password: string, role: UserRole, displayName: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const snap = await get(ref(db, `users/${fbUser.uid}`));
        if (snap.exists()) {
          const data = snap.val();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            role: data.role || "standard",
            displayName: data.displayName || fbUser.email,
          });
        } else {
          // First user ever = admin
          const userData = {
            email: fbUser.email,
            role: "admin" as UserRole,
            displayName: fbUser.email,
            createdAt: Date.now(),
          };
          await set(ref(db, `users/${fbUser.uid}`), userData);
          setUser({ uid: fbUser.uid, email: fbUser.email ?? undefined, role: userData.role, displayName: userData.displayName ?? undefined });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const createUser = async (email: string, password: string, role: UserRole, displayName: string) => {
    // Save current user credentials
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Must be logged in");

    // We need to create the user via a workaround since Firebase client SDK
    // signs in as the new user. We'll create, save data, then the admin
    // will need to re-login. Alternative: use Firebase Admin SDK.
    // For client-side, we'll use a secondary app instance.
    const { initializeApp, deleteApp } = await import("firebase/app");
    const { getAuth: getAuth2, createUserWithEmailAndPassword: create2 } = await import("firebase/auth");
    
    const secondaryApp = initializeApp(
      {
        apiKey: "AIzaSyAueb8nNqYmHy2yU-z6MKNBhg1SvMKI00A",
        authDomain: "home-d9fb3.firebaseapp.com",
        databaseURL: "https://home-d9fb3-default-rtdb.firebaseio.com",
        projectId: "home-d9fb3",
        storageBucket: "home-d9fb3.firebasestorage.app",
        messagingSenderId: "739425830376",
        appId: "1:739425830376:web:9d2379d1ddd0c579e4905d",
      },
      "Secondary"
    );
    
    try {
      const secondaryAuth = getAuth2(secondaryApp);
      const cred = await create2(secondaryAuth, email, password);
      await set(ref(db, `users/${cred.user.uid}`), {
        email,
        role,
        displayName,
        createdAt: Date.now(),
        createdBy: currentUser.uid,
      });
      await secondaryAuth.signOut();
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, login, logout, createUser, isAdmin: user?.role === "admin" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
