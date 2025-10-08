import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Estado de autenticación
let isLoginMode = true;
let currentUser = null;

// Elementos del DOM
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmit = document.getElementById('auth-submit');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');

// Cambiar entre login y registro
loginTab.addEventListener('click', () => {
    isLoginMode = true;
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    authSubmit.textContent = 'Iniciar Sesión';
    hideError(authError);
});

registerTab.addEventListener('click', () => {
    isLoginMode = false;
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    authSubmit.textContent = 'Crear Cuenta';
    hideError(authError);
});

// Submit del formulario de autenticación
authSubmit.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) {
        showError(authError, 'Por favor completa todos los campos');
        return;
    }

    authSubmit.disabled = true;
    authSubmit.textContent = 'Procesando...';
    hideError(authError);

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        authEmail.value = '';
        authPassword.value = '';
    } catch (error) {
        handleAuthError(error);
    } finally {
        authSubmit.disabled = false;
        authSubmit.textContent = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
    }
});

// Cerrar sesión
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Observador de cambios en la autenticación
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        showMainScreen(user);
    } else {
        showAuthScreen();
    }
});

// Mostrar pantalla principal
function showMainScreen(user) {
    authScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    userEmailSpan.textContent = user.email;
    // Disparar evento personalizado para cargar tareas
    window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: user }));
}

// Mostrar pantalla de autenticación
function showAuthScreen() {
    authScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
}

// Manejo de errores de autenticación
function handleAuthError(error) {
    let message = '';
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Este email ya está registrado';
            break;
        case 'auth/invalid-email':
            message = 'Email inválido';
            break;
        case 'auth/weak-password':
            message = 'La contraseña debe tener al menos 6 caracteres';
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            message = 'Credenciales incorrectas';
            break;
        case 'auth/too-many-requests':
            message = 'Demasiados intentos. Inténtalo más tarde';
            break;
        default:
            message = 'Error al ' + (isLoginMode ? 'iniciar sesión' : 'registrarse');
    }
    showError(authError, message);
}

// Funciones auxiliares
function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideError(element) {
    element.classList.add('hidden');
    element.textContent = '';
}

// Exportar usuario actual
export function getCurrentUser() {
    return currentUser;
}