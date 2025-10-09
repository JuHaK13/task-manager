import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuración de Firebase
// Los valores se reemplazan automáticamente durante el despliegue
const firebaseConfig = {
    apiKey: "AIzaSyDAoIXKkY44gX8hQUuyC5rnwrDXaC422PE",
    authDomain: "tasks-10bdf.firebaseapp.com",
    projectId: "tasks-10bdf",
    storageBucket: "tasks-10bdf.firebasestorage.app",
    messagingSenderId: "386633277183",
    appId: "1:386633277183:web:1ae661b120927ea5c176ca"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);