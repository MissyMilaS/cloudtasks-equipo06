# CloudTasks

Aplicación web para la gestión de tareas personales o de un equipo de trabajo.

## Tecnologías

- HTML
- CSS
- JavaScript
- Git
- GitHub
- Supabase
- PostgreSQL
- Vercel
- Cloudflare

## Estructura inicial

```text
cloudtasks-equipoXX/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── README.md
└── .gitignore
```

## Etapas

1. Desarrollo local con HTML, CSS, JavaScript, Git y GitHub.
2. Persistencia con Supabase/PostgreSQL y despliegue con Vercel.
3. Integración de Cloudflare para DNS, HTTPS/TLS y acceso seguro.

## Integrantes

- Camilo Toro Agudelo
- Estudiante 2
- Estudiante 3
- Estudiante 4
- Estudiante 5

## Inicio

Abrir `index.html` en el navegador o usar Live Server en Visual Studio Code.

> Antes de crear el repositorio remoto, reemplacen `XX` por el número real del equipo.

## Integracion con Supabase

La aplicación conserva un modo demo cuando no hay configuración y usa Supabase cuando se completan estos valores en `js/supabase-config.js`:

```javascript
window.CLOUDTASKS_SUPABASE_URL = 'https://tu-proyecto.supabase.co';
window.CLOUDTASKS_SUPABASE_ANON_KEY = 'tu-anon-key';
```

Solo debe utilizarse la clave pública `anon`. Nunca se debe colocar una `service_role key` en el frontend.

El cliente se carga desde CDN en `index.html`. La autenticación se realiza con Supabase Auth y el rol se obtiene desde `profiles` usando el mismo `id` del usuario autenticado.

## Esquema recomendado

Ejecutar en el SQL Editor de Supabase:

```sql
create type public.app_role as enum ('administrador', 'lider', 'usuario');
create type public.task_status as enum ('sin-empezar', 'iniciado', 'en-progreso', 'terminado', 'sin-terminar');
create type public.task_priority as enum ('baja', 'media', 'alta', 'urgente');

create table public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	name text not null,
	email text not null unique,
	role public.app_role not null
);

create table public.tasks (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	description text not null,
	completed boolean not null default false,
	status public.task_status not null default 'sin-empezar',
	created_at timestamptz not null default now(),
	deadline timestamptz not null,
	priority public.task_priority not null,
	leader_id uuid not null references public.profiles(id)
);

create table public.task_assignments (
	task_id uuid not null references public.tasks(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	primary key (task_id, user_id)
);

create index tasks_leader_id_idx on public.tasks(leader_id);
create index task_assignments_user_id_idx on public.task_assignments(user_id);
```

`tasks.leader_id` representa exactamente un líder por tarea. `task_assignments` representa la relación muchos a muchos de usuarios normales y no debe reemplazarse por una lista dentro de `tasks`.

Después de crear perfiles, validar que `leader_id` solo apunte a perfiles con rol `lider` y que `task_assignments.user_id` solo apunte a perfiles con rol `usuario`. Esta validación puede hacerse con un trigger de PostgreSQL; el selector del frontend también filtra esos roles, pero no reemplaza la validación de la base de datos.

## RLS minimo

Activar RLS en las tres tablas. Estas políticas son una base inicial; deben probarse con usuarios reales antes de publicar:

```sql
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;

create policy "authenticated profiles can read"
on public.profiles for select to authenticated
using (true);

create policy "tasks visible by role"
on public.tasks for select to authenticated
using (
	exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador')
	or leader_id = auth.uid()
	or exists (
		select 1 from public.task_assignments a
		where a.task_id = tasks.id and a.user_id = auth.uid()
	)
);

create policy "administrators create tasks"
on public.tasks for insert to authenticated
with check (
	exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador')
);

create policy "administrators update tasks"
on public.tasks for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));

create policy "leaders update assigned status"
on public.tasks for update to authenticated
using (leader_id = auth.uid())
with check (leader_id = auth.uid());

create policy "administrators delete tasks"
on public.tasks for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));

create policy "users read assignments"
on public.task_assignments for select to authenticated
using (user_id = auth.uid() or exists (
	select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'
));

create policy "administrators manage assignments"
on public.task_assignments for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador'));
```

RLS no restringe por sí solo columnas concretas en un `update`. Para impedir que un líder cambie título, fecha, prioridad o `leader_id`, usar permisos de columna o un trigger que compare `OLD` y `NEW` y solo permita cambios en `status` y `completed` cuando `auth.uid()` sea el líder.

## Pruebas por rol

1. Crear tres usuarios en Supabase Auth y un perfil para cada uno: `administrador`, `lider` y `usuario`.
2. Como administrador, crear una tarea con exactamente un líder y cero o varios usuarios normales; comprobar edición, asignaciones y eliminación.
3. Como líder, comprobar que solo aparecen sus tareas y que únicamente puede actualizar estado o completarlas.
4. Como usuario normal, asignarlo a una tarea y comprobar que solo ve esa tarea y no tiene controles de edición, estado, creación o eliminación.
5. Probar también el acceso directo a las consultas desde el navegador: el resultado debe seguir limitado por RLS aunque se manipule el JavaScript.

## Archivos de esta adaptación

- `index.html`: carga Supabase y añade los selectores administrativos de líder y usuarios.
- `js/supabase-config.js`: configura URL y clave `anon` públicas.
- `js/app.js`: integra Auth, perfiles, roles, visibilidad, CRUD y asignaciones, con fallback demo sin credenciales.
- `css/styles.css`: se conserva sin cambios visuales.
