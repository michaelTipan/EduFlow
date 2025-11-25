-- ============================================================
-- REPARACIÓN DE STORAGE BUCKETS Y POLÍTICAS
-- ============================================================

-- 1. Asegurar que los buckets existan y sean públicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Anyone can view course images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete course images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete lesson files" ON storage.objects;

-- 3. Crear políticas NUEVAS y SIMPLIFICADAS (Permisivas para debug)

-- COURSE IMAGES
-- Ver: Todo el mundo
CREATE POLICY "Anyone can view course images" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-images');

-- Subir: Cualquier usuario autenticado (simplificado para evitar errores de ruta)
CREATE POLICY "Authenticated can upload course images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-images' AND auth.role() = 'authenticated');

-- Actualizar: Cualquier usuario autenticado
CREATE POLICY "Authenticated can update course images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'course-images' AND auth.role() = 'authenticated');

-- Borrar: Cualquier usuario autenticado
CREATE POLICY "Authenticated can delete course images" ON storage.objects
  FOR DELETE USING (bucket_id = 'course-images' AND auth.role() = 'authenticated');


-- LESSON FILES
-- Ver: Todo el mundo
CREATE POLICY "Anyone can view lesson files" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-files');

-- Subir: Cualquier usuario autenticado
CREATE POLICY "Authenticated can upload lesson files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lesson-files' AND auth.role() = 'authenticated');

-- Actualizar: Cualquier usuario autenticado
CREATE POLICY "Authenticated can update lesson files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'lesson-files' AND auth.role() = 'authenticated');

-- Borrar: Cualquier usuario autenticado
CREATE POLICY "Authenticated can delete lesson files" ON storage.objects
  FOR DELETE USING (bucket_id = 'lesson-files' AND auth.role() = 'authenticated');

-- 4. Confirmación
SELECT 'Storage policies fixed successfully' as result;
