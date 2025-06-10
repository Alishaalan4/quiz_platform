// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBrNBT8RVNeOvcl575ZEDZjcXzXATuYDsQ",
  authDomain: "quiz-platform-6c415.firebaseapp.com",
  projectId: "quiz-platform-6c415",
  storageBucket: "quiz-platform-6c415.firebasestorage.app",
  messagingSenderId: "639261071964",
  appId: "1:639261071964:web:f61baf944bbd3099bb6499",
  measurementId: "G-HF526SVGT1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);