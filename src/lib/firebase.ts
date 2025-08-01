import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBjRxcHPf3SFjASxESWNKEvVXul_v8wujQ",
  authDomain: "vibraciones-del-alma-tkbqo.firebaseapp.com",
  projectId: "vibraciones-del-alma-tkbqo",
  storageBucket: "vibraciones-del-alma-tkbqo.appspot.com",
  messagingSenderId: "29558001332",
  appId: "1:29558001332:web:7b9a264224d88b8c9c11e1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
