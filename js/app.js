(function() {
  // ===== ESTADO =====
  let tasks = [];
  let nextId = 1;
  let currentFilter = '';
  let currentStatusFilter = 'all';
  let editingId = null;

  // ===== ELEMENTOS DOM =====
  const tasksGrid = document.getElementById('tasksGrid');
  const addBtn = document.getElementById('addTaskBtn');
  const searchInput = document.getElementById('searchInput');
  const statusFilters = document.querySelectorAll('.status-filter');

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
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  function normalizeTaskState(task) {
    if (!task) return task;

    if (task.completed === true || task.status === 'terminado') {
      task.status = 'terminado';
      task.completed = true;
      return task;
    }

    if (task.deadline && new Date(task.deadline).getTime() < Date.now()) {
      task.status = 'sin-terminar';
      task.completed = false;
      return task;
    }

    if (!['sin-empezar', 'iniciado', 'en-progreso', 'sin-terminar'].includes(task.status)) {
      task.status = 'sin-empezar';
    }

    task.completed = false;
    return task;
  }

  function getCreateStatusOptions() {
    return ['sin-empezar', 'iniciado'];
  }

  function getEditStatusOptions(currentStatus) {
    const map = {
      'sin-empezar': ['sin-empezar', 'iniciado'],
      'iniciado': ['iniciado', 'en-progreso'],
      'en-progreso': ['en-progreso'],
      'sin-terminar': ['iniciado', 'en-progreso'],
      'terminado': ['terminado']
    };

    return map[currentStatus] || ['sin-empezar', 'iniciado'];
  }

  function hydrateStatusField(currentStatus, isCreateMode) {
    taskStatus.innerHTML = '';

    if (isCreateMode) {
      const option = document.createElement('option');
      option.value = 'sin-empezar';
      option.textContent = getStatusLabel('sin-empezar');
      option.selected = true;
      taskStatus.appendChild(option);
      taskStatus.disabled = true;
      taskStatus.value = 'sin-empezar';
      return;
    }

    const options = getEditStatusOptions(currentStatus);
    const currentValue = options.includes(currentStatus) ? currentStatus : options[0];

    options.forEach(optionValue => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = getStatusLabel(optionValue);
      option.selected = optionValue === currentValue;
      taskStatus.appendChild(option);
    });

    taskStatus.disabled = false;
    taskStatus.value = currentValue;
  }

  // ===== VERIFICAR FECHAS LÍMITE =====
  function isTaskOverdue(task) {
    return !!task.deadline &&
      new Date(task.deadline).getTime() < Date.now() &&
      task.status !== 'terminado';
  }

  function formatDeadline(ts) {
    if (!ts) return 'Sin fecha límite';
    const d = new Date(ts);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTaskState(task) {
    if (task.status === 'terminado') {
      const hasDelay = !!task.deadline && new Date(task.deadline).getTime() < Date.now();
      return {
        label: 'Completada',
        className: 'status-terminado',
        delayLabel: hasDelay ? 'Con retraso' : '',
        delayClass: hasDelay ? 'status-sin-terminar' : ''
      };
    }
    if (isTaskOverdue(task)) {
      return { label: 'Retrasada', className: 'status-sin-terminar' };
    }
    return { label: 'Pendiente', className: 'status-sin-empezar' };
  }

  function checkDeadlines() {
    const now = Date.now();
    let updated = false;

    tasks.forEach(task => {
      if (!task || !task.deadline) return;

      const deadlineDate = new Date(task.deadline).getTime();
      if (deadlineDate < now && task.completed !== true) {
        if (task.status !== 'sin-terminar') {
          task.status = 'sin-terminar';
          task.completed = false;
          updated = true;
        }
      }
    });

    if (updated) {
      renderTasks();
    }
  }

  // ===== RENDERIZAR TAREAS =====
  function renderTasks() {
    const filter = currentFilter.trim().toLowerCase();
    let filtered = tasks;

    if (currentStatusFilter !== 'all') {
      filtered = filtered.filter(t => {
        const normalized = normalizeTaskState({ ...t });
        if (currentStatusFilter === 'terminado') return normalized.status === 'terminado';
        if (currentStatusFilter === 'sin-terminar') return normalized.status === 'sin-terminar';
        return normalized.status === currentStatusFilter;
      });
    }

    if (filter !== '') {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(filter) || 
        t.description.toLowerCase().includes(filter)
      );
    }

    if (filtered.length === 0) {
      tasksGrid.innerHTML = `<div class="empty-message">${tasks.length === 0 ? 'No hay tareas, añade una nueva' : 'No se encontraron tareas con ese filtro'}</div>`;
      return;
    }

    let html = '';
    for (const task of filtered) {
      const currentTask = normalizeTaskState(task);
      const isCompleted = currentTask.completed === true || currentTask.status === 'terminado';
      const isOverdue = isTaskOverdue(currentTask);
      const state = getTaskState(currentTask);

      html += `
        <div class="task-card ${getPriorityClass(currentTask.priority)} ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${currentTask.id}">
          <div class="task-main">
            <label class="task-check-wrap">
              <input type="checkbox" class="task-check" data-id="${currentTask.id}" ${isCompleted ? 'checked' : ''}>
            </label>
            <div class="task-content">
              <div class="task-title-row">
                <div class="task-title ${isCompleted ? 'completed' : ''}">${escapeHtml(currentTask.title)}</div>
                <div class="task-state-group">
                  <span class="task-state ${state.className}">${state.label}</span>
                  ${state.delayLabel ? `<span class="task-state ${state.delayClass}">${state.delayLabel}</span>` : ''}
                </div>
              </div>
              <div class="task-preview">${escapeHtml(currentTask.description)}</div>
              <div class="task-meta">
                <span><strong>Fecha límite:</strong> ${formatDeadline(currentTask.deadline)}</span>
                <span>${getPriorityLabel(currentTask.priority)}</span>
              </div>
            </div>
          </div>
          <div class="task-footer">
            <button class="btn-edit" data-id="${currentTask.id}" data-action="edit"><i class="fas fa-pen"></i> Editar</button>
            <button class="btn-delete" data-id="${currentTask.id}" data-action="delete"><i class="fas fa-trash"></i> Eliminar</button>
          </div>
        </div>
      `;
    }
    tasksGrid.innerHTML = html;

    // Event listeners
    document.querySelectorAll('.task-card').forEach(card => {
      const id = parseInt(card.dataset.id);
      card.addEventListener('click', function(e) {
        if (e.target.closest('button') || e.target.closest('.task-check')) return;
        const task = tasks.find(t => t.id === id);
        if (task) openDetailModal(task);
      });
    });

    document.querySelectorAll('.task-check').forEach(check => {
      check.addEventListener('change', function() {
        const id = parseInt(this.dataset.id);
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (this.checked) {
          task.completed = true;
          task.status = 'terminado';
        } else {
          task.completed = false;
          task.status = 'en-progreso';
        }

        renderTasks();
      });
    });

    document.querySelectorAll('.task-footer button').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        const action = this.dataset.action;
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (action === 'delete') {
          if (confirm(`¿Eliminar la tarea "${task.title}"?`)) {
            tasks = tasks.filter(t => t.id !== id);
            renderTasks();
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
      const currentStatus = task.status || 'sin-empezar';
      hydrateStatusField(currentStatus, false);
      saveTaskBtn.textContent = 'Actualizar';
    } else {
      modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Nueva Tarea';
      const defaultDate = new Date();
      const localDate = new Date(defaultDate.getTime() - (defaultDate.getTimezoneOffset() * 60000));
      taskDeadline.value = localDate.toISOString().slice(0, 16);
      taskPriority.value = '';
      hydrateStatusField('sin-empezar', true);
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
  taskForm.addEventListener('submit', function(e) {
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
      completed: false,
      status: 'sin-empezar'
    };

    if (editingId) {
      const index = tasks.findIndex(t => t.id === editingId);
      if (index !== -1) {
        const currentTask = tasks[index];
        const allowedStatuses = getEditStatusOptions(currentTask.status || 'sin-empezar');
        const selectedStatus = allowedStatuses.includes(taskStatus.value) ? taskStatus.value : allowedStatuses[0];

        taskData.status = selectedStatus;
        taskData.completed = false;
        tasks[index] = { ...currentTask, ...taskData };
      }
    } else {
      const selectedStatus = getCreateStatusOptions().includes(taskStatus.value) ? taskStatus.value : 'sin-empezar';
      taskData.status = selectedStatus;
      taskData.completed = false;
      const newTask = {
        id: nextId++,
        ...taskData,
        created_at: Date.now()
      };
      tasks.push(newTask);
    }

    closeTaskModal();
    renderTasks();
    checkDeadlines();
  });

  // ===== ABRIR MODAL DE DETALLES =====
  function openDetailModal(task) {
    const normalizedTask = normalizeTaskState({ ...task });
    modalDetailTitle.textContent = escapeHtml(normalizedTask.title);
    modalStatus.textContent = getStatusLabel(normalizedTask.status);
    modalStatus.className = `detail-status ${getStatusClass(normalizedTask.status)}`;
    modalDetail.textContent = escapeHtml(normalizedTask.description);
    modalCreated.textContent = normalizedTask.created_at ? formatDate(normalizedTask.created_at) : (normalizedTask.createdAt ? formatDate(normalizedTask.createdAt) : 'Sin fecha');
    modalDeadline.textContent = normalizedTask.deadline ? formatDate(normalizedTask.deadline) : 'Sin fecha';
    modalPriority.textContent = getPriorityLabel(normalizedTask.priority);
    detailModal.classList.add('active');
  }

  function closeDetailModal() {
    detailModal.classList.remove('active');
  }

  // ===== AÑADIR TAREA (desde el botón) =====
  function addTask() {
    openTaskModal(); // Simplemente abre el modal vacío
  }

  // ===== EVENTOS =====
  addBtn.addEventListener('click', addTask);

  searchInput.addEventListener('input', function() {
    currentFilter = this.value;
    renderTasks();
  });

  statusFilters.forEach(button => {
    button.addEventListener('click', function() {
      currentStatusFilter = this.dataset.filter;
      statusFilters.forEach(item => item.classList.toggle('active', item === this));
      renderTasks();
    });
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

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (detailModal.classList.contains('active')) closeDetailModal();
      if (taskModal.classList.contains('active')) closeTaskModal();
    }
  });

  // ===== INICIALIZAR CON TAREAS DE EJEMPLO =====
  function initDemoTasks() {
    const now = Date.now();
    tasks = [
      
    ];
    renderTasks();
    checkDeadlines();
  }
  
  initDemoTasks();

  // Verificar fechas cada 60 segundos
  setInterval(checkDeadlines, 60000);

  // Exponer para debug
  window.__tasks = tasks;
})();
