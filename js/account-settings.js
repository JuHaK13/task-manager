import { auth, db } from './firebase-config.js';
import { 
    updatePassword,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Cambiar contraseña
export async function changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado');

    try {
        // Reautenticar usuario antes de cambiar contraseña
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Cambiar contraseña
        await updatePassword(user, newPassword);
        return { success: true };
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        let message = 'Error al cambiar la contraseña';
        
        switch (error.code) {
            case 'auth/wrong-password':
                message = 'La contraseña actual es incorrecta';
                break;
            case 'auth/weak-password':
                message = 'La nueva contraseña debe tener al menos 6 caracteres';
                break;
            case 'auth/requires-recent-login':
                message = 'Por seguridad, debes volver a iniciar sesión';
                break;
        }
        
        throw new Error(message);
    }
}

// Eliminar todas las tareas del usuario
async function deleteAllUserTasks(userId) {
    try {
        const q = query(
            collection(db, 'tasks'),
            where('userId', '==', userId)
        );
        
        const querySnapshot = await getDocs(q);
        const deletePromises = [];
        
        querySnapshot.forEach((doc) => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error al eliminar tareas:', error);
        throw error;
    }
}

// Eliminar cuenta de usuario
export async function deleteAccount(password) {
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado');

    try {
        // Reautenticar usuario
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        
        // Eliminar todas las tareas del usuario
        await deleteAllUserTasks(user.uid);
        
        // Eliminar configuraciones locales
        localStorage.removeItem(`tasks_${user.uid}`);
        localStorage.removeItem(`reminder_settings_${user.uid}`);
        
        // Eliminar cuenta
        await deleteUser(user);
        
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        let message = 'Error al eliminar la cuenta';
        
        switch (error.code) {
            case 'auth/wrong-password':
                message = 'Contraseña incorrecta';
                break;
            case 'auth/requires-recent-login':
                message = 'Por seguridad, debes volver a iniciar sesión';
                break;
        }
        
        throw new Error(message);
    }
}