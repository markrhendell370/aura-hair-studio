import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBUwARR2QRgd-NOhuLJPBKXSzmq-Rt9cd8",
  authDomain: "aura-hair-studio-a13e1.firebaseapp.com",
  databaseURL: "https://aura-hair-studio-a13e1-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "aura-hair-studio-a13e1",
  storageBucket: "aura-hair-studio-a13e1.firebasestorage.app",
  messagingSenderId: "72075304715",
  appId: "1:72075304715:web:ded49e67b0844e52b60c0e",
  measurementId: "G-SHJRN0N7W1"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
