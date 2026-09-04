let tasks = [];
let nextId = 1;

const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const errorMessage = document.getElementById('errorMessage');

function clearError() {
  errorMessage.textContent = '';
}

function showError(message) {
  errorMessage.textContent = message;
}

function validateTask(taskName, taskDate) {
  const trimmed = taskName.trim();

  if (!trimmed) {
    return 'La tarea no puede estar vacía.';
  }

  if (trimmed.length < 3) {
    return 'La tarea debe tener al menos 3 caracteres.';
  }

  if (trimmed.length > 120) {
    return 'La tarea no puede exceder 120 caracteres.';
  }

  const invalidCharacters = /[<>]/;
  if (invalidCharacters.test(trimmed)) {
    return 'La tarea contiene caracteres no válidos.';
  }

  if (taskDate) {
    const selectedDate = new Date(`${taskDate}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      return 'La fecha ingresada no es válida.';
    }
  }

  return '';
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Sin fecha límite';
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isTaskOverdue(task) {
  if (task.completed || !task.dueDate) {
    return false;
  }

  const dueDate = new Date(`${task.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function crearTarea(event) {
  event.preventDefault();

  const taskName = taskInput.value;
  const taskDate = dueDateInput.value;
  const validationError = validateTask(taskName, taskDate);

  if (validationError) {
    showError(validationError);
    return;
  }

  tasks.push({
    id: nextId,
    title: taskName.trim(),
    dueDate: taskDate,
    completed: false,
  });

  nextId += 1;
  taskInput.value = '';
  dueDateInput.value = '';
  clearError();
  mostrarTareas();
}

function mostrarTareas() {
  taskList.innerHTML = '';
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'}`;

  if (tasks.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No hay tareas registradas aún.';
    taskList.appendChild(emptyItem);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement('li');
    const overdue = isTaskOverdue(task);
    item.className = `task ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`;

    const taskMain = document.createElement('div');
    taskMain.className = 'task-main';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Marcar la tarea como ${task.completed ? 'pendiente' : 'completada'}`);
    checkbox.addEventListener('change', () => completarTarea(task.id));

    const content = document.createElement('div');
    content.className = 'task-content';

    const text = document.createElement('span');
    text.className = 'task-text';
    text.innerHTML = escapeHtml(task.title);

    const dateTag = document.createElement('small');
    dateTag.className = `due-date ${overdue ? 'overdue' : ''}`;
    dateTag.textContent = `Fecha límite: ${formatDate(task.dueDate)}`;

    content.appendChild(text);
    content.appendChild(dateTag);

    taskMain.appendChild(checkbox);
    taskMain.appendChild(content);

    const taskActions = document.createElement('div');
    taskActions.className = 'task-actions';

    const status = document.createElement('span');
    status.className = `status ${task.completed ? 'done' : overdue ? 'overdue' : 'pending'}`;
    status.textContent = task.completed ? 'Completada' : overdue ? 'Retrasada' : 'Pendiente';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = 'Eliminar';
    deleteButton.addEventListener('click', () => eliminarTarea(task.id));

    taskActions.appendChild(status);
    taskActions.appendChild(deleteButton);

    item.appendChild(taskMain);
    item.appendChild(taskActions);
    taskList.appendChild(item);
  });
}

function completarTarea(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  task.completed = !task.completed;
  mostrarTareas();
}

function eliminarTarea(id) {
  tasks = tasks.filter((task) => task.id !== id);
  mostrarTareas();
}

taskForm.addEventListener('submit', crearTarea);

mostrarTareas();