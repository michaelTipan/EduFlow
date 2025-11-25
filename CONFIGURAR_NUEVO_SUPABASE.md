# 🚀 Guía Rápida: Configurar Nuevo Proyecto Supabase

## Paso 1: Crear Proyecto en Supabase

1. Ve a https://app.supabase.com
2. Click en **"New project"**
3. Nombre del proyecto: `EduFlow-Test` (o el que quieras)
4. Database Password: **Guárdala en un lugar seguro**
5. Region: Elige la más cercana a ti
6. Click **"Create new project"**
7. Espera 2-3 minutos a que se cree

---

## Paso 2: Ejecutar Migración

1. En tu proyecto, ve a **SQL Editor** (icono de base de datos en sidebar)
2. Click en **"+ New query"**
3. Abre el archivo: `supabase/SETUP_COMPLETO_NUEVO_PROYECTO.sql`
4. **Copia TODO el contenido** del archivo
5. **Pega** en el SQL Editor de Supabase
6. Click **"Run"** (o presiona Ctrl+Enter)
7. ✅ Debe decir "Success. No rows returned"

---

## Paso 3: Verificar que Funcionó

En el SQL Editor, ejecuta esta query:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Debes ver estas tablas**:
- ✅ `courses`
- ✅ `enrollments`
- ✅ `lessons`
- ✅ `modules`
- ✅ `profiles`
- ✅ `progress`

Si ves las 6 tablas, **¡todo está bien!**

---

## Paso 4: Obtener Credenciales

1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL**: Algo como `https://xxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

---

## Paso 5: Configurar en tu Proyecto

### Opción A: Probar Localmente

Crea/edita el archivo `.env`:

```env
VITE_SUPABASE_URL=TU_PROJECT_URL_AQUI
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
```

Luego:
```bash
npm run dev
```

### Opción B: Actualizar Netlify

1. Ve a tu sitio en Netlify
2. **Site settings** → **Build & deploy** → **Environment**
3. Edita las variables:
   - `VITE_SUPABASE_URL`: Pega la nueva URL
   - `VITE_SUPABASE_ANON_KEY`: Pega la nueva key
4. **Save**
5. Ve a **Deploys** → **Trigger deploy** → **Deploy site**

---

## Paso 6: Deshabilitar Verificación de Email

**IMPORTANTE**: Para que funcione el registro sin esperar emails:

1. En Supabase, ve a **Authentication** → **Providers**
2. Click en **Email**
3. **Desactiva** la opción **"Confirm email"**
4. **Save**

---

## Paso 7: Probar

1. Abre tu app (local o Netlify)
2. **Registrarse** con un nuevo usuario:
   - Nombre: Test
   - Apellido: User
   - Email: test@ejemplo.com
   - Contraseña: 12345678
   - Rol: Estudiante
3. Click **"Crear Cuenta"**
4. ✅ Debe decir "¡Registro exitoso! Ya puedes iniciar sesión"
5. **Iniciar sesión** con las mismas credenciales
6. ✅ Debe entrar al dashboard

---

## ✅ Checklist de Verificación

- [ ] Proyecto Supabase creado
- [ ] Migración ejecutada sin errores
- [ ] 6 tablas visibles en Database
- [ ] Credenciales copiadas
- [ ] .env actualizado (si es local)
- [ ] Variables de Netlify actualizadas (si es producción)
- [ ] Email confirmation deshabilitado
- [ ] Registro de usuario funciona
- [ ] Login funciona

---

## 🐛 Problemas Comunes

### "Failed to fetch"
- ✅ Verifica que las credenciales en `.env` o Netlify estén correctas
- ✅ No deben tener espacios ni comillas extras
- ✅ Reinicia el servidor (`npm run dev`) después de cambiar `.env`

### "Este correo ya está registrado"
- ✅ Ese email ya fue usado, usa otro
- ✅ O elimina el usuario en: Authentication → Users → Delete

### "No rows returned" al ejecutar migración
- ✅ Eso es normal y correcto, significa que se ejecutó bien

### Botón "Run" no responde
- ✅ Verifica que copiaste TODO el archivo SQL
- ✅ El archivo tiene ~400 líneas, asegúrate de copiar completo

---

## 📊 Comparar con Proyecto Anterior

Si quieres ver si el problema era de Supabase:

1. **Proyecto Anterior**: `https://tbfvlbwmkxxxgstuluag.supabase.co`
2. **Proyecto Nuevo**: Tu nueva URL

Prueba registrarte y hacer login en ambos para comparar.

---

## 💡 Siguientes Pasos

Si funciona en el proyecto nuevo:
- ✅ El problema ERA de Supabase (límites, configuración, etc.)
- Solución: Usa el proyecto nuevo

Si NO funciona en el proyecto nuevo:
- ❌ El problema es de código
- Necesitamos revisar la lógica de Auth.tsx

---

¿Listo para probar? ¡Crea el proyecto y ejecuta el SQL!
