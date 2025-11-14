# ⚡ Instrucciones Rápidas - Configurar EduFlow

## 🎯 Dos Pasos Simples

### Paso 1: Crear archivo .env (2 minutos)

1. **Crea un archivo llamado `.env`** en la raíz del proyecto (mismo lugar donde está `package.json`)

2. **Abre tu proyecto Supabase:**
   - Ve a https://supabase.com
   - Entra a tu proyecto
   - Ve a **Settings** → **API**

3. **Copia estos dos valores:**
   - **Project URL** (ejemplo: `https://abc123.supabase.co`)
   - **anon public key** (una cadena larga que empieza con `eyJ...`)

4. **Pega esto en tu archivo `.env`** (reemplaza con tus valores reales):

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_AQUI
```

**Ejemplo real:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTI3ODQwMCwiZXhwIjoxOTYwODU0NDAwfQ.abcdefghijklmnopqrstuvwxyz1234567890
```

⚠️ **IMPORTANTE:** 
- Sin comillas
- Sin espacios alrededor del `=`
- Guarda el archivo

---

### Paso 2: Ejecutar Migración SQL (1 minuto)

1. **Abre Supabase SQL Editor:**
   - En tu proyecto Supabase, ve a **SQL Editor** (menú lateral izquierdo)
   - Haz clic en **New query**

2. **Abre el archivo de migración:**
   - En tu proyecto local, abre: `supabase/migrations/20250101000012_fix_null_content_handling.sql`
   - Selecciona TODO el contenido (Ctrl+A)
   - Copia (Ctrl+C)

3. **Pega y ejecuta:**
   - Pega en el SQL Editor de Supabase (Ctrl+V)
   - Haz clic en **Run** (botón verde) o presiona Ctrl+Enter
   - Deberías ver: ✅ "Success. No rows returned"

---

## ✅ Verificar que Funciona

1. **Reinicia tu servidor:**
   ```bash
   # Detén el servidor (Ctrl+C) y vuelve a iniciarlo
   yarn dev
   ```

2. **Abre la aplicación:**
   - Ve a http://localhost:3000
   - Deberías ver la pantalla de login

3. **Prueba registrarte:**
   - Haz clic en "Regístrate"
   - Crea una cuenta con rol "Docente"
   - Si funciona, ¡está todo listo! 🎉

---

## 🆘 Si Algo Falla

### Error: "Supabase URL and Anon Key must be defined"
→ El archivo `.env` no está bien configurado o no está en la raíz del proyecto

### Error al guardar cursos
→ La migración SQL no se ejecutó correctamente. Vuelve al Paso 2.

### Los archivos no se suben
→ Verifica en Supabase → Storage que existan los buckets `course-images` y `lesson-files`

---

## 📚 Guía Completa

Para más detalles, consulta `GUIA_CONFIGURACION.md`

