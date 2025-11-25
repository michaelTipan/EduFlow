/*
          # [Function and Trigger Overhaul for Security and Atomicity]
          This script completely rebuilds the database functions and triggers to resolve persistent security warnings and migration errors. It ensures all functions are secure and that the course saving mechanism is atomic.

          ## Query Description: [This operation will safely drop and recreate the `handle_new_user` and `save_course_with_children` functions, along with their dependent triggers. This is a safe operation as it replaces existing logic with a more secure and correct version. No data will be lost. This definitively fixes the "Function Search Path Mutable" security warning and corrects syntax errors in the save function.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          - Drops and recreates trigger `on_auth_user_created` on `auth.users`.
          - Drops and recreates function `public.handle_new_user()`.
          - Drops and recreates function `public.save_course_with_children(jsonb)`.
          
          ## Security Implications:
          - RLS Status: [Unaffected]
          - Policy Changes: [No]
          - Auth Requirements: [service_role for creation]
          
          ## Performance Impact:
          - Indexes: [Unaffected]
          - Triggers: [Recreated]
          - Estimated Impact: [None]
          */

-- Step 1: Drop the existing trigger and function to allow for recreation.
-- The CASCADE will automatically remove the trigger that depends on the function.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Recreate the handle_new_user function with security best practices.
-- SECURITY DEFINER allows it to run with the permissions of the function owner.
-- SET search_path = '' prevents potential search path hijacking.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'role')::public.user_role
  );
  RETURN NEW;
END;
$$;

-- Step 3: Recreate the trigger on the auth.users table.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Drop the old course saving function.
DROP FUNCTION IF EXISTS public.save_course_with_children(jsonb);

-- Step 5: Recreate the course saving function with corrected syntax and security best practices.
CREATE OR REPLACE FUNCTION public.save_course_with_children(course_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    course_id_val uuid;
    module_data jsonb;
    lesson_data jsonb;
    module_id_val uuid;
BEGIN
    -- Extract course ID
    course_id_val := (course_data->>'id')::uuid;

    -- Upsert Course (Insert or Update)
    INSERT INTO public.courses (id, title, description, category, image_url, is_published, teacher_id)
    VALUES (
        course_id_val,
        course_data->>'title',
        course_data->>'description',
        course_data->>'category',
        course_data->>'image_url',
        (course_data->>'is_published')::boolean,
        (course_data->>'teacher_id')::uuid
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        is_published = EXCLUDED.is_published;

    -- Delete modules and lessons that are no longer in the payload
    -- This is safer done by checking against the incoming list of IDs
    DELETE FROM public.lessons WHERE module_id IN (SELECT id FROM public.modules WHERE course_id = course_id_val) AND id NOT IN (SELECT (jsonb_array_elements(course_data->'modules'->'lessons'))->>'id')::uuid;
    DELETE FROM public.modules WHERE course_id = course_id_val AND id NOT IN (SELECT (jsonb_array_elements(course_data->'modules'))->>'id')::uuid;

    -- Loop through modules and upsert them
    FOR module_data IN SELECT * FROM jsonb_array_elements(course_data->'modules')
    LOOP
        module_id_val := (module_data->>'id')::uuid;

        INSERT INTO public.modules (id, course_id, title, "order")
        VALUES (
            module_id_val,
            course_id_val,
            module_data->>'title',
            (module_data->>'order')::integer
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            "order" = EXCLUDED."order";

        -- Loop through lessons for the current module and upsert them
        FOR lesson_data IN SELECT * FROM jsonb_array_elements(module_data->'lessons')
        LOOP
            INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
            VALUES (
                (lesson_data->>'id')::uuid,
                module_id_val,
                lesson_data->>'title',
                (lesson_data->>'order')::integer,
                lesson_data->'content'->>'name',
                (lesson_data->'content'->>'type')::public.lesson_file_type,
                lesson_data->'content'->>'url',
                (lesson_data->'content'->>'size')::bigint
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                "order" = EXCLUDED."order",
                file_name = EXCLUDED.file_name,
                file_type = EXCLUDED.file_type,
                file_url = EXCLUDED.file_url,
                file_size = EXCLUDED.file_size;
        END LOOP;
    END LOOP;
END;
$$;
