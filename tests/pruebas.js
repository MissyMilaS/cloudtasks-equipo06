/**
 * pruebas.js — CloudTasks (Equipo 06)
 *
 * 51 casos de prueba sistemáticos.
 * Cada caso tiene:
 *   tipo: 'normal'  → flujo esperado / camino feliz
 *         'error'   → entrada inválida, nula o inesperada
 *         'limite'  → condición de frontera o caso extremo
 *
 * El runner (runner.html) ejecuta fn() y compara con `esperado`.
 */

const AYER   = new Date(Date.now() - 86400000).toISOString(); // deadline pasado
const MANANA = new Date(Date.now() + 86400000).toISOString(); // deadline futuro

const PRUEBAS = [

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 1 · escapeHtml
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P01', modulo: 'escapeHtml', tipo: 'normal',
    descripcion: 'Escapa etiqueta <script> (prevención XSS)',
    fn: () => escapeHtml('<script>alert(1)</script>'),
    esperado: '&lt;script&gt;alert(1)&lt;/script&gt;'
  },
  {
    id: 'P02', modulo: 'escapeHtml', tipo: 'normal',
    descripcion: 'Escapa el carácter &',
    fn: () => escapeHtml('Tom & Jerry'),
    esperado: 'Tom &amp; Jerry'
  },
  {
    id: 'P03', modulo: 'escapeHtml', tipo: 'normal',
    descripcion: 'Escapa comillas dobles',
    fn: () => escapeHtml('"hola"'),
    esperado: '&quot;hola&quot;'
  },
  {
    id: 'P04', modulo: 'escapeHtml', tipo: 'normal',
    descripcion: 'Escapa comilla simple',
    fn: () => escapeHtml("it's done"),
    esperado: 'it&#039;s done'
  },
  {
    id: 'P05', modulo: 'escapeHtml', tipo: 'normal',
    descripcion: 'Texto sin caracteres especiales queda igual',
    fn: () => escapeHtml('Texto normal sin especiales'),
    esperado: 'Texto normal sin especiales'
  },
  {
    id: 'P06', modulo: 'escapeHtml', tipo: 'error',
    descripcion: 'Entrada null → cadena vacía (no lanza error)',
    fn: () => escapeHtml(null),
    esperado: ''
  },
  {
    id: 'P07', modulo: 'escapeHtml', tipo: 'error',
    descripcion: 'Entrada undefined → cadena vacía (no lanza error)',
    fn: () => escapeHtml(undefined),
    esperado: ''
  },
  {
    id: 'P08', modulo: 'escapeHtml', tipo: 'limite',
    descripcion: 'Cadena vacía → cadena vacía',
    fn: () => escapeHtml(''),
    esperado: ''
  },

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 2 · normalizeTaskState
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P09', modulo: 'normalizeTaskState', tipo: 'normal',
    descripcion: 'completed:true fuerza status = terminado',
    fn: () => normalizeTaskState({ completed: true, status: 'iniciado' }).status,
    esperado: 'terminado'
  },
  {
    id: 'P10', modulo: 'normalizeTaskState', tipo: 'normal',
    descripcion: 'status terminado activa completed = true',
    fn: () => normalizeTaskState({ completed: false, status: 'terminado' }).completed,
    esperado: true
  },
  {
    id: 'P11', modulo: 'normalizeTaskState', tipo: 'normal',
    descripcion: 'Deadline pasado cambia status a sin-terminar',
    fn: () => normalizeTaskState({ completed: false, status: 'iniciado', deadline: AYER }).status,
    esperado: 'sin-terminar'
  },
  {
    id: 'P12', modulo: 'normalizeTaskState', tipo: 'normal',
    descripcion: 'Deadline pasado guarda el estado previo en statusBeforeOverdue',
    fn: () => normalizeTaskState({ completed: false, status: 'en-progreso', deadline: AYER }).statusBeforeOverdue,
    esperado: 'en-progreso'
  },
  {
    id: 'P13', modulo: 'normalizeTaskState', tipo: 'normal',
    descripcion: 'Deadline futuro no modifica el status',
    fn: () => normalizeTaskState({ completed: false, status: 'iniciado', deadline: MANANA }).status,
    esperado: 'iniciado'
  },
  {
    id: 'P14', modulo: 'normalizeTaskState', tipo: 'normal',
    descripcion: 'sin-terminar con statusBeforeOverdue válido → restaura estado anterior',
    fn: () => normalizeTaskState({ completed: false, status: 'sin-terminar', statusBeforeOverdue: 'en-progreso' }).status,
    esperado: 'en-progreso'
  },
  {
    id: 'P15', modulo: 'normalizeTaskState', tipo: 'error',
    descripcion: 'Entrada null → devuelve null sin lanzar error',
    fn: () => normalizeTaskState(null),
    esperado: null
  },
  {
    id: 'P16', modulo: 'normalizeTaskState', tipo: 'error',
    descripcion: 'Status desconocido → se normaliza a sin-empezar',
    fn: () => normalizeTaskState({ completed: false, status: 'estado-invalido' }).status,
    esperado: 'sin-empezar'
  },
  {
    id: 'P17', modulo: 'normalizeTaskState', tipo: 'limite',
    descripcion: 'Tarea sin deadline y status válido → no cambia nada',
    fn: () => normalizeTaskState({ completed: false, status: 'sin-empezar' }).status,
    esperado: 'sin-empezar'
  },

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 3 · getEditStatusOptions
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P18', modulo: 'getEditStatusOptions', tipo: 'normal',
    descripcion: 'sin-empezar (no vencida) → puede avanzar a iniciado',
    fn: () => getEditStatusOptions('sin-empezar', false),
    esperado: ['sin-empezar', 'iniciado']
  },
  {
    id: 'P19', modulo: 'getEditStatusOptions', tipo: 'normal',
    descripcion: 'iniciado (no vencida) → puede avanzar a en-progreso',
    fn: () => getEditStatusOptions('iniciado', false),
    esperado: ['iniciado', 'en-progreso']
  },
  {
    id: 'P20', modulo: 'getEditStatusOptions', tipo: 'normal',
    descripcion: 'en-progreso (no vencida) → solo puede quedarse en en-progreso',
    fn: () => getEditStatusOptions('en-progreso', false),
    esperado: ['en-progreso']
  },
  {
    id: 'P21', modulo: 'getEditStatusOptions', tipo: 'normal',
    descripcion: 'terminado → no puede retroceder',
    fn: () => getEditStatusOptions('terminado', false),
    esperado: ['terminado']
  },
  {
    id: 'P22', modulo: 'getEditStatusOptions', tipo: 'normal',
    descripcion: 'Tarea vencida → única opción es sin-terminar',
    fn: () => getEditStatusOptions('iniciado', true),
    esperado: ['sin-terminar']
  },
  {
    id: 'P23', modulo: 'getEditStatusOptions', tipo: 'error',
    descripcion: 'Status desconocido (no vencida) → fallback a [sin-empezar, iniciado]',
    fn: () => getEditStatusOptions('estado-inexistente', false),
    esperado: ['sin-empezar', 'iniciado']
  },
  {
    id: 'P24', modulo: 'getEditStatusOptions', tipo: 'limite',
    descripcion: 'sin-terminar (no vencida) → sigue siendo solo sin-terminar',
    fn: () => getEditStatusOptions('sin-terminar', false),
    esperado: ['sin-terminar']
  },

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 4 · isTaskOverdue
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P25', modulo: 'isTaskOverdue', tipo: 'normal',
    descripcion: 'Tarea con deadline pasado y no terminada → vencida',
    fn: () => isTaskOverdue({ deadline: AYER, status: 'iniciado' }),
    esperado: true
  },
  {
    id: 'P26', modulo: 'isTaskOverdue', tipo: 'normal',
    descripcion: 'Tarea con deadline futuro → no vencida',
    fn: () => isTaskOverdue({ deadline: MANANA, status: 'iniciado' }),
    esperado: false
  },
  {
    id: 'P27', modulo: 'isTaskOverdue', tipo: 'normal',
    descripcion: 'Tarea terminada con deadline pasado → NO se cuenta como vencida',
    fn: () => isTaskOverdue({ deadline: AYER, status: 'terminado' }),
    esperado: false
  },
  {
    id: 'P28', modulo: 'isTaskOverdue', tipo: 'error',
    descripcion: 'Tarea sin deadline → no vencida',
    fn: () => isTaskOverdue({ deadline: null, status: 'iniciado' }),
    esperado: false
  },
  {
    id: 'P29', modulo: 'isTaskOverdue', tipo: 'limite',
    descripcion: 'Tarea con deadline pasado y status sin-empezar → vencida',
    fn: () => isTaskOverdue({ deadline: AYER, status: 'sin-empezar' }),
    esperado: true
  },

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 5 · sortTasks
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P30', modulo: 'sortTasks', tipo: 'normal',
    descripcion: 'Deadline más próximo va primero',
    fn: () => sortTasks([
      { id: 'tarde',  deadline: MANANA, priority: 'media' },
      { id: 'pronto', deadline: AYER,   priority: 'media' }
    ])[0].id,
    esperado: 'pronto'
  },
  {
    id: 'P31', modulo: 'sortTasks', tipo: 'normal',
    descripcion: 'Mismo deadline: prioridad urgente antes que baja',
    fn: () => sortTasks([
      { id: 'baja',    deadline: MANANA, priority: 'baja' },
      { id: 'urgente', deadline: MANANA, priority: 'urgente' }
    ])[0].id,
    esperado: 'urgente'
  },
  {
    id: 'P32', modulo: 'sortTasks', tipo: 'normal',
    descripcion: 'Tarea sin deadline va al final',
    fn: () => sortTasks([
      { id: 'sin-fecha', deadline: null,   priority: 'alta' },
      { id: 'con-fecha', deadline: MANANA, priority: 'baja' }
    ]).pop().id,
    esperado: 'sin-fecha'
  },
  {
    id: 'P33', modulo: 'sortTasks', tipo: 'error',
    descripcion: 'Lista vacía → devuelve lista vacía sin error',
    fn: () => sortTasks([]),
    esperado: []
  },
  {
    id: 'P34', modulo: 'sortTasks', tipo: 'limite',
    descripcion: 'Un único elemento → devuelve ese mismo elemento',
    fn: () => sortTasks([{ id: 'solo', deadline: MANANA, priority: 'alta' }]).length,
    esperado: 1
  },

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 6 · getVisibleTasks
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P35', modulo: 'getVisibleTasks', tipo: 'normal',
    descripcion: 'Administrador ve todas las tareas',
    fn: () => getVisibleTasks(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      { id: 'adm', role: 'administrador' }
    ).length,
    esperado: 3
  },
  {
    id: 'P36', modulo: 'getVisibleTasks', tipo: 'normal',
    descripcion: 'Líder solo ve sus tareas (filtro por leader_id)',
    fn: () => getVisibleTasks(
      [
        { id: 1, leader_id: 'L1' },
        { id: 2, leader_id: 'L2' },
        { id: 3, leader_id: 'L1' }
      ],
      { id: 'L1', role: 'lider' }
    ).length,
    esperado: 2
  },
  {
    id: 'P37', modulo: 'getVisibleTasks', tipo: 'normal',
    descripcion: 'Usuario solo ve tareas en las que está asignado',
    fn: () => getVisibleTasks(
      [
        { id: 1, assigned_user_ids: ['U1', 'U2'] },
        { id: 2, assigned_user_ids: ['U3'] },
        { id: 3, assigned_user_ids: ['U2'] }
      ],
      { id: 'U2', role: 'usuario' }
    ).length,
    esperado: 2
  },
  {
    id: 'P38', modulo: 'getVisibleTasks', tipo: 'normal',
    descripcion: 'Usuario sin ninguna tarea asignada → lista vacía',
    fn: () => getVisibleTasks(
      [{ id: 1, assigned_user_ids: ['U9'] }],
      { id: 'U2', role: 'usuario' }
    ).length,
    esperado: 0
  },
  {
    id: 'P39', modulo: 'getVisibleTasks', tipo: 'error',
    descripcion: 'Perfil null → lista vacía (no lanza error)',
    fn: () => getVisibleTasks([{ id: 1 }, { id: 2 }], null).length,
    esperado: 0
  },
  {
    id: 'P40', modulo: 'getVisibleTasks', tipo: 'error',
    descripcion: 'Usuario con tarea que no tiene assigned_user_ids → no falla',
    fn: () => getVisibleTasks(
      [{ id: 1 }],          // sin campo assigned_user_ids
      { id: 'U1', role: 'usuario' }
    ).length,
    esperado: 0
  },
  {
    id: 'P41', modulo: 'getVisibleTasks', tipo: 'limite',
    descripcion: 'Administrador con lista vacía → devuelve lista vacía',
    fn: () => getVisibleTasks([], { id: 'adm', role: 'administrador' }).length,
    esperado: 0
  },

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 7 · formatDateInput
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P42', modulo: 'formatDateInput', tipo: 'normal',
    descripcion: 'ISO date completo → recorta a los primeros 16 caracteres',
    fn: () => formatDateInput('2026-09-14T23:00:00.000Z'),
    esperado: '2026-09-14T23:00'
  },
  {
    id: 'P43', modulo: 'formatDateInput', tipo: 'error',
    descripcion: 'Entrada null → cadena vacía (no lanza error)',
    fn: () => formatDateInput(null),
    esperado: ''
  },
  {
    id: 'P44', modulo: 'formatDateInput', tipo: 'limite',
    descripcion: 'Cadena con exactamente 16 caracteres → se devuelve completa',
    fn: () => formatDateInput('2026-09-14T23:00'),
    esperado: '2026-09-14T23:00'
  },

  // ════════════════════════════════════════════════════════════════════════
  // MÓDULO 8 · Etiquetas y clases CSS
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'P45', modulo: 'getStatusLabel', tipo: 'normal',
    descripcion: 'sin-empezar → etiqueta correcta',
    fn: () => getStatusLabel('sin-empezar'),
    esperado: '⬜ Sin empezar'
  },
  {
    id: 'P46', modulo: 'getStatusLabel', tipo: 'normal',
    descripcion: 'terminado → etiqueta correcta',
    fn: () => getStatusLabel('terminado'),
    esperado: '✅ Terminado'
  },
  {
    id: 'P47', modulo: 'getStatusLabel', tipo: 'normal',
    descripcion: 'en-progreso → etiqueta correcta',
    fn: () => getStatusLabel('en-progreso'),
    esperado: '🟨 En progreso'
  },
  {
    id: 'P48', modulo: 'getStatusLabel', tipo: 'error',
    descripcion: 'Status desconocido → se devuelve tal cual (pass-through)',
    fn: () => getStatusLabel('estado-raro'),
    esperado: 'estado-raro'
  },
  {
    id: 'P49', modulo: 'getPriorityLabel', tipo: 'normal',
    descripcion: 'urgente → etiqueta correcta',
    fn: () => getPriorityLabel('urgente'),
    esperado: '🟣 Urgente'
  },
  {
    id: 'P50', modulo: 'getPriorityLabel', tipo: 'error',
    descripcion: 'Prioridad desconocida → pass-through',
    fn: () => getPriorityLabel('extrema'),
    esperado: 'extrema'
  },
  {
    id: 'P51', modulo: 'getStatusClass / getPriorityClass', tipo: 'normal',
    descripcion: 'getStatusClass y getPriorityClass generan clases CSS correctas',
    fn: () => getStatusClass('en-progreso') + '|' + getPriorityClass('alta'),
    esperado: 'status-en-progreso|priority-alta'
  }

];
