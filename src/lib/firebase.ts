import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyAEPftYr9oZ-sqMyNLvMwXb9EwQGvSrL3c",
  authDomain: "spendwise-c9037.firebaseapp.com",
  projectId: "spendwise-c9037",
  storageBucket: "spendwise-c9037.firebasestorage.app",
  messagingSenderId: "704374033922",
  appId: "1:704374033922:web:766a2f41a3335a9446611b",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth() {
  if (Platform.OS === "web") {
    return FirebaseAuth.getAuth(app);
  }
  try {
    // On phones, this keeps the user logged in after closing the app.
    const getPersistence = (FirebaseAuth as any).getReactNativePersistence;
    return FirebaseAuth.initializeAuth(app, {
      persistence: getPersistence(AsyncStorage),
    });
  } catch {
    return FirebaseAuth.getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
