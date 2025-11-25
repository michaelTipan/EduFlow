/*
  ═══════════════════════════════════════════════════════════════
  EDUFLOW - MIGRACIÓN COMPLETA UNIFICADA
  ═══════════════════════════════════════════════════════════════
  
  Este archivo consolida TODAS las migraciones necesarias para
  un proyecto nuevo de Supabase.
  
  INSTRUCCIONES:
  1. Crear nuevo proyecto en Supabase
  2. Ir a SQL Editor
  3. Copiar y pegar TODO este archivo
  4. Ejecutar (RUN)
  5. Verificar que ejecutó sin errores
  
  Versión: Sprint 2 - Completo con Student Features
  Última actualización: 2025-01-25
  ═══════════════════════════════════════════════════════════════
*/

-- ============================================================
-- SECCIÓN 1: TABLAS PRINCIPALES
-- ============================================================

-- 1.1 PROFILES (Usuarios)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('teacher', 'student', 'coordinator')),
    first_name text,
    last_name text,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(email)
);
COMMENT ON TABLE public.profiles IS 'User profiles with role information';

-- 1.2 COURSES (Cursos)
CREATE TABLE IF NOT EXISTS public.courses (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    image_url text,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.courses IS 'Courses created by teachers';
CREATE INDEX IF NOT EXISTS courses_teacher_id_idx ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS courses_is_published_idx ON public.courses(is_published);

-- 1.3 MODULES (Módulos de curso)
CREATE TABLE IF NOT EXISTS public.modules (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.modules IS 'Course modules';
CREATE INDEX IF NOT EXISTS modules_course_id_idx ON public.modules(course_id);

-- 1.4 LESSONS (Lecciones)
CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title text NOT NULL,
    "order" integer NOT NULL,
    file_name text,
    file_type text CHECK (file_type IN ('pdf', 'video')),
    file_url text,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.lessons IS 'Lessons within modules';
CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON public.lessons(module_id);

-- 1.5 ENROLLMENTS (Inscripciones de estudiantes)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(student_id, course_id)
);
COMMENT ON TABLE public.enrollments IS 'Student course enrollments';
CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS enrollments_course_id_idx ON public.enrollments(course_id);

-- 1.6 PROGRESS (Progreso de lecciones)
CREATE TABLE IF NOT EXISTS public.progress (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    is_completed boolean NOT NULL DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(student_id, lesson_id)
);
COMMENT ON TABLE public.progress IS 'Lesson completion progress for students';
CREATE INDEX IF NOT EXISTS progress_student_id_idx ON public.progress(student_id);
CREATE INDEX IF NOT EXISTS progress_lesson_id_idx ON public.progress(lesson_id);

-- ============================================================
-- SECCIÓN 2: STORAGE BUCKETS
-- ============================================================

-- 2.1 Bucket para imágenes de cursos
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2.2 Bucket para archivos de lecciones
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECCIÓN 3: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- 3.1 PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles." ON public.profiles;
CREATE POLICY "Users can view all profiles." ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- 3.2 COURSES RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own courses." ON public.courses;
CREATE POLICY "Teachers can view own courses." ON public.courses
  FOR SELECT TO authenticated USING (teacher_id = auth.uid() OR is_published = true);

DROP POLICY IF EXISTS "Teachers can insert courses." ON public.courses;
CREATE POLICY "Teachers can insert courses." ON public.courses
  FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own courses." ON public.courses;
CREATE POLICY "Teachers can update own courses." ON public.courses
  FOR UPDATE TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own courses." ON public.courses;
CREATE POLICY "Teachers can delete own courses." ON public.courses
  FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- 3.3 MODULES RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view modules of accessible courses." ON public.modules;
CREATE POLICY "Users can view modules of accessible courses." ON public.modules
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_id AND (c.teacher_id = auth.uid() OR c.is_published = true)
    )
  );

DROP POLICY IF EXISTS "Teachers can manage modules." ON public.modules;
CREATE POLICY "Teachers can manage modules." ON public.modules
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

-- 3.4 LESSONS RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lessons of accessible courses." ON public.lessons;
CREATE POLICY "Users can view lessons of accessible courses." ON public.lessons
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = module_id AND (c.teacher_id = auth.uid() OR c.is_published = true)
    )
  );

DROP POLICY IF EXISTS "Teachers can manage lessons." ON public.lessons;
CREATE POLICY "Teachers can manage lessons." ON public.lessons
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = module_id AND c.teacher_id = auth.uid()
    )
  );

-- 3.5 ENROLLMENTS RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own enrollments." ON public.enrollments;
CREATE POLICY "Students can view their own enrollments." ON public.enrollments
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can enroll themselves." ON public.enrollments;
CREATE POLICY "Students can enroll themselves." ON public.enrollments
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- 3.6 PROGRESS RLS
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own progress." ON public.progress;
CREATE POLICY "Students can view their own progress." ON public.progress
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update their own progress." ON public.progress;
CREATE POLICY "Students can update their own progress." ON public.progress
  FOR ALL TO authenticated USING (student_id = auth.uid());

-- 3.7 STORAGE RLS
DROP POLICY IF EXISTS "Anyone can view course images" ON storage.objects;
CREATE POLICY "Anyone can view course images" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-images');

DROP POLICY IF EXISTS "Teachers can upload course images" ON storage.objects;
CREATE POLICY "Teachers can upload course images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can delete course images" ON storage.objects;
CREATE POLICY "Teachers can delete course images" ON storage.objects
  FOR DELETE USING (bucket_id = 'course-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Anyone can view lesson files" ON storage.objects;
CREATE POLICY "Anyone can view lesson files" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS "Teachers can upload lesson files" ON storage.objects;
CREATE POLICY "Teachers can upload lesson files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lesson-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can delete lesson files" ON storage.objects;
CREATE POLICY "Teachers can delete lesson files" ON storage.objects
  FOR DELETE USING (bucket_id = 'lesson-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- SECCIÓN 4: FUNCIONES Y TRIGGERS
-- ============================================================

-- 4.1 Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;

-- 4.2 Trigger para ejecutar handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.3 Función para guardar curso completo (atómica)
CREATE OR REPLACE FUNCTION public.save_course_with_children(course_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_module jsonb;
  v_module_id uuid;
  v_lesson jsonb;
  v_lesson_id uuid;
  v_content jsonb;
BEGIN
  v_course_id := (course_data->>'id')::uuid;

  -- Upsert course
  INSERT INTO public.courses (id, teacher_id, title, description, category, image_url, is_published)
  VALUES (
    v_course_id,
    (course_data->>'teacher_id')::uuid,
    course_data->>'title',
    course_data->>'description',
    course_data->>'category',
    course_data->>'image_url',
    (course_data->>'is_published')::boolean
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    image_url = EXCLUDED.image_url,
    is_published = EXCLUDED.is_published,
    updated_at = now();

  -- Delete existing modules/lessons not in the new data
  DELETE FROM public.modules WHERE course_id = v_course_id;

  -- Insert/Update modules and lessons
  FOR v_module IN SELECT * FROM jsonb_array_elements(course_data->'modules')
  LOOP
    v_module_id := (v_module->>'id')::uuid;

    INSERT INTO public.modules (id, course_id, title, "order")
    VALUES (
      v_module_id,
      v_course_id,
      v_module->>'title',
      (v_module->>'order')::integer
    );

    FOR v_lesson IN SELECT * FROM jsonb_array_elements(v_module->'lessons')
    LOOP
      v_lesson_id := (v_lesson->>'id')::uuid;
      v_content := v_lesson->'content';

      INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
      VALUES (
        v_lesson_id,
        v_module_id,
        v_lesson->>'title',
        (v_lesson->>'order')::integer,
        v_content->>'name',
        v_content->>'type',
        v_content->>'url',
        (v_content->>'size')::bigint
      );
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- SECCIÓN 5: DATOS INICIALES (OPCIONAL)
-- ============================================================

-- Puedes agregar usuarios de prueba o datos de ejemplo aquí si lo deseas
-- Por ejemplo:
-- INSERT INTO profiles (id, email, role, first_name, last_name) 
-- VALUES ('...', 'test@example.com', 'teacher', 'Test', 'User');

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================

/*
  ✅ VERIFICACIÓN POST-MIGRACIÓN
  
  Ejecuta estas consultas para verificar que todo se creó correctamente:
  
  1. Ver tablas creadas:
     SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     ORDER BY table_name;
  
  2. Ver políticas RLS:
     SELECT schemaname, tablename, policyname 
     FROM pg_policies 
     WHERE schemaname = 'public';
  
  3. Ver buckets de storage:
     SELECT * FROM storage.buckets;
  
  4. Probar creación de perfil (debes registrarte en la app):
     SELECT * FROM profiles;
*/
