import { getCurrentUser } from './auth.js';
import { 
    createTask,
    getUserTasks,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    moveUncompletedTasks
} from './tasks.js';

// Estado global
let allTasks = [];
let selectedDate = new Date().toISOString().split('T')[0];

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

// Inicializar fecha
dateSelector.value = selectedDate;
dateSelector.min = selectedDate;
taskDate.value = selectedDate;
taskDate.min = selectedDate;

// Event Listeners
dateSelector.addEventListener('change', (e) => {
    selectedDate = e.target.value;
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

// Escuchar cuando el usuario se autentica
window.addEventListener('userAuthenticated', async (e) => {
    await loadTasks();
    await checkAndMoveUncompletedTasks();
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
            // Añadir tarea para 7 días
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
        } else {
            // Añadir una sola tarea
            const newTask = await createTask(user.uid, {
                title,
                description,
                importance,
                date
            });
            allTasks.push(newTask);
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

// Renderizar tareas
function renderTasks() {
    const todayTasks = allTasks.filter(task => task.date === selectedDate);
    
    if (todayTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <p>No hay tareas para este día</p>
                <small>Añade una nueva tarea para comenzar</small>
            </div>
        `;
        return;
    }

    tasksContainer.innerHTML = todayTasks.map(task => createTaskHTML(task)).join('');
    
    // Añadir event listeners a los elementos de tarea
    todayTasks.forEach(task => {
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
    const checkSvg = task.completed ? `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ` : '';

    return `
        <div class="task-item importance-${importanceClass}" data-task-id="${task.id}">
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

// Cerrar modal
function closeTaskModal() {
    taskModal.classList.add('hidden');
    taskTitle.value = '';
    taskDescription.value = '';
    taskImportance.value = 'Medio';
    taskDate.value = selectedDate;
    hideError(modalError);
}

// Funciones auxiliares
function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
        tasksContainer.classList.add('hidden');
    } else {
        loading.classList.add('hidden');
        tasksContainer.classList.remove('hidden');
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => {
        hideError(element);
    }, 5000);
}

function hideError(element) {
    element.classList.add('hidden');
    element.textContent = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}