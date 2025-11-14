# EduFlow - Plataforma de Aprendizaje en Línea

EduFlow es una moderna plataforma de aprendizaje para la creación y gestión de cursos. Permite a los educadores registrarse, crear cursos detallados, subir contenido multimedia y previsualizar sus cursos antes de publicarlos.

## 🚀 Características

- ✅ **Autenticación completa** con Supabase Auth
- ✅ **Gestión de cursos** con módulos y lecciones
- ✅ **Subida de archivos** a Supabase Storage (imágenes de cursos, videos MP4 y PDFs)
- ✅ **Drag & Drop** para reordenar módulos y lecciones
- ✅ **Vista previa** de cursos antes de publicar
- ✅ **Interfaz moderna** con Tailwind CSS y modo oscuro
- ✅ **Notificaciones toast** para mejor UX

## 📋 Requisitos Previos

- Node.js 18+ y npm/yarn
- Una cuenta de Supabase (gratuita en [supabase.com](https://supabase.com))
- Un proyecto de Supabase configurado

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
# Instalar dependencias
yarn install
# o
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
cp .env.example .env
```

Edita `.env` y agrega tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
```

Puedes encontrar estas credenciales en tu proyecto de Supabase:
- Ve a **Settings** → **API**
- Copia la **URL** del proyecto y la **anon/public key**

### 3. Configurar la base de datos en Supabase

1. Ve a tu proyecto de Supabase
2. Abre el **SQL Editor**
3. Ejecuta las migraciones en orden cronológico:

   - `supabase/migrations/20250101000000_initial_schema.sql` (esquema inicial)
   - `supabase/migrations/20250101000001_fix_search_path.sql` (corrección de seguridad)
   - `supabase/migrations/20250101000002_harden_functions_and_auth.sql` (hardening de funciones)
   - `supabase/migrations/20250101000003_finalize_schema_and_dnd.sql` (finalización del esquema)
   - `supabase/migrations/20250101000005_atomic_course_save.sql` (guardado atómico)
   - `supabase/migrations/20250101000011_final_fixes_and_architecture.sql` (correcciones finales)
   - `supabase/migrations/20250101000012_fix_null_content_handling.sql` (manejo de contenido null) ⚠️ **NUEVA**

   **Importante:** Ejecuta las migraciones en orden, una por una, verificando que cada una se ejecute correctamente antes de continuar.

### 4. Configurar Storage Buckets

Los buckets de almacenamiento se crean automáticamente con la primera migración, pero verifica que estén configurados:

1. Ve a **Storage** en tu dashboard de Supabase
2. Verifica que existan estos buckets:
   - `course-images` (público) - para imágenes de cursos
   - `lesson-files` (público) - para videos MP4 y PDFs de lecciones

### 5. Habilitar protección de contraseñas comprometidas (Recomendado)

1. Ve a **Authentication** → **Settings** en tu dashboard de Supabase
2. Encuentra la sección **Leaked Password Protection**
3. Habilita esta opción para mayor seguridad

### 6. Ejecutar la aplicación

```bash
yarn dev
# o
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📚 Estructura del Proyecto

```
EduFlowDualite/
├── components/          # Componentes React
│   ├── Auth.tsx        # Componente de autenticación
│   ├── CourseEditor.tsx # Editor de cursos
│   ├── CoursePreview.tsx # Vista previa de cursos
│   └── icons.tsx       # Iconos SVG
├── lib/
│   └── supabaseClient.ts # Cliente de Supabase
├── supabase/
│   └── migrations/     # Migraciones SQL
├── types.ts           # Definiciones de tipos TypeScript
├── App.tsx            # Componente principal
├── index.tsx          # Punto de entrada
└── package.json       # Dependencias
```

## 🎯 Uso

### Registro e Inicio de Sesión

1. Al abrir la aplicación, verás la pantalla de autenticación
2. Para crear una cuenta:
   - Haz clic en "Regístrate"
   - Ingresa tu email y contraseña
   - Selecciona tu rol (Docente, Estudiante o Coordinador)
   - **Importante:** Solo los usuarios con rol "Docente" pueden crear y editar cursos
3. Verifica tu email (si la verificación de email está habilitada en Supabase)

### Crear un Curso

1. Una vez autenticado como Docente, verás el dashboard
2. Haz clic en "Crear Nuevo Curso"
3. Completa la información del curso:
   - Título
   - Descripción
   - Categoría
   - Imagen del curso (opcional)
4. Agrega módulos haciendo clic en "Agregar Módulo"
5. Dentro de cada módulo, agrega lecciones con "Agregar Lección"
6. Para cada lección, puedes:
   - Subir un archivo (MP4 para videos o PDF)
   - Ver el progreso de subida
   - Eliminar el archivo si es necesario
7. Usa drag & drop para reordenar módulos y lecciones
8. Haz clic en "Guardar Cambios" para persistir todo en Supabase

### Vista Previa

- Haz clic en "Vista Previa" en el editor para ver cómo se verá el curso para los estudiantes
- Navega entre módulos y lecciones desde la barra lateral

### Publicar un Curso

- En el editor, activa el toggle "Publicado" para hacer el curso visible
- Los cursos publicados pueden ser vistos por estudiantes (si implementas esa funcionalidad)

## 🔒 Seguridad

- **Row Level Security (RLS)** está habilitado en todas las tablas
- Los docentes solo pueden ver y editar sus propios cursos
- Los estudiantes solo pueden ver cursos publicados (si implementas esa vista)
- Las funciones de base de datos usan `SECURITY DEFINER` con `search_path` fijo para prevenir vulnerabilidades

## 🐛 Solución de Problemas

### Error: "Supabase URL and Anon Key must be defined"
- Verifica que el archivo `.env` existe y contiene las variables correctas
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error al subir archivos
- Verifica que los buckets de Storage estén creados y sean públicos
- Verifica los límites de tamaño de archivo en Supabase (por defecto: 5MB para imágenes, 512MB para archivos de lecciones)

### Error al guardar cursos
- Verifica que todas las migraciones se hayan ejecutado correctamente
- Revisa la consola del navegador para ver errores específicos
- Verifica que estés autenticado como Docente

### La función RPC no funciona
- Asegúrate de haber ejecutado todas las migraciones, especialmente `20250101000012_fix_null_content_handling.sql`
- Verifica en el SQL Editor de Supabase que la función `save_course_with_children` existe

## 📝 Notas Técnicas

- El proyecto usa **Vite** como bundler
- **Tailwind CSS** para estilos
- **TypeScript** para type safety
- **React Hot Toast** para notificaciones
- **React Beautiful DnD** para drag & drop
- **Framer Motion** para animaciones

## 🤝 Contribuir

Este proyecto fue generado a través de Dualite. Para más información, visita [dualite.dev](https://dualite.dev).

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
