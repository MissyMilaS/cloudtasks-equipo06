# 📋 CloudTasks — Gestor de Tareas Colaborativo

> **Aplicación web moderna** para gestionar tareas personales o de equipo con roles, permisos y persistencia en la nube.

[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://cloudtasks-equipo06.vercel.app)
[![Status](https://img.shields.io/badge/Status-Production-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()

---

## 🎯 ¿Qué es CloudTasks?

CloudTasks es una plataforma colaborativa que permite:

- ✅ **Crear y gestionar tareas** con prioridades y fechas límite
- 👥 **Asignar tareas** a miembros del equipo
- 🔐 **Control de permisos** por roles (Administrador, Líder, Usuario)
- 💾 **Persistencia en la nube** con Supabase y PostgreSQL
- 🚀 **Despliegue automático** en Vercel
- 🌐 **Dominio personalizado** con Cloudflare

---

## 🚀 Demo en Vivo

👉 **[Accede a CloudTasks](https://cloudtasks-equipo06.vercel.app/)**

**Credenciales de prueba (Modo Demo):**
```
Admin:       admin@cloudtasks.com / admin123
Líder:       lider1@cloudtasks.com / lider123
Usuario:     usuario1@cloudtasks.com / usuario123
```

---

## 📚 Documentación Rápida

| Sección | Descripción |
|---------|------------|
| [Inicio Rápido](#-inicio-rápido) | Cómo ejecutar localmente |
| [Estructura del Proyecto](#-estructura-del-proyecto) | Organización de archivos |
| [Tecnologías](#-tecnologías) | Stack técnico completo |
| [Roles y Permisos](#-roles-y-permisos) | Control de acceso |
| [Base de Datos](#-base-de-datos) | Schema y RLS |
| [Etapas de Desarrollo](#-etapas-de-desarrollo) | Roadmap del proyecto |
| [Equipo](#-equipo) | Integrantes |

---

## ⚡ Inicio Rápido

### 1️⃣ Opción A: Local (Modo Demo)

```bash
# Clonar repositorio
git clone https://github.com/MissyMilaS/cloudtasks-equipo06.git
cd cloudtasks-equipo06

# Abrir en navegador
# Opción 1: Click derecho → "Open with Live Server" en VS Code
# Opción 2: Abrir index.html directamente en el navegador
```

**✅ Sin configuración necesaria**  
→ Acceso inmediato con datos de prueba en memoria

---

### 2️⃣ Opción B: Con Supabase (Persistencia)

#### Paso 1: Crear proyecto en Supabase

```
1. Ir a https://supabase.com → Crear cuenta
2. Nuevo proyecto → Elegir región
3. Copiar credenciales del proyecto:
   - URL: https://tu-proyecto.supabase.co
   - ANON KEY: eyJ... (clave pública)
```

#### Paso 2: Configurar en CloudTasks

**Archivo:** `js/supabase-config.js`

```javascript
window.CLOUDTASKS_SUPABASE_URL = 'https://cznqqhlbzmpyxzjvcfrv.supabase.co';
window.CLOUDTASKS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

#### Paso 3: Crear esquema SQL

Copiar y ejecutar en el **SQL Editor** de Supabase:

<details>
<summary><strong>📌 Click para expandir script SQL</strong></summary>

```sql
-- ═════════════════════════════════════════════════════════════
-- TIPOS PERSONALIZADOS
-- ═════════════════════════════════════════════════════════════
CREATE TYPE public.app_role AS ENUM ('administrador', 'lider', 'usuario');
CREATE TYPE public.task_status AS ENUM ('sin-empezar', 'iniciado', 'en-progreso', 'terminado', 'sin-terminar');
CREATE TYPE public.task_priority AS ENUM ('baja', 'media', 'alta', 'urgente');

-- ═════════════════════════════════════════════════════════════
-- TABLA: PERFILES
-- ═════════════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- TABLA: TAREAS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  status public.task_status NOT NULL DEFAULT 'sin-empezar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline TIMESTAMPTZ NOT NULL,
  priority public.task_priority NOT NULL,
  leader_id UUID NOT NULL REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
-- TABLA: ASIGNACIONES (Relación muchos a muchos)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE public.task_assignments (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- ═════════════════════════════════════════════════════════════
-- ÍNDICES (Optimización de queries)
-- ═════════════════════════════════════════════════════════════
CREATE INDEX tasks_leader_id_idx ON public.tasks(leader_id);
CREATE INDEX task_assignments_user_id_idx ON public.task_assignments(user_id);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_deadline_idx ON public.tasks(deadline);
```

</details>

#### Paso 4: Activar Row Level Security (RLS)

<details>
<summary><strong>🔒 Click para expandir políticas RLS</strong></summary>

```sql
-- ═════════════════════════════════════════════════════════════
-- ACTIVAR RLS EN TODAS LAS TABLAS
-- ═════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- ═════════════════════════════════════════════════════════════
-- POLÍTICAS: PROFILES
-- ═════════════════════════════════════════════════════════════
CREATE POLICY "Usuarios autenticados leen perfiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (TRUE);

-- ═════════════════════════════════════════════════════════════
-- POLÍTICAS: TASKS
-- ═════════════════════════════════════════════════════════════

-- 1. LECTURA: Visible si eres admin, líder o asignado
CREATE POLICY "Tareas visibles por rol"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
    OR leader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.task_assignments a
      WHERE a.task_id = tasks.id AND a.user_id = auth.uid()
    )
  );

-- 2. CREACIÓN: Solo administradores
CREATE POLICY "Solo administradores crean tareas"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
  );

-- 3. ACTUALIZACIÓN: Solo administradores
CREATE POLICY "Solo administradores actualizan tareas"
  ON public.tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador'));

-- 4. ACTUALIZACIÓN: Líderes solo pueden cambiar estado
CREATE POLICY "Líderes actualizan estado"
  ON public.tasks FOR UPDATE TO authenticated
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());

-- 5. ELIMINACIÓN: Solo administradores
CREATE POLICY "Solo administradores eliminan tareas"
  ON public.tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador'));

-- ═════════════════════════════════════════════════════════════
-- POLÍTICAS: TASK_ASSIGNMENTS
-- ═════════════════════════════════════════════════════════════

-- 1. LECTURA: Ves tu asignación o eres admin
CREATE POLICY "Usuarios leen sus asignaciones"
  ON public.task_assignments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador')
  );

-- 2. GESTIÓN: Solo administradores
CREATE POLICY "Administradores gestionan asignaciones"
  ON public.task_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'administrador'));
```

</details>

#### Paso 5: Crear usuarios de prueba

En **Supabase Auth**:
1. Crear 3 usuarios: admin@, lider@, usuario@
2. Para cada uno, crear un perfil en la tabla `profiles`

```sql
INSERT INTO public.profiles (id, name, email, role) VALUES
  ('uuid-admin', 'Administrador', 'admin@cloudtasks.com', 'administrador'),
  ('uuid-lider', 'Líder de Proyecto', 'lider@cloudtasks.com', 'lider'),
  ('uuid-user', 'Usuario Base', 'usuario@cloudtasks.com', 'usuario');
```

---

## 📂 Estructura del Proyecto

```
cloudtasks-equipo06/
├── 📄 index.html              # Punto de entrada (login + app)
├── 🎨 css/
│   └── styles.css             # Estilos y diseño responsivo
├── ⚙️ js/
│   ├── app.js                 # Lógica principal (auth, CRUD, UI)
│   └── supabase-config.js     # Configuración de credenciales
├── 📝 README.md               # Este archivo
├── .gitignore                 # Archivos a ignorar en Git
└── 📚 doc/
    ├── plan_de_pruebas.md     # 51 casos de prueba
    └── cloudflare.md          # Configuración de dominio
```

---

## 🛠 Tecnologías

| Capa | Tecnología | Propósito |
|------|-----------|----------|
| **Frontend** | HTML5, CSS3, JavaScript vanilla | UI interactiva |
| **Autenticación** | Supabase Auth | Login seguro |
| **Base de datos** | PostgreSQL (Supabase) | Persistencia |
| **Control de acceso** | Row Level Security (RLS) | Seguridad por roles |
| **Hosting** | Vercel | Despliegue continuo |
| **DNS & CDN** | Cloudflare | Dominio y HTTPS |
| **Versionado** | Git + GitHub | Control de código |

---

## 👥 Roles y Permisos

### Matriz de Control de Acceso

| Acción | Administrador | Líder | Usuario |
|--------|:--:|:--:|:--:|
| **Crear tarea** | ✅ | ❌ | ❌ |
| **Ver todas las tareas** | ✅ | ❌ | ❌ |
| **Ver propias tareas** | ✅ | ✅ | ✅ |
| **Editar titulo/fecha** | ✅ | ❌ | ❌ |
| **Cambiar estado** | ✅ | ✅* | ❌ |
| **Asignar usuarios** | ✅ | ❌ | ❌ |
| **Eliminar tarea** | ✅ | ❌ | ❌ |

*Solo tareas que lidera

### Roles Explicados

```
┌─────────────────────────────────────────┐
│ 👨‍💼 ADMINISTRADOR                         │
├─────────────────────────────────────────┤
│ • Crea y elimina tareas                 │
│ • Asigna usuarios a tareas              │
│ • Designa líderes                       │
│ • Ve todas las tareas                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👤 LÍDER                                 │
├─────────────────────────────────────────┤
│ • Solo ve sus tareas asignadas          │
│ • Actualiza estado (iniciado → hecho)   │
│ • No puede crear ni eliminar            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👨‍💻 USUARIO                               │
├─────────────────────────────────────────┤
│ • Solo ve tareas asignadas              │
│ • No puede cambiar estado               │
│ • No puede crear ni eliminar            │
└─────────────────────────────────────────┘
```

---

## 🗄 Base de Datos

### Diagrama de Relaciones

```
┌──────────────────────────┐
│       profiles           │
├──────────────────────────┤
│ id (UUID) [PK]          │◄─────┐
│ name                    │      │
│ email (UNIQUE)          │      │
│ role (admin/lider/user) │      │
│ created_at              │      │
└──────────────────────────┘      │
         │                        │
         │ references            │
         │                        │
         ▼                        │
┌──────────────────────────┐      │
│       tasks              │      │
├──────────────────────────┤      │
│ id (UUID) [PK]          │      │
│ title                   │      │
│ description             │      │
│ status                  │      │
│ priority                │      │
│ deadline                │      │
│ completed               │      │
│ leader_id (FK) ─────────┼──────┘
│ created_at              │
│ updated_at              │
└──────────────────────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────────────┐
│  task_assignments       │
├──────────────────────────┤
│ task_id (FK)            │
│ user_id (FK) ───────────┼──► profiles
│ assigned_at             │
│ [PK: task_id, user_id]  │
└──────────────────────────┘
```

### Estados de Tarea

```
⬜ sin-empezar      →  No ha comenzado
🟦 iniciado         →  Se comenzó el trabajo
🟨 en-progreso      →  Trabajando activamente
✅ terminado        →  Completado exitosamente
❌ sin-terminar     →  Vencida sin completar
```

### Prioridades

```
🟢 baja    → Puede esperar
🟡 media   → Importante
🔴 alta    → Urgente
🟣 urgente → Crítica
```

---

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS activado. Esto garantiza que:

- ✅ Un usuario **nunca puede ver** datos de otros usuarios
- ✅ Las restricciones se aplican en la **base de datos**, no en el frontend
- ✅ Manipular JavaScript **no bypasea la seguridad**

**Ejemplo:** Aunque cambies el user_id en la consola, RLS sigue protegiendo:

```javascript
// En consola del navegador
// Intentar acceder a tareas de otro usuario
supabase.from('tasks').select('*')
  .then(r => console.log(r))
  
// Resultado: RLS filtra automáticamente
// Solo ves tus tareas, aunque SQL sea correcto
```

---

## 📊 Etapas de Desarrollo

### Fase 1: Desarrollo Local ✅
- [x] Estructura HTML/CSS/JS
- [x] Lógica de autenticación demo
- [x] CRUD de tareas básico
- [x] Sistema de roles
- [x] Pruebas locales

### Fase 2: Persistencia en Nube 🔄
- [x] Supabase: Crear proyecto
- [x] PostgreSQL: Definir schema
- [x] RLS: Políticas de seguridad
- [x] Auth: Integración con Supabase Auth
- [x] Vercel: Despliegue automático

### Fase 3: Dominio Personalizado ⏳
- [ ] Cloudflare: Registrar dominio
- [ ] DNS: Apuntar a Vercel
- [ ] HTTPS: Certificado SSL/TLS
- [ ] Testing: Validar acceso por dominio

---

## 🧪 Pruebas

### Ejecutar Suite de Pruebas

```bash
# Abrir en navegador
tests/runner.html
```

**51 casos de prueba** cubriendo:
- Escapado de HTML (prevención XSS)
- Normalización de estado
- Lógica de edición
- Validación de fechas
- Control de acceso por rol

📖 **Documentación completa:** `doc/plan_de_pruebas.md`

### Checklist de Validación

```
✓ Crear tarea como admin
✓ Asignar usuarios a tarea
✓ Ver solo tareas propias como líder
✓ Cambiar estado como líder
✓ Bloquear edición como usuario
✓ Validar RLS en SQL
✓ Probar login con credenciales incorrectas
✓ Verificar sesión persistente
```

---

## 🌐 Despliegue

### GitHub → Vercel (Automático)

```
Push a main → GitHub Actions → Vercel Deploy → ✅ Live
```

**URL en vivo:**  
https://cloudtasks-equipo06.vercel.app

### Próximo: Dominio Personalizado

```
cloudtasks.eu.org  (en trámite con EU.org)
     ↓
  Cloudflare (DNS)
     ↓
    Vercel (Hosting)
     ↓
   HTTPS/TLS (Automático)
```

---

## 👨‍💻 Equipo

| Nombre | GitHub | Rol |
|--------|--------|-----|
| Camilo Toro Agudelo | [@Camitoro06](https://github.com/Camitoro06) | Frontend |
| Maria Alejandra Muñoz | [@Alejaruiz](https://github.com/Alejaruiz) | Backend |
| Heidy Yuliana Hernández | [@Heidy024](https://github.com/Heidy024) | DevOps |
| Sarah Rodriguez Ardila | [@SarahRoAr](https://github.com/SarahRoAr) | Testing |
| María Camila Salamanca | [@MissyMilaS](https://github.com/MissyMilaS) | Líder Técnico |

---

## 📚 Recursos Adicionales

- 📖 **Documentación SQL:** `doc/plan_de_pruebas.md`
- 🌐 **Configuración Cloudflare:** `doc/cloudflare.md`
- 🔗 **Supabase Docs:** https://supabase.com/docs
- 🚀 **Vercel Docs:** https://vercel.com/docs

---

## 🤝 Contribuir

¿Quieres contribuir? Abre un **Pull Request** siguiendo:

1. Crea una rama: `git checkout -b feature/tu-feature`
2. Haz cambios y prueba
3. Commit: `git commit -m "Descripción clara"`
4. Push: `git push origin feature/tu-feature`
5. Abre PR en GitHub

---

## 📄 Licencia

Este proyecto está bajo licencia **MIT**. Ver `LICENSE` para detalles.

---

## 📞 Contacto & Soporte

- 🐛 **Reportar bug:** [Abrir Issue](https://github.com/MissyMilaS/cloudtasks-equipo06/issues)
- 💬 **Preguntas:** [Discusiones](https://github.com/MissyMilaS/cloudtasks-equipo06/discussions)
- 📧 **Email:** contacto@cloudtasks.com (próximamente)

---

<div align="center">

**⭐ Si te gusta CloudTasks, dale una estrella en GitHub ⭐**

Hecho con ❤️ por el **Equipo 06**

</div>
