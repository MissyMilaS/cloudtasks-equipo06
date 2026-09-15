/**
 * funciones.js
 * Copia exacta de las funciones puras de app.js para probarlas
 * de forma aislada, sin DOM ni Supabase.
 *
 * REGLA: Si una función cambia en app.js, actualizarla aquí también.
 */

// ── escapeHtml ─────────────────────────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

// ── Etiquetas de estado y prioridad ───────────────────────────────────────
function getStatusLabel(status) {
  const labels = {
    'sin-empezar':  '⬜ Sin empezar',
    'iniciado':     '🟦 Iniciado',
    'en-progreso':  '🟨 En progreso',
    'terminado':    '✅ Terminado',
    'sin-terminar': '❌ Sin terminar'
  };
  return labels[status] || status;
}

function getPriorityLabel(priority) {
  const labels = { baja: '🟢 Baja', media: '🟡 Media', alta: '🔴 Alta', urgente: '🟣 Urgente' };
  return labels[priority] || priority;
}

function getStatusClass(status)    { return `status-${status}`; }
function getPriorityClass(priority){ return `priority-${priority}`; }

// ── normalizeTaskState ─────────────────────────────────────────────────────
function normalizeTaskState(task) {
  if (!task) return task;
  const editable = ['sin-empezar', 'iniciado', 'en-progreso'];

  if (task.completed === true || task.status === 'terminado') {
    task.status = 'terminado';
    task.completed = true;
    return task;
  }
  if (task.deadline && new Date(task.deadline).getTime() < Date.now()) {
    if (editable.includes(task.status)) task.statusBeforeOverdue = task.status;
    task.status = 'sin-terminar';
    task.completed = false;
    return task;
  }
  if (task.status === 'sin-terminar' && editable.includes(task.statusBeforeOverdue)) {
    task.status = task.statusBeforeOverdue;
    delete task.statusBeforeOverdue;
  }
  if (!['sin-empezar', 'iniciado', 'en-progreso', 'sin-terminar'].includes(task.status)) {
    task.status = 'sin-empezar';
  }
  task.completed = false;
  return task;
}

// ── getEditStatusOptions ───────────────────────────────────────────────────
function getEditStatusOptions(currentStatus, isOverdue) {
  if (isOverdue || currentStatus === 'sin-terminar') return ['sin-terminar'];
  if (currentStatus === 'terminado') return ['terminado'];
  const map = {
    'sin-empezar': ['sin-empezar', 'iniciado'],
    'iniciado':    ['iniciado', 'en-progreso'],
    'en-progreso': ['en-progreso']
  };
  return map[currentStatus] || ['sin-empezar', 'iniciado'];
}

// ── isTaskOverdue ──────────────────────────────────────────────────────────
function isTaskOverdue(task) {
  return !!task.deadline &&
    new Date(task.deadline).getTime() < Date.now() &&
    task.status !== 'terminado';
}

// ── formatDateInput ────────────────────────────────────────────────────────
function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 16);
}

// ── sortTasks ──────────────────────────────────────────────────────────────
const priorityOrder = { urgente: 4, alta: 3, media: 2, baja: 1 };

function sortTasks(taskList) {
  return taskList
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const dA = a.task.deadline ? new Date(a.task.deadline).getTime() : Infinity;
      const dB = b.task.deadline ? new Date(b.task.deadline).getTime() : Infinity;
      const diffDeadline = dA - dB;
      if (diffDeadline !== 0) return diffDeadline;
      const diffPriority = (priorityOrder[b.task.priority] || 0) - (priorityOrder[a.task.priority] || 0);
      return diffPriority || a.index - b.index;
    })
    .map(({ task }) => task);
}

// ── getVisibleTasks ────────────────────────────────────────────────────────
function getVisibleTasks(taskList, profile) {
  if (!profile) return [];
  if (profile.role === 'administrador' || profile.role === 'admin') return taskList;
  if (profile.role === 'lider') return taskList.filter(t => t.leader_id === profile.id);
  return taskList.filter(t => (t.assigned_user_ids || []).includes(profile.id));
}
