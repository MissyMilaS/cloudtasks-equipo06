(function() {
  const loginScreen = document.getElementById('loginScreen');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const appContent = document.getElementById('appContent');
  const sessionPanel = document.getElementById('sessionPanel');
  const sessionTrigger = document.getElementById('sessionTrigger');
  const sessionDetails = document.getElementById('sessionDetails');
  const sessionName = document.getElementById('sessionName');
  const sessionEmail = document.getElementById('sessionEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const supabaseClient = window.cloudTasksSupabase;
  const accounts = [
    { id: 'demo-admin', name: 'Administrador', email: 'admin@cloudtasks.com', password: 'admin123', role: 'administrador' },
    { id: 'demo-user-1', name: 'Usuario 1', email: 'usuario1@cloudtasks.com', password: 'usuario123', role: 'usuario' },
    { id: 'demo-leader', name: 'Usuario 2', email: 'usuario2@cloudtasks.com', password: 'usuario123', role: 'lider' }
  ];
  let currentUser = null;
  let currentProfile = null;

  function isSupabaseEnabled() {
    return Boolean(supabaseClient);
  }

  function canManageTasks() {
    return currentProfile?.role === 'administrador';
  }

  function canChangeTaskState(task) {
    return canManageTasks() || (currentProfile?.role === 'lider' && task.leader_id === currentProfile.id);
  }

  function getVisibleTasks(taskList) {
    if (canManageTasks()) return taskList;
    if (currentProfile?.role === 'lider') {
      return taskList.filter(task => task.leader_id === currentProfile.id);
    }
    return taskList.filter(task => (task.assigned_user_ids || []).includes(currentProfile?.id));
  }

  function updateSessionDetails(profile) {
    sessionName.textContent = profile.name;
    sessionEmail.textContent = `${profile.email} (${profile.role})`;
    sessionPanel.hidden = false;
  }

  function updateRoleControls() {
    addBtn.hidden = !canManageTasks();
  }

  async function showApp() {
    loginScreen.hidden = true;
    appContent.hidden = false;
    updateSessionDetails(currentProfile);
    updateRoleControls();
    await loadTasks();
  }

  async function loadSupabaseProfile(user) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  }

  async function restoreSession() {
    if (!isSupabaseEnabled()) return false;
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) return false;
    currentUser = data.user;
    currentProfile = await loadSupabaseProfile(currentUser);
    await showApp();
    return true;
  }

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!loginForm.checkValidity()) {
      loginError.textContent = 'Escribe un correo válido y una contraseña de al menos 4 caracteres.';
      loginError.hidden = false;
      loginForm.reportValidity();
      return;
    }

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    try {
      if (isSupabaseEnabled()) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        currentProfile = await loadSupabaseProfile(currentUser);
      } else {
        const account = accounts.find(item => item.email === email && item.password === password);
        if (!account) throw new Error('invalid_credentials');
        currentUser = { id: account.id, email: account.email };
        currentProfile = { id: account.id, name: account.name, email: account.email, role: account.role };
      }
      loginError.hidden = true;
      await showApp();
    } catch (error) {
      loginError.textContent = error.message === 'invalid_credentials'
        ? 'El correo o la contraseña no coinciden con una cuenta registrada.'
        : 'No fue posible iniciar sesión. Revisa la configuración o tus credenciales.';
      loginError.hidden = false;
    }
  });

  sessionTrigger.addEventListener('click', function() {
    const isOpen = !sessionDetails.hidden;
    sessionDetails.hidden = isOpen;
    sessionTrigger.setAttribute('aria-expanded', String(!isOpen));
  });

  logoutBtn.addEventListener('click', async function() {
    if (isSupabaseEnabled()) await supabaseClient.auth.signOut();
    currentUser = null;
    currentProfile = null;
    sessionDetails.hidden = true;
    sessionTrigger.setAttribute('aria-expanded', 'false');
    sessionPanel.hidden = true;
    appContent.hidden = true;
    loginForm.reset();
    loginScreen.hidden = false;
    document.getElementById('loginEmail').focus();
  });

  // ===== ESTADO =====
  let tasks = [];
  let nextId = 1;
  let currentFilter = '';
  let selectedPriorities = [];
  let editingId = null;
  let editingStateOnly = false;
  const sectionOpen = {
    overdue: true,
    'sin-empezar': true,
    iniciado: true,
    'en-progreso': true,
    completed: true
  };
  // ============ CONFIGURACIÓN DE SUPABASE ============
  const SUPABASE_URL = 'https://cznqqhlbzmpyxzjvcfrv.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bnFxaGxiem1weXh6anZjZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Nzk0NzQsImV4cCI6MjEwNDU1NTQ3NH0.8Ifp8CrbSDIBc4oVjex1jdudUjRjzTqsOtFaK0YfJlk';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== ELEMENTOS DOM =====
  const tasksGrid = document.getElementById('tasksGrid');
  const addBtn = document.getElementById('addTaskBtn');
  const searchInput = document.getElementById('searchInput');
  const priorityFilter = document.getElementById('priorityFilter');
  const priorityFilterBtn = document.getElementById('priorityFilterBtn');
  const priorityFilterLabel = document.getElementById('priorityFilterLabel');
  const priorityMenu = document.getElementById('priorityMenu');
  const priorityOptions = priorityMenu.querySelectorAll('input[type="checkbox"]');
  const clearPriorityFilter = document.getElementById('clearPriorityFilter');

  // Modal de creación/edición
  const taskModal = document.getElementById('taskModal');
  const modalTitle = document.getElementById('modalTitle');
  const taskForm = document.getElementById('taskForm');
  const taskTitle = document.getElementById('taskTitle');
  const taskDescription = document.getElementById('taskDescription');
  const taskDeadline = document.getElementById('taskDeadline');
  const taskPriority = document.getElementById('taskPriority');
  const taskStatus = document.getElementById('taskStatus');
  const taskAssignmentFields = document.getElementById('taskAssignmentFields');
  const taskUsersField = document.getElementById('taskUsersField');
  const taskLeader = document.getElementById('taskLeader');
  const taskUsers = document.getElementById('taskUsers');
  const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
  const saveTaskBtn = document.getElementById('saveTaskBtn');

  // Modal de detalles
  const detailModal = document.getElementById('detailModal');
  const modalDetailTitle = document.getElementById('modalDetailTitle');
  const modalStatus = document.getElementById('modalStatus');
  const modalDetail = document.getElementById('modalDetail');
  const modalCreated = document.getElementById('modalCreated');
  const modalDeadline = document.getElementById('modalDeadline');
  const modalPriority = document.getElementById('modalPriority');
  const closeModalBtn = document.getElementById('closeModalBtn');

  async function loadProfiles() {
    if (!isSupabaseEnabled()) return accounts.map(({ password, ...profile }) => profile);
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, name, email, role')
      .in('role', ['lider', 'usuario'])
      .order('name');
    if (error) throw error;
    return data || [];
  }

  async function loadTasks() {
    if (!isSupabaseEnabled()) {
      tasks = getVisibleTasks(tasks);
      renderTasks();
      checkDeadlines();
      return;
    }

    const { data: taskRows, error: taskError } = await supabaseClient
      .from('tasks')
      .select('*')
      .order('deadline', { ascending: true });
    if (taskError) throw taskError;

    const { data: assignmentRows, error: assignmentError } = await supabaseClient
      .from('task_assignments')
      .select('task_id, user_id');
    if (assignmentError) throw assignmentError;

    const assignmentsByTask = (assignmentRows || []).reduce((result, assignment) => {
      result[assignment.task_id] = result[assignment.task_id] || [];
      result[assignment.task_id].push(assignment.user_id);
      return result;
    }, {});

    tasks = getVisibleTasks((taskRows || []).map(task => ({
      ...task,
      assigned_user_ids: assignmentsByTask[task.id] || []
    })));
    renderTasks();
    checkDeadlines();
  }

  async function saveTaskAssignments(taskId, userIds) {
    if (!isSupabaseEnabled()) return;
    const { error: deleteError } = await supabaseClient
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId);
    if (deleteError) throw deleteError;

    if (userIds.length === 0) return;
    const { error: insertError } = await supabaseClient
      .from('task_assignments')
      .insert(userIds.map(userId => ({ task_id: taskId, user_id: userId })));
    if (insertError) throw insertError;
  }

  async function populateAssignmentFields(task = null) {
    if (!canManageTasks()) {
      taskAssignmentFields.hidden = true;
      taskUsersField.hidden = true;
      taskLeader.required = false;
      return;
    }

    const profiles = await loadProfiles();
    const leaders = profiles.filter(profile => profile.role === 'lider');
    const users = profiles.filter(profile => profile.role === 'usuario');
    taskLeader.innerHTML = '<option value="" selected disabled>Selecciona un líder</option>';
    leaders.forEach(profile => {
      const option = new Option(`${profile.name} (${profile.email})`, profile.id);
      option.selected = profile.id === task?.leader_id;
      taskLeader.add(option);
    });

    taskUsers.innerHTML = '';
    users.forEach(profile => {
      const option = new Option(`${profile.name} (${profile.email})`, profile.id);
      option.selected = (task?.assigned_user_ids || []).includes(profile.id);
      taskUsers.add(option);
    });
    taskAssignmentFields.hidden = false;
    taskUsersField.hidden = false;
    taskLeader.required = true;
  }

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

    const editableStatuses = ['sin-empezar', 'iniciado', 'en-progreso'];

    if (task.completed === true || task.status === 'terminado') {
      task.status = 'terminado';
      task.completed = true;
      return task;
    }

    if (task.deadline && new Date(task.deadline).getTime() < Date.now()) {
      if (editableStatuses.includes(task.status)) {
        task.statusBeforeOverdue = task.status;
      }
      task.status = 'sin-terminar';
      task.completed = false;
      return task;
    }

    if (task.status === 'sin-terminar' && editableStatuses.includes(task.statusBeforeOverdue)) {
      task.status = task.statusBeforeOverdue;
      delete task.statusBeforeOverdue;
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

  function getEditStatusOptions(currentStatus, isOverdue) {
    if (isOverdue || currentStatus === 'sin-terminar') return ['sin-terminar'];
    if (currentStatus === 'terminado') return ['terminado'];

    const statusOptions = {
      'sin-empezar': ['sin-empezar', 'iniciado'],
      iniciado: ['iniciado', 'en-progreso'],
      'en-progreso': ['en-progreso']
    };

    return statusOptions[currentStatus] || ['sin-empezar', 'iniciado'];
  }

  function hydrateStatusField(currentStatus, isCreateMode, isOverdue = false) {
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

    const options = getEditStatusOptions(currentStatus, isOverdue);
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
    const editableStatuses = ['sin-empezar', 'iniciado', 'en-progreso'];

    tasks.forEach(task => {
      if (!task || task.completed === true) return;

      if (task.deadline && new Date(task.deadline).getTime() < now && task.status !== 'sin-terminar') {
        if (editableStatuses.includes(task.status)) {
          task.statusBeforeOverdue = task.status;
        }
        task.status = 'sin-terminar';
        updated = true;
      }
    });

    if (updated) renderTasks();
  }

  const priorityOrder = {
    urgente: 4,
    alta: 3,
    media: 2,
    baja: 1
  };

  function sortTasks(taskList) {
    return taskList
      .map((task, index) => ({ task, index }))
      .sort((a, b) => {
        const deadlineA = a.task.deadline ? new Date(a.task.deadline).getTime() : Infinity;
        const deadlineB = b.task.deadline ? new Date(b.task.deadline).getTime() : Infinity;
        const deadlineDifference = deadlineA - deadlineB;

        if (deadlineDifference !== 0) return deadlineDifference;

        const priorityDifference = (priorityOrder[b.task.priority] || 0) - (priorityOrder[a.task.priority] || 0);
        return priorityDifference || a.index - b.index;
      })
      .map(({ task }) => task);
  }

  function getTaskSection(task) {
    if (task.completed === true || task.status === 'terminado') return 'completed';
    if (isTaskOverdue(task)) return 'overdue';
    return ['sin-empezar', 'iniciado', 'en-progreso'].includes(task.status)
      ? task.status
      : 'sin-empezar';
  }

  function renderTaskCard(task) {
    const currentTask = normalizeTaskState(task);
    const isCompleted = currentTask.completed === true || currentTask.status === 'terminado';
    const isOverdue = isTaskOverdue(currentTask);
    const state = getTaskState(currentTask);
    const canUpdateState = canChangeTaskState(currentTask);
    const canEdit = canManageTasks();

    return `
      <div class="task-card ${getPriorityClass(currentTask.priority)} ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${currentTask.id}">
        <div class="task-main">
          <label class="task-check-wrap">
            <input type="checkbox" class="task-check" data-id="${currentTask.id}" ${isCompleted ? 'checked' : ''} ${canUpdateState ? '' : 'disabled'}>
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
          ${canEdit ? `<button class="btn-edit" data-id="${currentTask.id}" data-action="edit"><i class="fas fa-pen"></i> Editar</button>` : canUpdateState ? `<button class="btn-edit" data-id="${currentTask.id}" data-action="edit-state"><i class="fas fa-pen"></i> Estado</button>` : ''}
          ${canEdit ? `<button class="btn-delete" data-id="${currentTask.id}" data-action="delete"><i class="fas fa-trash"></i> Eliminar</button>` : ''}
        </div>
      </div>
    `;
  }

  // ===== RENDERIZAR TAREAS =====
  function renderTasks() {
    const filter = currentFilter.trim().toLowerCase();
    let filtered = tasks;

    if (filter !== '') {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(filter) || 
        t.description.toLowerCase().includes(filter)
      );
    }

    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(task => selectedPriorities.includes(task.priority));
    }

    const sections = {
      overdue: sortTasks(filtered.filter(task => getTaskSection(task) === 'overdue')),
      'sin-empezar': sortTasks(filtered.filter(task => getTaskSection(task) === 'sin-empezar')),
      iniciado: sortTasks(filtered.filter(task => getTaskSection(task) === 'iniciado')),
      'en-progreso': sortTasks(filtered.filter(task => getTaskSection(task) === 'en-progreso')),
      completed: sortTasks(filtered.filter(task => getTaskSection(task) === 'completed'))
    };

    if (filtered.length === 0) {
      tasksGrid.innerHTML = `<div class="empty-message">${tasks.length === 0 ? 'No hay tareas, añade una nueva' : 'No se encontraron tareas con ese filtro'}</div>`;
      return;
    }

    const sectionLabels = {
      overdue: '⚠️ Vencidas',
      'sin-empezar': '⬜ Sin iniciar',
      iniciado: '🟦 Iniciado',
      'en-progreso': '🟨 En progreso',
      completed: '✅ Completadas'
    };
    tasksGrid.innerHTML = Object.entries(sections).map(([key, sectionTasks]) => `
      <section class="task-section ${sectionOpen[key] ? 'is-open' : ''}" data-section="${key}">
        <button class="section-header" type="button" aria-expanded="${sectionOpen[key]}">
          <span class="section-arrow">${sectionOpen[key] ? '▼' : '▶'}</span>
          <span>${sectionLabels[key]} (${sectionTasks.length})</span>
        </button>
        <div class="section-content">${sectionTasks.map(renderTaskCard).join('')}</div>
      </section>
    `).join('');

    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', function() {
        const section = this.closest('.task-section').dataset.section;
        sectionOpen[section] = !sectionOpen[section];
        renderTasks();
      });
    });

    // Event listeners
    document.querySelectorAll('.task-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', function(e) {
        if (e.target.closest('button') || e.target.closest('.task-check')) return;
        const task = tasks.find(t => String(t.id) === id);
        if (task) openDetailModal(task);
      });
    });

    document.querySelectorAll('.task-check').forEach(check => {
      check.addEventListener('change', async function() {
        const id = this.dataset.id;
        const task = tasks.find(t => String(t.id) === id);
        if (!task) return;

        if (this.checked) {
          task.completed = true;
          task.status = 'terminado';
        } else {
          task.completed = false;
          task.status = 'en-progreso';
        }

        if (isSupabaseEnabled()) {
          const { error } = await supabaseClient
            .from('tasks')
            .update({ status: task.status, completed: task.completed })
            .eq('id', task.id);
          if (error) {
            alert('No fue posible actualizar el estado de la tarea.');
            return;
          }
        }
        renderTasks();
      });
    });

    document.querySelectorAll('.task-footer button').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const id = this.dataset.id;
        const action = this.dataset.action;
        const task = tasks.find(t => String(t.id) === id);
        if (!task) return;

        if (action === 'delete') {
          if (confirm(`¿Eliminar la tarea "${task.title}"?`)) {
            if (isSupabaseEnabled()) {
              const { error } = await supabaseClient.from('tasks').delete().eq('id', task.id);
              if (error) {
                alert('No fue posible eliminar la tarea.');
                return;
              }
            }
            tasks = tasks.filter(t => String(t.id) !== id);
            renderTasks();
          }
        } else if (action === 'edit') {
          openTaskModal(task);
        } else if (action === 'edit-state') {
          openTaskModal(task, true);
        }
      });
    });
  }

  // ===== CREAR/EDITAR TAREA =====
  async function openTaskModal(task = null, stateOnly = false) {
    editingId = task ? task.id : null;
    editingStateOnly = stateOnly;
    taskForm.reset();

    if (task) {
      modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Tarea';
      taskTitle.value = task.title;
      taskDescription.value = task.description;
      taskDeadline.value = formatDateInput(task.deadline);
      taskPriority.value = task.priority || 'media';
      const currentStatus = task.status || 'sin-empezar';
      hydrateStatusField(currentStatus, false, isTaskOverdue(task));
      if (stateOnly) {
        [taskTitle, taskDescription, taskDeadline, taskPriority].forEach(field => { field.disabled = true; });
        taskAssignmentFields.hidden = true;
        taskUsersField.hidden = true;
        taskLeader.required = false;
        saveTaskBtn.textContent = 'Actualizar estado';
      } else {
        [taskTitle, taskDescription, taskDeadline, taskPriority].forEach(field => { field.disabled = false; });
        await populateAssignmentFields(task);
        saveTaskBtn.textContent = 'Actualizar';
      }
    } else {
      modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Nueva Tarea';
      const defaultDate = new Date();
      const localDate = new Date(defaultDate.getTime() - (defaultDate.getTimezoneOffset() * 60000));
      taskDeadline.value = localDate.toISOString().slice(0, 16);
      taskPriority.value = '';
      hydrateStatusField('sin-empezar', true);
      [taskTitle, taskDescription, taskDeadline, taskPriority].forEach(field => { field.disabled = false; });
      await populateAssignmentFields();
      saveTaskBtn.textContent = 'Guardar';
    }

    taskModal.classList.add('active');
  }

  function closeTaskModal() {
    taskModal.classList.remove('active');
    editingId = null;
    editingStateOnly = false;
    [taskTitle, taskDescription, taskDeadline, taskPriority].forEach(field => { field.disabled = false; });
    taskForm.reset();
  }

  // ===== GUARDAR TAREA =====
  taskForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const canEditStateAsLeader = currentProfile?.role === 'lider' && editingId && editingStateOnly;
    if (!canManageTasks() && !canEditStateAsLeader) return;

    const title = taskTitle.value.trim();
    if (!title) {
      alert('El título es obligatorio');
      return;
    }

    const description = taskDescription.value.trim();
    if (!description) {
      alert('La descripción es obligatoria');
      return;
    }

    const deadline = taskDeadline.value;
    if (!deadline) {
      alert('La fecha límite es obligatoria');
      return;
    }

    const priority = taskPriority.value;
    if (!priority) {
      alert('La prioridad es obligatoria');
      return;
    }

    const leaderId = taskLeader.value;
    const selectedUserIds = Array.from(taskUsers.selectedOptions).map(option => option.value);
    if (canManageTasks() && !leaderId) {
      alert('Debes seleccionar exactamente un líder de equipo.');
      return;
    }

    const taskData = {
      title: title,
      description: description,
      deadline: deadline,
      priority: priority,
      completed: false,
      status: 'sin-empezar'
    };

    if (editingId) {
      const index = tasks.findIndex(t => t.id === editingId);
      if (index !== -1) {
        const currentTask = tasks[index];
        if (editingStateOnly) {
          const allowedStatuses = getEditStatusOptions(currentTask.status || 'sin-empezar', isTaskOverdue(currentTask));
          if (!allowedStatuses.includes(taskStatus.value)) {
            alert('El estado seleccionado no es válido para esta tarea.');
            return;
          }
          taskData.status = taskStatus.value;
          taskData.completed = taskData.status === 'terminado';
          if (isSupabaseEnabled()) {
            const { error } = await supabaseClient
              .from('tasks')
              .update({ status: taskData.status, completed: taskData.completed })
              .eq('id', currentTask.id);
            if (error) throw error;
          }
          tasks[index] = { ...currentTask, status: taskData.status, completed: taskData.completed };
          closeTaskModal();
          await loadTasks();
          return;
        }
        const newDeadlineIsOverdue = new Date(deadline).getTime() < Date.now();
        const restoredStatus = currentTask.status === 'sin-terminar' &&
          !newDeadlineIsOverdue &&
          ['sin-empezar', 'iniciado', 'en-progreso'].includes(currentTask.statusBeforeOverdue)
          ? currentTask.statusBeforeOverdue
          : currentTask.status || 'sin-empezar';
        const allowedStatuses = getEditStatusOptions(
          restoredStatus,
          newDeadlineIsOverdue
        );
        const selectedStatus = allowedStatuses.includes(taskStatus.value) ? taskStatus.value : allowedStatuses[0];

        taskData.status = selectedStatus;
        taskData.completed = selectedStatus === 'terminado';
        if (selectedStatus !== 'sin-terminar') delete currentTask.statusBeforeOverdue;
        taskData.leader_id = leaderId;
        taskData.assigned_user_ids = selectedUserIds;
        if (isSupabaseEnabled()) {
          const { error } = await supabaseClient
            .from('tasks')
            .update({
              title: taskData.title,
              description: taskData.description,
              deadline: taskData.deadline,
              priority: taskData.priority,
              status: taskData.status,
              completed: taskData.completed,
              leader_id: taskData.leader_id
            })
            .eq('id', currentTask.id);
          if (error) throw error;
          await saveTaskAssignments(currentTask.id, selectedUserIds);
        }
        tasks[index] = { ...currentTask, ...taskData };
      }
    } else {
      const selectedStatus = getCreateStatusOptions().includes(taskStatus.value) ? taskStatus.value : 'sin-empezar';
      taskData.status = selectedStatus;
      taskData.completed = false;
      taskData.leader_id = leaderId;
      taskData.assigned_user_ids = selectedUserIds;
      if (isSupabaseEnabled()) {
        const { data, error } = await supabaseClient
          .from('tasks')
          .insert({
            title: taskData.title,
            description: taskData.description,
            deadline: taskData.deadline,
            priority: taskData.priority,
            status: taskData.status,
            completed: taskData.completed,
            leader_id: taskData.leader_id
          })
          .select()
          .single();
        if (error) throw error;
        await saveTaskAssignments(data.id, selectedUserIds);
        tasks.push({ ...data, assigned_user_ids: selectedUserIds });
      } else {
        tasks.push({
          id: nextId++,
          ...taskData,
          created_at: Date.now()
        });
      }
    }

    closeTaskModal();
    await loadTasks();
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

  function updatePriorityFilter() {
    selectedPriorities = Array.from(priorityOptions)
      .filter(option => option.checked)
      .map(option => option.value);
    priorityFilterLabel.textContent = selectedPriorities.length > 0
      ? `Prioridad (${selectedPriorities.length})`
      : 'Prioridad';
    renderTasks();
  }

  priorityFilterBtn.addEventListener('click', function() {
    const isOpen = !priorityMenu.hidden;
    priorityMenu.hidden = isOpen;
    priorityFilterBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  priorityOptions.forEach(option => {
    option.addEventListener('change', updatePriorityFilter);
  });

  clearPriorityFilter.addEventListener('click', function() {
    priorityOptions.forEach(option => {
      option.checked = false;
    });
    updatePriorityFilter();
  });

  document.addEventListener('click', function(e) {
    if (!priorityFilter.contains(e.target)) {
      priorityMenu.hidden = true;
      priorityFilterBtn.setAttribute('aria-expanded', 'false');
    }
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

  if (isSupabaseEnabled()) {
    restoreSession().catch(() => {
      loginScreen.hidden = false;
      appContent.hidden = true;
    });
  }

  // Verificar fechas cada 60 segundos
  setInterval(checkDeadlines, 60000);

  // Exponer para debug
  window.__tasks = tasks;
})();
