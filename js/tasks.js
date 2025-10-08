import { db } from './firebase-config.js';
import { 
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const TASKS_COLLECTION = 'tasks';

// Crear una nueva tarea
export async function createTask(userId, taskData) {
    try {
        const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
            ...taskData,
            userId,
            completed: false,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...taskData, completed: false };
    } catch (error) {
        console.error('Error al crear tarea:', error);
        throw error;
    }
}

// Obtener todas las tareas de un usuario
export async function getUserTasks(userId) {
    try {
        const q = query(
            collection(db, TASKS_COLLECTION),
            where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const tasks = [];
        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        return tasks;
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        throw error;
    }
}

// Actualizar una tarea
export async function updateTask(taskId, updates) {
    try {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        throw error;
    }
}

// Eliminar una tarea
export async function deleteTask(taskId) {
    try {
        await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        throw error;
    }
}

// Alternar estado completado de una tarea
export async function toggleTaskComplete(taskId, completed) {
    try {
        await updateTask(taskId, { completed });
    } catch (error) {
        console.error('Error al cambiar estado de tarea:', error);
        throw error;
    }
}

// Mover tareas no completadas al día siguiente
export async function moveUncompletedTasks(userId, fromDate, toDate) {
    try {
        const q = query(
            collection(db, TASKS_COLLECTION),
            where('userId', '==', userId),
            where('date', '==', fromDate),
            where('completed', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        const promises = [];
        
        querySnapshot.forEach((document) => {
            const taskData = document.data();
            promises.push(
                createTask(userId, {
                    title: taskData.title,
                    description: taskData.description || '',
                    importance: taskData.importance,
                    date: toDate
                })
            );
        });
        
        await Promise.all(promises);
    } catch (error) {
        console.error('Error al mover tareas:', error);
        throw error;
    }
}