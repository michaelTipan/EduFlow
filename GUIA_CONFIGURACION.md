# 📘 Guía Paso a Paso: Configurar EduFlow

Esta guía te ayudará a ejecutar la migración SQL y configurar el archivo `.env` para que tu aplicación EduFlow funcione completamente.

---

## 🔧 Paso 1: Configurar el archivo .env

### 1.1 Crear el archivo .env

En la raíz del proyecto (donde está `package.json`), crea un archivo llamado `.env` (sin extensión).

**En Windows:**
- Abre el Bloc de notas o tu editor de código
- Guarda el archivo como `.env` (asegúrate de que no tenga extensión `.txt`)
- O usa PowerShell: `New-Item -Path .env -ItemType File`

**En Mac/Linux:**
```bash
touch .env
```

### 1.2 Obtener tus credenciales de Supabase

1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Selecciona tu proyecto (o créalo si aún no lo tienes)
3. Ve a **Settings** (⚙️) en el menú lateral
4. Haz clic en **API** en el submenú
5. Encontrarás dos valores importantes:
   - **Project URL** - Esta es tu `VITE_SUPABASE_URL`
   - **anon public** key - Esta es tu `VITE_SUPABASE_ANON_KEY`

### 1.3 Agregar las variables al archivo .env

Abre el archivo `.env` y agrega estas líneas (reemplaza con tus valores reales):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

**Ejemplo real:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTI3ODQwMCwiZXhwIjoxOTYwODU0NDAwfQ.abcdefghijklmnopqrstuvwxyz1234567890
```

⚠️ **Importante:** 
- No agregues comillas alrededor de los valores
- No dejes espacios antes o después del signo `=`
- Guarda el archivo después de editarlo

### 1.4 Verificar que el archivo .env está en la raíz

Tu estructura de archivos debería verse así:
```
EduFlowDualite/
├── .env              ← Aquí debe estar
├── .env.example      ← Template (opcional)
├── package.json
├── App.tsx
├── components/
└── ...
```

---

## 🗄️ Paso 2: Ejecutar la Migración SQL

### 2.1 Abrir el SQL Editor en Supabase

1. Ve a tu proyecto en Supabase
2. En el menú lateral, haz clic en **SQL Editor** (ícono de base de datos con `</>`)
3. Haz clic en **New query** (botón verde en la parte superior)

### 2.2 Copiar el contenido de la migración

1. Abre el archivo `supabase/migrations/20250101000012_fix_null_content_handling.sql` en tu proyecto
2. Selecciona todo el contenido (Ctrl+A / Cmd+A)
3. Copia el contenido (Ctrl+C / Cmd+C)

### 2.3 Pegar y ejecutar en Supabase

1. En el SQL Editor de Supabase, pega el contenido copiado (Ctrl+V / Cmd+V)
2. Verifica que el código SQL esté completo
3. Haz clic en el botón **Run** (o presiona Ctrl+Enter / Cmd+Enter)
4. Espera a que se ejecute (debería tomar menos de 1 segundo)

### 2.4 Verificar que se ejecutó correctamente

Deberías ver un mensaje de éxito como:
```
Success. No rows returned
```

O algo similar indicando que la función se creó correctamente.

### 2.5 (Opcional) Verificar la función

Para confirmar que la función se creó correctamente, ejecuta esta consulta en el SQL Editor:

```sql
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'save_course_with_children';
```

Deberías ver la definición de la función.

---

## ✅ Paso 3: Verificar la Configuración

### 3.1 Reiniciar el servidor de desarrollo

Si tienes el servidor corriendo, detenlo (Ctrl+C) y vuelve a iniciarlo:

```bash
yarn dev
# o
npm run dev
```

### 3.2 Probar la aplicación

1. Abre `http://localhost:3000` en tu navegador
2. Deberías ver la pantalla de autenticación
3. Intenta registrarte con un nuevo usuario (rol: "Docente")
4. Si todo está bien, deberías poder acceder al dashboard

### 3.3 Probar funcionalidades clave

1. **Crear un curso nuevo**
   - Haz clic en "Crear Nuevo Curso"
   - Completa el formulario
   - Guarda el curso

2. **Agregar módulos y lecciones**
   - Agrega un módulo
   - Agrega una lección (sin archivo primero)
   - Guarda el curso (esto prueba el manejo de `content` null)
   - Luego agrega un archivo a la lección

3. **Subir archivos**
   - Sube una imagen para el curso
   - Sube un PDF o MP4 para una lección
   - Verifica que se muestre el progreso de subida

---

## 🐛 Solución de Problemas

### Error: "Supabase URL and Anon Key must be defined"

**Causa:** El archivo `.env` no existe o las variables no están configuradas correctamente.

**Solución:**
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que las variables se llaman exactamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. Reinicia el servidor de desarrollo después de crear/modificar `.env`
4. Verifica que no hay espacios extra o comillas en el archivo `.env`

### Error al ejecutar la migración SQL

**Causa:** Puede haber un conflicto con una función existente.

**Solución:**
1. Si ves un error sobre que la función ya existe, es normal - la migración usa `CREATE OR REPLACE`
2. Si ves un error de sintaxis, verifica que copiaste todo el contenido del archivo SQL
3. Si ves un error de permisos, asegúrate de estar usando la cuenta correcta de Supabase

### Error al guardar cursos con lecciones sin contenido

**Causa:** La migración no se ejecutó o se ejecutó incorrectamente.

**Solución:**
1. Verifica que ejecutaste la migración `20250101000012_fix_null_content_handling.sql`
2. Ejecuta la consulta de verificación del paso 2.5
3. Si la función no existe o está mal, ejecuta la migración nuevamente

### Los archivos no se suben a Storage

**Causa:** Los buckets de Storage no están configurados o no son públicos.

**Solución:**
1. Ve a **Storage** en tu dashboard de Supabase
2. Verifica que existan los buckets `course-images` y `lesson-files`
3. Si no existen, ejecuta la migración inicial `20250101000000_initial_schema.sql`
4. Verifica que los buckets sean públicos (deberían tener un ícono de ojo abierto)

---

## 📋 Checklist Final

Marca cada elemento cuando lo completes:

- [ ] Archivo `.env` creado en la raíz del proyecto
- [ ] `VITE_SUPABASE_URL` configurado con tu URL de Supabase
- [ ] `VITE_SUPABASE_ANON_KEY` configurado con tu clave anon
- [ ] Migración SQL `20250101000012_fix_null_content_handling.sql` ejecutada
- [ ] Servidor de desarrollo reiniciado
- [ ] Aplicación carga sin errores en el navegador
- [ ] Puedes registrarte como nuevo usuario
- [ ] Puedes crear un curso nuevo
- [ ] Puedes guardar un curso con lecciones sin contenido
- [ ] Puedes subir archivos (imágenes y videos/PDFs)

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu aplicación EduFlow estará completamente funcional y conectada a Supabase. 

Si encuentras algún problema que no está cubierto aquí, revisa:
- La consola del navegador (F12) para errores de JavaScript
- La consola del servidor para errores de compilación
- Los logs de Supabase en el dashboard para errores de base de datos

¡Buena suerte con tu proyecto! 🚀

