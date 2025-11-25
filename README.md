# 🎓 EduFlow - Plataforma de Aprendizaje en Línea

<div align="center">

![EduFlow](https://img.shields.io/badge/EduFlow-Learning%20Platform-indigo?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)
![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=for-the-badge&logo=netlify)

**Una plataforma moderna tipo Udemy para la creación y gestión de cursos online**

[🌐 Ver Demo en Vivo](https://sparkling-cannoli-ab13a6.netlify.app/) | [📖 Documentación](#-uso) | [🚀 Instalación](#-instalación)

</div>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características Principales](#-características-principales)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Seguridad](#-seguridad)
- [Despliegue](#-despliegue)
- [Solución de Problemas](#-solución-de-problemas)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Descripción

**EduFlow** es una plataforma de aprendizaje en línea profesional diseñada para educadores que desean crear, gestionar y publicar cursos online. Inspirada en plataformas como Udemy, EduFlow ofrece una experiencia intuitiva y completa para la creación de contenido educativo estructurado en módulos y lecciones.

La plataforma permite a los docentes:
- Crear cursos con estructura modular (módulos → lecciones)
- Subir contenido multimedia (videos MP4 y documentos PDF)
- Organizar contenido mediante drag & drop
- Previsualizar cursos antes de publicarlos
- Gestionar múltiples cursos desde un dashboard centralizado

---

## ✨ Características Principales

### 🔐 Autenticación y Autorización
- **Autenticación completa** con Supabase Auth
- **Sistema de roles**: Docente, Estudiante, Coordinador
- **Control de acceso**: Solo docentes pueden crear y editar cursos
- **Protección de contraseñas comprometidas** (opcional)

### 📚 Gestión de Cursos
- **Creación de cursos** con información completa (título, descripción, categoría, imagen)
- **Estructura modular**: Organiza contenido en módulos y lecciones
- **Drag & Drop**: Reordena módulos y lecciones de forma intuitiva
- **Estados de publicación**: Borrador o Publicado
- **Vista previa**: Visualiza el curso desde la perspectiva del estudiante

### 📁 Gestión de Archivos
- **Subida de imágenes** para portadas de cursos (Supabase Storage)
- **Soporte multimedia**: Videos MP4 y documentos PDF
- **Barra de progreso** en tiempo real durante la subida
- **Vista previa de contenido** integrada en el editor
- **Gestión de archivos**: Eliminación y reemplazo de contenido

### 🎨 Interfaz de Usuario
- **Diseño moderno** con Tailwind CSS
- **Modo oscuro** integrado
- **Responsive design** para todos los dispositivos
- **Animaciones fluidas** con Framer Motion
- **Notificaciones toast** para feedback inmediato
- **UX optimizada** con estados de carga y errores

### 🔒 Seguridad
- **Row Level Security (RLS)** en todas las tablas
- **Políticas de acceso** basadas en roles y propiedad
- **Funciones de base de datos** con `SECURITY DEFINER` y `search_path` fijo
- **Validación de tipos** con TypeScript
- **Protección contra vulnerabilidades** SQL injection

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **[React](https://react.dev/)** 18.2 - Biblioteca de UI
- **[TypeScript](https://www.typescriptlang.org/)** 5.4 - Tipado estático
- **[Vite](https://vitejs.dev/)** 5.3 - Build tool y dev server
- **[Tailwind CSS](https://tailwindcss.com/)** 3.4 - Framework CSS utility-first
- **[Framer Motion](https://www.framer.com/motion/)** 11.2 - Animaciones
- **[React Beautiful DnD](https://github.com/atlassian/react-beautiful-dnd)** 13.1 - Drag & Drop
- **[React Hot Toast](https://react-hot-toast.com/)** 2.4 - Notificaciones

### Backend & Base de Datos
- **[Supabase](https://supabase.com/)** - Backend as a Service
  - **PostgreSQL** - Base de datos relacional
  - **Supabase Auth** - Autenticación y autorización
  - **Supabase Storage** - Almacenamiento de archivos
  - **Row Level Security (RLS)** - Seguridad a nivel de fila

### Herramientas de Desarrollo
- **[PostCSS](https://postcss.org/)** 8.4 - Procesamiento CSS
- **[Autoprefixer](https://github.com/postcss/autoprefixer)** 10.4 - Compatibilidad CSS
- **[UUID](https://www.npmjs.com/package/uuid)** 9.0 - Generación de IDs únicos

### Despliegue
- **[Netlify](https://www.netlify.com/)** - Hosting y CI/CD
- **Node.js** 18+ - Runtime de JavaScript

---

## 📁 Estructura del Proyecto

```
EduFlow/
├── components/                    # Componentes React
│   ├── Auth.tsx                  # Componente de autenticación (login/registro)
│   ├── CourseEditor.tsx          # Editor completo de cursos
│   ├── CoursePreview.tsx         # Vista previa del curso
│   └── icons.tsx                 # Iconos SVG personalizados
│
├── lib/                          # Utilidades y configuraciones
│   └── supabaseClient.ts         # Cliente configurado de Supabase
│
├── supabase/
│   └── migrations/               # Migraciones SQL de la base de datos
│       ├── 20250101000000_initial_schema.sql
│       ├── 20250101000001_fix_search_path.sql
│       ├── 20250101000002_harden_functions_and_auth.sql
│       ├── 20250101000003_finalize_schema_and_dnd.sql
│       ├── 20250101000005_atomic_course_save.sql
│       ├── 20250101000011_final_fixes_and_architecture.sql
│       └── 20250101000012_fix_null_content_handling.sql
│
├── App.tsx                       # Componente principal de la aplicación
├── index.tsx                     # Punto de entrada de la aplicación
├── types.ts                      # Definiciones de tipos TypeScript
├── index.html                    # Template HTML
├── index.css                     # Estilos globales
│
├── vite.config.ts                # Configuración de Vite
├── tailwind.config.js            # Configuración de Tailwind CSS
├── postcss.config.js             # Configuración de PostCSS
├── tsconfig.json                 # Configuración de TypeScript
├── netlify.toml                  # Configuración de despliegue en Netlify
├── package.json                  # Dependencias y scripts del proyecto
└── README.md                     # Este archivo
```

### Descripción de Componentes Principales

- **`App.tsx`**: Componente raíz que gestiona el estado global, autenticación, y navegación entre vistas (Dashboard, Editor, Preview)
- **`Auth.tsx`**: Maneja el registro e inicio de sesión de usuarios con validación de roles
- **`CourseEditor.tsx`**: Editor completo con funcionalidades de drag & drop, subida de archivos, y gestión de módulos/lecciones
- **`CoursePreview.tsx`**: Vista previa del curso desde la perspectiva del estudiante
- **`supabaseClient.ts`**: Cliente singleton de Supabase configurado con variables de entorno

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** 18 o superior
- **npm** o **yarn**
- Una cuenta de **Supabase** (gratuita en [supabase.com](https://supabase.com))
- Un proyecto de Supabase configurado

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/EduFlow.git
cd EduFlow
```

### Paso 2: Instalar Dependencias

```bash
npm install
# o
yarn install
```

### Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
```

**Cómo obtener las credenciales:**
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Settings** → **API**
3. Copia la **Project URL** y la **anon/public key**

---

## ⚙️ Configuración

### Configuración de la Base de Datos

1. **Abre el SQL Editor** en tu proyecto de Supabase
2. **Ejecuta las migraciones en orden cronológico**:

```sql
-- Ejecuta cada migración una por una, en este orden:
1. supabase/migrations/20250101000000_initial_schema.sql
2. supabase/migrations/20250101000001_fix_search_path.sql
3. supabase/migrations/20250101000002_harden_functions_and_auth.sql
4. supabase/migrations/20250101000003_finalize_schema_and_dnd.sql
5. supabase/migrations/20250101000005_atomic_course_save.sql
6. supabase/migrations/20250101000011_final_fixes_and_architecture.sql
7. supabase/migrations/20250101000012_fix_null_content_handling.sql
```

⚠️ **Importante**: Ejecuta las migraciones en orden, verificando que cada una se complete correctamente antes de continuar.

### Configuración de Storage Buckets

Los buckets se crean automáticamente con la primera migración. Verifica que existan:

1. Ve a **Storage** en tu dashboard de Supabase
2. Verifica que existan estos buckets públicos:
   - `course-images` - Para imágenes de portada de cursos
   - `lesson-files` - Para videos MP4 y PDFs de lecciones

### Configuración de Seguridad (Recomendado)

1. Ve a **Authentication** → **Settings** en Supabase
2. Habilita **Leaked Password Protection** para mayor seguridad

---

## 🎯 Uso

### Inicio de Sesión y Registro

1. Al abrir la aplicación, verás la pantalla de autenticación
2. **Para registrarse**:
   - Haz clic en "Regístrate"
   - Ingresa tu email y contraseña
   - Selecciona tu rol (Docente, Estudiante o Coordinador)
   - ⚠️ **Solo usuarios con rol "Docente" pueden crear y editar cursos**
3. Verifica tu email si la verificación está habilitada en Supabase

### Crear un Curso

1. **Accede al Dashboard**: Una vez autenticado como Docente, verás tu dashboard
2. **Crear nuevo curso**: Haz clic en "Crear Nuevo Curso"
3. **Completa la información básica**:
   - Título del curso
   - Descripción
   - Categoría
   - Imagen de portada (opcional, arrastra y suelta o haz clic para seleccionar)
4. **Agregar módulos**: Haz clic en "Agregar Módulo" y dale un título
5. **Agregar lecciones**: Dentro de cada módulo, haz clic en "Agregar Lección"
6. **Subir contenido**:
   - Para cada lección, puedes subir un archivo (MP4 para videos o PDF)
   - Observa la barra de progreso durante la subida
   - Puedes eliminar o reemplazar archivos si es necesario
7. **Reorganizar contenido**: Usa drag & drop para reordenar módulos y lecciones
8. **Guardar cambios**: Haz clic en "Guardar Cambios" para persistir todo en Supabase

### Vista Previa

- Haz clic en "Vista Previa" en el editor para ver cómo se verá el curso para los estudiantes
- Navega entre módulos y lecciones desde la barra lateral
- Visualiza videos y documentos directamente en el navegador

### Publicar un Curso

- En el editor, activa el toggle "Publicado" para hacer el curso visible
- Los cursos publicados pueden ser vistos por estudiantes (si implementas esa funcionalidad)
- Los cursos en borrador solo son visibles para el docente propietario

### Gestionar Cursos Existentes

- **Editar**: Haz clic en el icono de editar en la tarjeta del curso
- **Eliminar**: Haz clic en el icono de eliminar (se requiere confirmación)
- **Ver estado**: El estado (Publicado/Borrador) se muestra en cada tarjeta

---

## 🔒 Seguridad

EduFlow implementa múltiples capas de seguridad:

### Row Level Security (RLS)
- **Habilitado en todas las tablas**: `profiles`, `courses`, `modules`, `lessons`
- **Políticas de acceso**:
  - Los docentes solo pueden ver y editar sus propios cursos
  - Los estudiantes solo pueden ver cursos publicados
  - Los usuarios solo pueden modificar su propio perfil

### Funciones de Base de Datos
- **`SECURITY DEFINER`**: Funciones ejecutadas con permisos elevados pero controlados
- **`search_path` fijo**: Previene vulnerabilidades de inyección SQL
- **Validación de entrada**: Todas las entradas son validadas antes de procesarse

### Autenticación
- **Supabase Auth**: Sistema robusto de autenticación
- **Tokens JWT**: Manejo seguro de sesiones
- **Protección de contraseñas**: Opción de protección contra contraseñas comprometidas

### Frontend
- **TypeScript**: Validación de tipos en tiempo de compilación
- **Validación de formularios**: Validación tanto en cliente como servidor
- **Sanitización**: Contenido sanitizado antes de mostrar

---

## 🌐 Despliegue

### Despliegue en Netlify

EduFlow está configurado para desplegarse fácilmente en Netlify:

1. **Conecta tu repositorio** a Netlify
2. **Configura las variables de entorno** en Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Netlify detectará automáticamente** la configuración desde `netlify.toml`
4. **El despliegue se realizará automáticamente** en cada push a la rama principal

### Configuración de Netlify

El archivo `netlify.toml` ya está configurado con:
- Comando de build: `npm install && npm run build`
- Directorio de publicación: `dist`
- Node.js versión: 18

### Demo en Vivo

🌐 **[Ver aplicación desplegada](https://sparkling-cannoli-ab13a6.netlify.app/)**

---

## 🐛 Solución de Problemas

### Error: "Supabase URL and Anon Key must be defined"

**Solución:**
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Asegúrate de que las variables no tengan comillas ni espacios alrededor del `=`
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error al subir archivos

**Solución:**
- Verifica que los buckets de Storage estén creados y sean públicos
- Revisa los límites de tamaño en Supabase:
  - Imágenes: 5MB por defecto
  - Archivos de lecciones: 512MB por defecto
- Verifica los permisos de Storage en Supabase

### Error al guardar cursos

**Solución:**
- Verifica que todas las migraciones se hayan ejecutado correctamente
- Revisa la consola del navegador para errores específicos
- Asegúrate de estar autenticado como Docente
- Verifica que la función RPC `save_course_with_children` existe en Supabase

### La función RPC no funciona

**Solución:**
- Ejecuta la migración `20250101000012_fix_null_content_handling.sql`
- Verifica en el SQL Editor de Supabase que la función existe
- Revisa los logs de Supabase para errores específicos

### Problemas con drag & drop

**Solución:**
- Asegúrate de que `react-beautiful-dnd` esté correctamente instalado
- Verifica que los IDs de módulos y lecciones sean únicos
- Revisa la consola del navegador para errores de JavaScript

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para contribuir:

1. **Fork** el proyecto
2. Crea una **rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

### Guías de Contribución

- Sigue las convenciones de código existentes
- Añade tests para nuevas funcionalidades
- Actualiza la documentación según sea necesario
- Asegúrate de que el código pase los linters

---

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la [Licencia MIT](LICENSE).

---

## 👨‍💻 Autor

Desarrollado con ❤️ para la comunidad educativa.

---

## 🔗 Enlaces Útiles

- [🌐 Demo en Vivo](https://sparkling-cannoli-ab13a6.netlify.app/)
- [📚 Documentación de Supabase](https://supabase.com/docs)
- [⚛️ Documentación de React](https://react.dev/)
- [🎨 Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [⚡ Documentación de Vite](https://vitejs.dev/)

---

<div align="center">

**⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub ⭐**

Hecho con ❤️ usando React, TypeScript y Supabase

</div>
