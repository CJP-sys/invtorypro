// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDOoAtNg4UMfQftWblcsHQ9PzmBIq_YmTU",
  authDomain: "inventory-00.firebaseapp.com",
  projectId: "inventory-00",
  storageBucket: "inventory-00.firebasestorage.app",
  messagingSenderId: "394398193447",
  appId: "1:394398193447:web:4c28a9284144c91b8a7b02",
  measurementId: "G-LSM2V6ES9W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);