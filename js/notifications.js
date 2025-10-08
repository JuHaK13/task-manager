// Sistema de notificaciones y recordatorios

let notificationPermission = false;

// Solicitar permiso para notificaciones
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Este navegador no soporta notificaciones');
        return false;
    }

    if (Notification.permission === 'granted') {
        notificationPermission = true;
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        notificationPermission = permission === 'granted';
        return notificationPermission;
    }

    return false;
}

// Verificar si hay permiso
export function hasNotificationPermission() {
    return notificationPermission || Notification.permission === 'granted';
}

// Mostrar notificación
export function showNotification(title, options = {}) {
    if (!hasNotificationPermission()) {
        console.log('No hay permiso para mostrar notificaciones');
        return;
    }

    const defaultOptions = {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">✓</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">📝</text></svg>',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        ...options
    };

    const notification = new Notification(title, defaultOptions);
    
    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    return notification;
}

// Obtener configuración de recordatorios del usuario
export function getReminderSettings(userId) {
    const settings = localStorage.getItem(`reminder_settings_${userId}`);
    return settings ? JSON.parse(settings) : {
        enabled: false,
        hours: 1, // Horas antes de la tarea
        dailyReminder: false,
        dailyTime: '09:00' // Hora del recordatorio diario
    };
}

// Guardar configuración de recordatorios
export function saveReminderSettings(userId, settings) {
    localStorage.setItem(`reminder_settings_${userId}`, JSON.stringify(settings));
}

// Programar recordatorio para una tarea
export function scheduleTaskReminder(task, hoursBefor) {
    if (!hasNotificationPermission()) return;

    const taskDate = new Date(task.date);
    const now = new Date();
    
    // Calcular cuando debe sonar el recordatorio
    const reminderTime = new Date(taskDate);
    reminderTime.setHours(9, 0, 0, 0); // Asumimos que es a las 9 AM del día
    reminderTime.setHours(reminderTime.getHours() - hoursBefor);

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    if (timeUntilReminder > 0 && timeUntilReminder < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
            showNotification('Recordatorio de tarea', {
                body: `Tienes pendiente: ${task.title}`,
                tag: `task-${task.id}`
            });
        }, timeUntilReminder);
    }
}

// Programar recordatorio diario
export function scheduleDailyReminder(userId, time, tasks) {
    if (!hasNotificationPermission()) return;

    const [hours, minutes] = time.split(':');
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Si ya pasó la hora hoy, programar para mañana
    if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(t => t.date === today && !t.completed);
        
        if (todayTasks.length > 0) {
            showNotification('Tareas pendientes para hoy', {
                body: `Tienes ${todayTasks.length} tarea(s) pendiente(s)`,
                tag: 'daily-reminder'
            });
        }

        // Reprogramar para el día siguiente
        scheduleDailyReminder(userId, time, tasks);
    }, timeUntilReminder);
}

// Inicializar sistema de recordatorios
export function initializeReminders(userId, tasks) {
    const settings = getReminderSettings(userId);
    
    if (settings.enabled) {
        // Programar recordatorios individuales de tareas
        const today = new Date().toISOString().split('T')[0];
        const upcomingTasks = tasks.filter(t => t.date >= today && !t.completed);
        
        upcomingTasks.forEach(task => {
            scheduleTaskReminder(task, settings.hours);
        });
    }

    if (settings.dailyReminder) {
        scheduleDailyReminder(userId, settings.dailyTime, tasks);
    }
}