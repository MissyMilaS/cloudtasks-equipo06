let tasks = [];
let nextId = 1;

const taskForm = document.getElementById('taskForm');
const titleInput = document.getElementById('titleInput');
const descriptionInput = document.getElementById('descriptionInput');
const deadlineInput = document.getElementById('deadlineInput');
const priorityInput = document.getElementById('priorityInput');
const statusInput = document.getElementById('statusInput');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const errorMessage = document.getElementById('errorMessage');

function clearError() {
  errorMessage.textContent = '';
}

function showError(message) {
  errorMessage.textContent = message;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const STATUS_ORDER = {
  Iniciado: 0,
  'En proceso': 1,
  Pendiente: 2,
  Finalizada: 3,
  'Sin completar': 4,
};

function getTaskStatus(task) {
  if (task.completed) {
    return 'Finalizada';
  }

  if (task.deadline && new Date(`${task.deadline}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0))) {
    return 'Sin completar';
  }

  return task.status || 'Pendiente';
}

function getStatusLabel(task) {
  return getTaskStatus(task);
}

function validateTask(taskData) {
  const title = taskData.title.trim();
  const description = taskData.description.trim();
  const priority = taskData.priority;
  const deadline = taskData.deadline;
  const status = taskData.status;

  if (!title) {
    return 'El título es obligatorio.';
  }

  if (title.length < 3 || title.length > 80) {
    return 'El título debe tener entre 3 y 80 caracteres.';
  }

  if (!description) {
    return 'La descripción es obligatoria.';
  }

  if (description.length < 5 || description.length > 250) {
    return 'La descripción debe tener entre 5 y 250 caracteres.';
  }

  if (!priority) {
    return 'Debes seleccionar una prioridad.';
  }

  if (!status) {
    return 'Debes seleccionar un estado.';
  }

  if (!deadline) {
    return 'La fecha límite es obligatoria.';
  }

  const selectedDate = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(selectedDate.getTime())) {
    return 'La fecha límite ingresada no es válida.';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return 'La fecha límite no puede ser anterior a hoy.';
  }

  return '';
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

function formatDateTime(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isTaskOverdue(task) {
  if (task.completed || !task.deadline) {
    return false;
  }

  const deadlineDate = new Date(`${task.deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deadlineDate < today;
}

function sortTasks() {
  const priorityOrder = {
    alta: 0,
    media: 1,
    baja: 2,
  };

  tasks.sort((a, b) => {
    const priorityDifference =
      (priorityOrder[a.priority.toLowerCase()] ?? 99) -
      (priorityOrder[b.priority.toLowerCase()] ?? 99);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const statusDifference =
      (STATUS_ORDER[getTaskStatus(a)] ?? 99) -
      (STATUS_ORDER[getTaskStatus(b)] ?? 99);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const dateDifference = new Date(a.deadline) - new Date(b.deadline);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return new Date(a.created_at) - new Date(b.created_at);
  });
}

function mostrarTareas() {
  sortTasks();
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
    const overdue = getTaskStatus(task) === 'Sin completar';
    item.className = `task ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`;

    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';

    const taskHeader = document.createElement('div');
    taskHeader.className = 'task-header';

    const title = document.createElement('h3');
    title.className = 'task-title';
    title.textContent = escapeHtml(task.title);

    const priority = document.createElement('span');
    const priorityText = task.priority.toLowerCase();
    priority.className = `priority ${priorityText}`;
    priority.textContent = task.priority;

    taskHeader.appendChild(title);
    taskHeader.appendChild(priority);

    const description = document.createElement('p');
    description.className = 'task-description';
    description.textContent = task.description;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const idMeta = document.createElement('span');
    idMeta.textContent = `ID: #${task.id}`;

    const createdMeta = document.createElement('span');
    createdMeta.textContent = `Creada: ${formatDateTime(task.created_at)}`;

    const deadlineMeta = document.createElement('span');
    deadlineMeta.textContent = `Límite: ${formatDate(task.deadline)}`;

    const statusMeta = document.createElement('span');
    statusMeta.textContent = `Estado: ${getTaskStatus(task)}`;

    meta.appendChild(idMeta);
    meta.appendChild(createdMeta);
    meta.appendChild(deadlineMeta);
    meta.appendChild(statusMeta);

    taskInfo.appendChild(taskHeader);
    taskInfo.appendChild(description);
    taskInfo.appendChild(meta);

    const taskActions = document.createElement('div');
    taskActions.className = 'task-actions';

    const status = document.createElement('span');
    const statusLabel = getStatusLabel(task);
    status.className = `status ${task.completed ? 'done' : overdue ? 'overdue' : 'pending'}`;
    status.textContent = statusLabel;

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'toggle-btn';
    toggleButton.textContent = task.completed ? 'Marcar pendiente' : 'Completar';
    toggleButton.addEventListener('click', () => completarTarea(task.id));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = 'Eliminar';
    deleteButton.addEventListener('click', () => eliminarTarea(task.id));

    taskActions.appendChild(status);
    taskActions.appendChild(toggleButton);
    taskActions.appendChild(deleteButton);

    item.appendChild(taskInfo);
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
  task.status = task.completed ? 'Finalizada' : (task.deadline && new Date(`${task.deadline}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0)) ? 'Sin completar' : 'Pendiente');
  mostrarTareas();
}

function eliminarTarea(id) {
  tasks = tasks.filter((task) => task.id !== id);
  mostrarTareas();
}

taskForm.addEventListener('submit', crearTarea);
taskForm.addEventListener('reset', clearError);

mostrarTareas();