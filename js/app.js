import { getCurrentUser } from './auth.js';
import { 
    createTask,
    getUserTasks,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    moveUncompletedTasks
} from './tasks.js';
import {
    requestNotificationPermission,
    getReminderSettings,
    saveReminderSettings,
    initializeReminders,
    scheduleTaskReminder
} from './notifications.js';
import {
    changePassword,
    deleteAccount
} from './account-settings.js';

// Estado global
let allTasks = [];
let selectedDate = new Date().toISOString().split('T')[0];
let currentSort = 'recent-desc';

// Elementos del DOM
const dateSelector = document.getElementById('date-selector');
const tasksContainer = document.getElementById('tasks-container');
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const closeModal = document.getElementById('close-modal');
const taskTitle = document.getElementById('task-title');
const taskDescription = document.getElementById('task-description');
const taskImportance = document.getElementById('task-importance');
const taskDate = document.getElementById('task-date');
const addSingleTask = document.getElementById('add-single-task');
const addWeekTasks = document.getElementById('add-week-tasks');
const modalError = document.getElementById('modal-error');
const mainError = document.getElementById('main-error');
const loading = document.getElementById('loading');
const sortSelector = document.getElementById('sort-tasks');

// Elementos de configuración
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const modalTabs = document.querySelectorAll('.modal-tab');
const settingsTabs = document.querySelectorAll('.settings-tab');
const enableReminders = document.getElementById('enable-reminders');
const reminderHours = document.getElementById('reminder-hours');
const enableDailyReminder = document.getElementById('enable-daily-reminder');
const dailyReminderTime = document.getElementById('daily-reminder-time');
const saveNotifications = document.getElementById('save-notifications');
const currentPassword = document.getElementById('current-password');
const newPassword = document.getElementById('new-password');
const confirmPassword = document.getElementById('confirm-password');
const changePasswordBtn = document.getElementById('change-password-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const settingsError = document.getElementById('settings-error');

// Verificar que los elementos críticos existan
if (!dateSelector || !tasksContainer || !addTaskBtn) {
    console.error('Error: Elementos del DOM no encontrados');
}

// Inicializar fecha
if (dateSelector && taskDate) {
    dateSelector.value = selectedDate;
    dateSelector.min = selectedDate;
    taskDate.value = selectedDate;
    taskDate.min = selectedDate;
}

// Event Listeners básicos
dateSelector.addEventListener('change', (e) => {
    selectedDate = e.target.value;
    renderTasks();
});

sortSelector.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderTasks();
});

addTaskBtn.addEventListener('click', () => {
    taskModal.classList.remove('hidden');
    taskDate.value = selectedDate;
});

closeModal.addEventListener('click', () => {
    closeTaskModal();
});

taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        closeTaskModal();
    }
});

addSingleTask.addEventListener('click', async () => {
    await handleAddTask(false);
});

addWeekTasks.addEventListener('click', async () => {
    await handleAddTask(true);
});

// Event Listeners de configuración
settingsBtn.addEventListener('click', () => {
    loadSettingsData();
    settingsModal.classList.remove('hidden');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    hideError(settingsError);
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
        hideError(settingsError);
    }
});

modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        switchTab(tabName);
    });
});

saveNotifications.addEventListener('click', handleSaveNotifications);
changePasswordBtn.addEventListener('click', handleChangePassword);
deleteAccountBtn.addEventListener('click', handleDeleteAccount);

// Escuchar cuando el usuario se autentica
window.addEventListener('userAuthenticated', async (e) => {
    try {
        await requestNotificationPermission();
        await loadTasks();
        await checkAndMoveUncompletedTasks();
        const user = getCurrentUser();
        if (user) {
            initializeReminders(user.uid, allTasks);
        }
    } catch (error) {
        console.error('Error durante la autenticación:', error);
    }
});

// Cargar tareas del usuario
async function loadTasks() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        showLoading(true);
        hideError(mainError);
        allTasks = await getUserTasks(user.uid);
        renderTasks();
    } catch (error) {
        showError(mainError, 'Error al cargar las tareas');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Verificar y mover tareas no completadas
async function checkAndMoveUncompletedTasks() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        await moveUncompletedTasks(user.uid, yesterday, today);
        await loadTasks();
    } catch (error) {
        console.error('Error al mover tareas no completadas:', error);
    }
}

// Añadir tarea(s)
async function handleAddTask(isWeek) {
    const title = taskTitle.value.trim();
    const description = taskDescription.value.trim();
    const importance = taskImportance.value;
    const date = taskDate.value;

    if (!title) {
        showError(modalError, 'El título es obligatorio');
        return;
    }

    const user = getCurrentUser();
    if (!user) return;

    try {
        addSingleTask.disabled = true;
        addWeekTasks.disabled = true;
        hideError(modalError);

        if (isWeek) {
            const promises = [];
            for (let i = 0; i < 7; i++) {
                const taskDate = new Date();
                taskDate.setDate(taskDate.getDate() + i);
                const dateStr = taskDate.toISOString().split('T')[0];
                
                promises.push(createTask(user.uid, {
                    title,
                    description,
                    importance,
                    date: dateStr
                }));
            }
            const newTasks = await Promise.all(promises);
            allTasks.push(...newTasks);
            
            // Programar recordatorios para las nuevas tareas
            const settings = getReminderSettings(user.uid);
            if (settings.enabled) {
                newTasks.forEach(task => scheduleTaskReminder(task, settings.hours));
            }
        } else {
            const newTask = await createTask(user.uid, {
                title,
                description,
                importance,
                date
            });
            allTasks.push(newTask);
            
            // Programar recordatorio
            const settings = getReminderSettings(user.uid);
            if (settings.enabled) {
                scheduleTaskReminder(newTask, settings.hours);
            }
        }

        renderTasks();
        closeTaskModal();
    } catch (error) {
        showError(modalError, 'Error al crear la tarea');
        console.error(error);
    } finally {
        addSingleTask.disabled = false;
        addWeekTasks.disabled = false;
    }
}

// Alternar tarea completada
async function handleToggleTask(taskId, completed) {
    try {
        await toggleTaskComplete(taskId, completed);
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            renderTasks();
        }
    } catch (error) {
        showError(mainError, 'Error al actualizar la tarea');
        console.error(error);
    }
}

// Eliminar tarea
async function handleDeleteTask(taskId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
        return;
    }

    try {
        await deleteTask(taskId);
        allTasks = allTasks.filter(t => t.id !== taskId);
        renderTasks();
    } catch (error) {
        showError(mainError, 'Error al eliminar la tarea');
        console.error(error);
    }
}

// Ordenar tareas
function sortTasks(tasks) {
    const importanceOrder = { 'Importante': 3, 'Medio': 2, 'Nada': 1 };
    
    return tasks.sort((a, b) => {
        switch (currentSort) {
            case 'recent-desc':
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            case 'recent-asc':
                return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
            case 'importance-desc':
                return importanceOrder[b.importance] - importanceOrder[a.importance];
            case 'importance-asc':
                return importanceOrder[a.importance] - importanceOrder[b.importance];
            case 'completed':
                return b.completed - a.completed;
            case 'pending':
                return a.completed - b.completed;
            default:
                return 0;
        }
    });
}

// Renderizar tareas
function renderTasks() {
    const todayTasks = allTasks.filter(task => task.date === selectedDate);
    const sortedTasks = sortTasks([...todayTasks]);
    
    if (sortedTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <p>No hay tareas para este día</p>
                <small>Añade una nueva tarea para comenzar</small>
            </div>
        `;
        return;
    }

    tasksContainer.innerHTML = sortedTasks.map(task => createTaskHTML(task)).join('');
    
    sortedTasks.forEach(task => {
        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
        if (!taskElement) return;

        const checkbox = taskElement.querySelector('.task-checkbox');
        const deleteBtn = taskElement.querySelector('.task-delete');

        checkbox.addEventListener('click', () => {
            handleToggleTask(task.id, !task.completed);
        });

        deleteBtn.addEventListener('click', () => {
            handleDeleteTask(task.id);
        });
    });
}

// Crear HTML de una tarea
function createTaskHTML(task) {
    const importanceClass = task.importance.toLowerCase();
    const completedClass = task.completed ? 'completed' : '';
    const taskCompletedClass = task.completed ? 'task-completed' : '';
    const checkSvg = task.completed ? `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ` : '';

    return `
        <div class="task-item importance-${importanceClass} ${taskCompletedClass}" data-task-id="${task.id}">
            <div class="task-left">
                <div class="task-checkbox ${completedClass}">
                    ${checkSvg}
                </div>
                <div class="task-content">
                    <h3 class="task-title ${completedClass}">${escapeHtml(task.title)}</h3>
                    ${task.description ? `<p class="task-description ${completedClass}">${escapeHtml(task.description)}</p>` : ''}
                    <span class="task-badge ${importanceClass}">${task.importance}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// Cargar datos de configuración
function loadSettingsData() {
    const user = getCurrentUser();
    if (!user) return;

    const settings = getReminderSettings(user.uid);
    enableReminders.checked = settings.enabled;
    reminderHours.value = settings.hours;
    enableDailyReminder.checked = settings.dailyReminder;
    dailyReminderTime.value = settings.dailyTime;
}

// Cambiar entre tabs
function switchTab(tabName) {
    modalTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    settingsTabs.forEach(tab => {
        if (tab.id === `${tabName}-tab`) {
            tab.classList.remove('hidden');
        } else {
            tab.classList.add('hidden');
        }
    });
}

// Guardar configuración de notificaciones
async function handleSaveNotifications() {
    const user = getCurrentUser();
    if (!user) return;

    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission && enableReminders.checked) {
        showError(settingsError, 'Debes permitir las notificaciones en tu navegador');
        return;
    }

    const settings = {
        enabled: enableReminders.checked,
        hours: parseFloat(reminderHours.value),
        dailyReminder: enableDailyReminder.checked,
        dailyTime: dailyReminderTime.value
    };

    saveReminderSettings(user.uid, settings);
    initializeReminders(user.uid, allTasks);
    
    showError(settingsError, '✅ Configuración guardada correctamente');
    setTimeout(() => hideError(settingsError), 3000);
}

// Cambiar contraseña
async function handleChangePassword() {
    const current = currentPassword.value;
    const newPass = newPassword.value;
    const confirm = confirmPassword.value;

    if (!current || !newPass || !confirm) {
        showError(settingsError, 'Completa todos los campos');
        return;
    }

    if (newPass !== confirm) {
        showError(settingsError, 'Las contraseñas no coinciden');
        return;
    }

    if (newPass.length < 6) {
        showError(settingsError, 'La contraseña debe tener al menos 6 caracteres');
        return;
    }

    try {
        changePasswordBtn.disabled = true;
        changePasswordBtn.textContent = 'Cambiando...';
        hideError(settingsError);

        await changePassword(current, newPass);
        
        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        
        showError(settingsError, '✅ Contraseña cambiada correctamente');
        settingsError.style.background = '#D1FAE5';
        settingsError.style.borderColor = '#6EE7B7';
        settingsError.style.color = '#065F46';
        
        setTimeout(() => {
            hideError(settingsError);
            settingsError.style.background = '';
            settingsError.style.borderColor = '';
            settingsError.style.color = '';
        }, 3000);
    } catch (error) {
        showError(settingsError, error.message);
    } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.textContent = 'Cambiar contraseña';
    }
}

// Eliminar cuenta
async function handleDeleteAccount() {
    const password = prompt('⚠️ ADVERTENCIA: Esta acción es irreversible.\n\nPara confirmar, introduce tu contraseña:');
    
    if (!password) return;

    const confirm = window.confirm('¿Estás completamente seguro? Se eliminarán todos tus datos permanentemente.');
    
    if (!confirm) return;

    try {
        deleteAccountBtn.disabled = true;
        deleteAccountBtn.textContent = 'Eliminando...';
        hideError(settingsError);

        await deleteAccount(password);
        
        // El usuario será redirigido automáticamente al login por auth.js
    } catch (error) {
        showError(settingsError, error.message);
        deleteAccountBtn.disabled = false;
        deleteAccountBtn.textContent = 'Eliminar cuenta permanentemente';
    }
}

// Cerrar modal de tareas
function closeTaskModal() {
    if (taskModal) {
        taskModal.classList.add('hidden');
    }
    if (taskTitle) taskTitle.value = '';
    if (taskDescription) taskDescription.value = '';
    if (taskImportance) taskImportance.value = 'Medio';
    if (taskDate) taskDate.value = selectedDate;
    hideError(modalError);
}

// Funciones auxiliares
function showLoading(show) {
    if (!loading || !tasksContainer) return;
    
    if (show) {
        loading.classList.remove('hidden');
        tasksContainer.classList.add('hidden');
    } else {
        loading.classList.add('hidden');
        tasksContainer.classList.remove('hidden');
    }
}

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideError(element) {
    if (!element) return;
    element.classList.add('hidden');
    element.textContent = '';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}