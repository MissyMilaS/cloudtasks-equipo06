// ===== CONFIGURACIÓN DE BLOB =====
const API_URL = '/api/blob'; // Endpoint que creamos en api/blob.js

// ===== ESTADO =====
let tasks = [];
let currentFilter = '';
let editingId = null;

// ===== ELEMENTOS DOM =====
const tasksGrid = document.getElementById('tasksGrid');
const addBtn = document.getElementById('addTaskBtn');
const searchInput = document.getElementById('searchInput');

// Modal de creación/edición
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskDeadline = document.getElementById('taskDeadline');
const taskPriority = document.getElementById('taskPriority');
const taskStatus = document.getElementById('taskStatus');
const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
const saveTaskBtn = document.getElementById('saveTaskBtn');

// Modal de detalles
const detailModal = document.getElementById('detailModal');
const modalDetailTitle = document.getElementById('modalTitle');
const modalStatus = document.getElementById('modalStatus');
const modalDetail = document.getElementById('modalDetail');
const modalCreated = document.getElementById('modalCreated');
const modalDeadline = document.getElementById('modalDeadline');
const modalPriority = document.getElementById('modalPriority');
const closeModalBtn = document.getElementById('closeModalBtn');

// ===== FUNCIONES AUXILIARES =====
function formatDate(ts) {
  if (!ts) return 'Sin fecha';
  const d = new Date(ts);
  return d.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 16);
}

function getStatusLabel(status) {
  const labels = {
    'sin-empezar': '⬜ Sin empezar',
    'iniciado': '🟦 Iniciado',
    'en-progreso': '🟨 En progreso',
    'terminado': '✅ Terminado',
    'sin-terminar': '❌ Sin terminar'
  };
  return labels[status] || status;
}

function getPriorityLabel(priority) {
  const labels = {
    'baja': '🟢 Baja',
    'media': '🟡 Media',
    'alta': '🔴 Alta',
    'urgente': '🟣 Urgente'
  };
  return labels[priority] || priority;
}

function getStatusClass(status) {
  return `status-${status}`;
}

function getPriorityClass(priority) {
  return `priority-${priority}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== FUNCIONES CON BLOB =====

// Cargar todas las tareas desde Blob
async function loadTasks() {
  tasksGrid.innerHTML = '<div class="empty-message">⏳ Cargando tareas...</div>';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Error al cargar tareas');
    
    const data = await response.json();
    
    // Convertir los datos al formato que usa la app
    tasks = data.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || 'Sin descripción',
      createdAt: new Date(task.created_at).getTime(),
      deadline: task.deadline,
      priority: task.priority || 'media',
      status: task.status || 'sin-empezar'
    }));

    renderTasks();
    checkDeadlines();
  } catch (error) {
    console.error('Error cargando tareas:', error);
    tasksGrid.innerHTML = '<div class="empty-message">❌ Error al cargar las tareas: ' + error.message + '</div>';
  }
}

// Guardar tarea (crear o actualizar)
async function saveTaskToBlob(taskData) {
  try {
    const response = await fetch(API_URL, {
      method: editingId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: editingId,
        ...taskData
      })
    });

    if (!response.ok) throw new Error('Error al guardar tarea');
    
    // Recargar las tareas después de guardar
    await loadTasks();
  } catch (error) {
    console.error('Error guardando tarea:', error);
    alert('Error al guardar la tarea: ' + error.message);
  }
}

// Eliminar tarea
async function deleteTaskFromBlob(id) {
  try {
    const response = await fetch(`${API_URL}?id=${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Error al eliminar tarea');
    
    // Recargar las tareas después de eliminar
    await loadTasks();
  } catch (error) {
    console.error('Error eliminando tarea:', error);
    alert('Error al eliminar la tarea: ' + error.message);
  }
}

// ===== RENDERIZAR TAREAS =====
function renderTasks() {
  const filter = currentFilter.trim().toLowerCase();
  let filtered = tasks;
  if (filter !== '') {
    filtered = tasks.filter(t => 
      t.title.toLowerCase().includes(filter) || 
      t.description.toLowerCase().includes(filter)
    );
  }

  if (filtered.length === 0) {
    tasksGrid.innerHTML = `<div class="empty-message">${tasks.length === 0 ? '📝 No hay tareas, crea una nueva' : '🔍 No se encontraron tareas con ese filtro'}</div>`;
    return;
  }

  let html = '';
  for (const task of filtered) {
    const isOverdue = task.deadline && 
                     new Date(task.deadline).getTime() < Date.now() && 
                     task.status !== 'terminado';
    
    html += `
      <div class="task-card ${getPriorityClass(task.priority)} status-${task.status}" data-id="${task.id}">
        <div>
          <div class="task-title">${escapeHtml(task.title)} ${isOverdue ? '⚠️' : ''}</div>
          <div class="task-preview">${escapeHtml(task.description)}</div>
          <div class="task-meta">
            <span>${getStatusLabel(task.status)}</span>
            <span>${getPriorityLabel(task.priority)}</span>
            ${task.deadline ? `<span>📅 ${formatDate(task.deadline)}</span>` : ''}
          </div>
        </div>
        <div class="task-footer">
          <button class="btn-edit" data-id="${task.id}" data-action="edit"><i class="fas fa-pen"></i> Editar</button>
          <button class="btn-delete" data-id="${task.id}" data-action="delete"><i class="fas fa-trash"></i> Eliminar</button>
        </div>
      </div>
    `;
  }
  tasksGrid.innerHTML = html;

  // Event listeners para las tarjetas (abrir detalles)
  document.querySelectorAll('.task-card').forEach(card => {
    const id = parseInt(card.dataset.id);
    card.addEventListener('click', function(e) {
      if (e.target.closest('button')) return;
      const task = tasks.find(t => t.id === id);
      if (task) openDetailModal(task);
    });
  });

  // Event listeners para los botones de editar y eliminar
  document.querySelectorAll('.task-footer button').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = parseInt(this.dataset.id);
      const action = this.dataset.action;
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      if (action === 'delete') {
        if (confirm(`¿Eliminar la tarea "${task.title}"?`)) {
          deleteTaskFromBlob(id);
        }
      } else if (action === 'edit') {
        openTaskModal(task);
      }
    });
  });
}

// ===== CREAR/EDITAR TAREA =====
function openTaskModal(task = null) {
  editingId = task ? task.id : null;
  taskForm.reset();

  if (task) {
    modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Tarea';
    taskTitle.value = task.title;
    taskDescription.value = task.description;
    taskDeadline.value = formatDateInput(task.deadline);
    taskPriority.value = task.priority || 'media';
    taskStatus.value = task.status || 'sin-empezar';
    saveTaskBtn.textContent = 'Actualizar';
  } else {
    modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Nueva Tarea';
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    taskDeadline.value = defaultDate.toISOString().slice(0, 16);
    taskStatus.value = 'sin-empezar';
    saveTaskBtn.textContent = 'Guardar';
  }

  taskModal.classList.add('active');
}

function closeTaskModal() {
  taskModal.classList.remove('active');
  editingId = null;
  taskForm.reset();
}

// ===== GUARDAR TAREA =====
taskForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const title = taskTitle.value.trim();
  if (!title) {
    alert('El título es obligatorio');
    return;
  }

  const deadline = taskDeadline.value;
  if (!deadline) {
    alert('La fecha límite es obligatoria');
    return;
  }

  const taskData = {
    title: title,
    description: taskDescription.value.trim() || 'Sin descripción',
    deadline: deadline,
    priority: taskPriority.value,
    status: taskStatus.value
  };

  await saveTaskToBlob(taskData);
  closeTaskModal();
});

// ===== ABRIR MODAL DE DETALLES =====
function openDetailModal(task) {
  modalDetailTitle.textContent = escapeHtml(task.title);
  modalStatus.textContent = getStatusLabel(task.status);
  modalStatus.className = `detail-status ${getStatusClass(task.status)}`;
  modalDetail.textContent = escapeHtml(task.description);
  modalCreated.textContent = task.createdAt ? formatDate(task.createdAt) : 'Sin fecha';
  modalDeadline.textContent = task.deadline ? formatDate(task.deadline) : 'Sin fecha';
  modalPriority.textContent = getPriorityLabel(task.priority);
  detailModal.classList.add('active');
}

function closeDetailModal() {
  detailModal.classList.remove('active');
}

// ===== VERIFICAR FECHAS LÍMITE =====
function checkDeadlines() {
  const now = Date.now();
  let updated = false;
  
  tasks.forEach(task => {
    if (task.deadline && task.status !== 'terminado') {
      const deadlineDate = new Date(task.deadline).getTime();
      if (deadlineDate < now) {
        task.status = 'sin-terminar';
        updated = true;
      }
    }
  });
  
  if (updated) {
    renderTasks();
  }
}

// ===== EVENTOS =====
addBtn.addEventListener('click', () => openTaskModal());

searchInput.addEventListener('input', function() {
  currentFilter = this.value;
  renderTasks();
});

closeModalBtn.addEventListener('click', closeDetailModal);
closeTaskModalBtn.addEventListener('click', closeTaskModal);

// Cerrar modales al hacer clic fuera
detailModal.addEventListener('click', function(e) {
  if (e.target === this) closeDetailModal();
});
taskModal.addEventListener('click', function(e) {
  if (e.target === this) closeTaskModal();
});

// Cerrar modales con ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (detailModal.classList.contains('active')) closeDetailModal();
    if (taskModal.classList.contains('active')) closeTaskModal();
  }
});

// ===== INICIALIZACIÓN =====
loadTasks();

// Verificar fechas límite cada 60 segundos
setInterval(checkDeadlines, 60000);

// Exponer para debug
window.__tasks = tasks;