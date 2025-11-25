/*
  # [Student Features Schema]
  This script adds tables for student enrollments and progress tracking.

  ## Structure Details:
  - Tables created: enrollments, progress
  - RLS Policies created for student access.
*/

-- 1. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(student_id, course_id)
);
COMMENT ON TABLE public.enrollments IS 'Stores course enrollments for students.';
CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS enrollments_course_id_idx ON public.enrollments(course_id);

-- 2. PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.progress (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    is_completed boolean NOT NULL DEFAULT false,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(student_id, lesson_id)
);
COMMENT ON TABLE public.progress IS 'Stores lesson progress for students.';
CREATE INDEX IF NOT EXISTS progress_student_id_idx ON public.progress(student_id);
CREATE INDEX IF NOT EXISTS progress_lesson_id_idx ON public.progress(lesson_id);

-- 3. RLS POLICIES

-- Enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own enrollments." ON public.enrollments
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Students can enroll themselves." ON public.enrollments
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- Progress
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own progress." ON public.progress
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress." ON public.progress
  FOR ALL TO authenticated USING (student_id = auth.uid());