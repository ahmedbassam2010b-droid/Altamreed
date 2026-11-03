// config.js
// إعدادات مشروع Firebase - بوابة التمريض

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBlU_cOXeoAVFvd5ONr1e0AoJPXzc7a",
  authDomain: "bawabet-altamreed.firebaseapp.com",
  projectId: "bawabet-altamreed",
  storageBucket: "bawabet-altamreed.firebasestorage.app",
  messagingSenderId: "605431688719",
  appId: "1:605431688719:web:04b8afd365b1bf10ecbd7a",
  measurementId: "G-N0BSLZ4WDJ"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { app, auth };
