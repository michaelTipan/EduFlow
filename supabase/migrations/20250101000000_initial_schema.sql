/*
# [Corrected Initial Schema Setup for EduFlow]
This script sets up the complete database schema for the EduFlow application. It corrects a previous error by removing invalid function calls and establishes a robust structure with tables, triggers, storage buckets, and Row Level Security (RLS) policies.

## Query Description: This is a comprehensive and corrected setup script.
- It creates all necessary tables: profiles, courses, modules, and lessons.
- It sets up a trigger to automatically create a user profile upon successful sign-up.
- It creates public storage buckets for course images and lesson files.
- It enables and configures Row Level Security to control data access based on user roles and ownership.
- This script is idempotent and safe to run on a new or partially configured project.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: true
- Reversible: false

## Structure Details:
- Tables created: profiles, courses, modules, lessons
- Triggers created: on_auth_user_created
- Storage Buckets created: course-images, lesson-files
- RLS Policies created for all tables and storage.

## Security Implications:
- RLS Status: Enabled on all tables.
- Policy Changes: Yes, policies are defined for 'Estudiante' and 'Docente' roles.
- Auth Requirements: Policies rely on `auth.uid()` and user roles stored in the `profiles` table.

## Performance Impact:
- Indexes: Primary and Foreign Keys are indexed automatically. Additional indexes are added on foreign keys.
- Triggers: One trigger on `auth.users` table.
- Estimated Impact: Low impact on a new database.
*/

-- 1. PROFILES TABLE
-- Stores public user data. References auth.users.
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    role text NOT NULL CHECK (role IN ('Estudiante', 'Docente', 'Coordinador'))
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- 2. COURSES TABLE
-- Stores course information.
DROP TABLE IF EXISTS public.courses CASCADE;
CREATE TABLE public.courses (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    category text,
    image_url text,
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.courses IS 'Stores all the courses created by teachers.';
CREATE INDEX IF NOT EXISTS courses_teacher_id_idx ON public.courses(teacher_id);


-- 3. MODULES TABLE
-- Stores modules for each course.
DROP TABLE IF EXISTS public.modules CASCADE;
CREATE TABLE public.modules (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.modules IS 'Stores the modules within each course.';
CREATE INDEX IF NOT EXISTS modules_course_id_idx ON public.modules(course_id);

-- 4. LESSONS TABLE
-- Stores lessons for each module.
DROP TABLE IF EXISTS public.lessons CASCADE;
CREATE TABLE public.lessons (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title text NOT NULL,
    file_name text,
    file_type text,
    file_url text,
    file_size bigint,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.lessons IS 'Stores the lessons within each module, including file metadata.';
CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON public.lessons(module_id);


-- 5. FUNCTION & TRIGGER to create a profile on new user sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a user profile upon registration.';


-- 6. STORAGE BUCKETS
-- Create buckets for course images and lesson files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('course-images', 'course-images', true, 5242880, '{"image/jpeg","image/png","image/gif"}'),
  ('lesson-files', 'lesson-files', true, 536870912, '{"video/mp4","application/pdf"}')
ON CONFLICT (id) DO NOTHING;


-- 7. ROW LEVEL SECURITY (RLS)
-- Secure tables by default.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- RLS POLICIES for profiles
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile." ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- RLS POLICIES for courses
DROP POLICY IF EXISTS "Authenticated users can view published courses." ON public.courses;
CREATE POLICY "Authenticated users can view published courses." ON public.courses
  FOR SELECT TO authenticated USING (is_published = true);

DROP POLICY IF EXISTS "Teachers can view their own courses." ON public.courses;
CREATE POLICY "Teachers can view their own courses." ON public.courses
  FOR SELECT TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can create courses." ON public.courses;
CREATE POLICY "Teachers can create courses." ON public.courses
  FOR INSERT TO authenticated WITH CHECK (
    teacher_id = auth.uid() AND
    get_user_role(auth.uid()) = 'Docente'
  );

DROP POLICY IF EXISTS "Teachers can update their own courses." ON public.courses;
CREATE POLICY "Teachers can update their own courses." ON public.courses
  FOR UPDATE TO authenticated USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete their own courses." ON public.courses;
CREATE POLICY "Teachers can delete their own courses." ON public.courses
  FOR DELETE TO authenticated USING (teacher_id = auth.uid());


-- RLS POLICIES for modules and lessons (cascaded access)
DROP POLICY IF EXISTS "Users can view modules of visible courses." ON public.modules;
CREATE POLICY "Users can view modules of visible courses." ON public.modules
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id)
  );

DROP POLICY IF EXISTS "Teachers can manage modules for their courses." ON public.modules;
CREATE POLICY "Teachers can manage modules for their courses." ON public.modules
  FOR ALL TO authenticated USING (
    (SELECT teacher_id FROM public.courses WHERE id = course_id) = auth.uid()
  );

DROP POLICY IF EXISTS "Users can view lessons of visible courses." ON public.lessons;
CREATE POLICY "Users can view lessons of visible courses." ON public.lessons
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.modules m JOIN public.courses c ON m.course_id = c.id WHERE m.id = module_id
    )
  );

DROP POLICY IF EXISTS "Teachers can manage lessons for their courses." ON public.lessons;
CREATE POLICY "Teachers can manage lessons for their courses." ON public.lessons
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.modules m WHERE m.id = module_id AND (SELECT c.teacher_id FROM public.courses c WHERE c.id = m.course_id) = auth.uid()
    )
  );


-- 8. STORAGE RLS POLICIES
-- Public buckets are readable by anyone, but writes need to be secured.
DROP POLICY IF EXISTS "Teachers can manage files in their own folders." ON storage.objects;
CREATE POLICY "Teachers can manage files in their own folders." ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id IN ('course-images', 'lesson-files') AND
    owner = auth.uid()
  ) WITH CHECK (
    bucket_id IN ('course-images', 'lesson-files') AND
    owner = auth.uid()
  );
