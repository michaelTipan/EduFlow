/*
# [Definitive Security Fix & Architecture Update]
This script performs the final security hardening and architectural adjustments for the EduFlow application. It safely drops and recreates all database functions and their dependent triggers to permanently resolve the "Function Search Path Mutable" security warning. It also refines the `save_course_with_children` function for better data handling.

## Query Description: [This operation will temporarily drop database triggers and functions before recreating them with enhanced security. It uses `CASCADE` to manage dependencies safely. There is a low risk to existing data as it primarily affects function definitions, not table data. A backup is always recommended before running structural changes.]

## Metadata:
- Schema-Category: ["Structural", "Security"]
- Impact-Level: ["Medium"]
- Requires-Backup: true
- Reversible: false

## Structure Details:
- Drops and recreates the `handle_new_user` function.
- Drops and recreates the `on_auth_user_created` trigger on `auth.users`.
- Drops and recreates the `save_course_with_children` RPC function.

## Security Implications:
- RLS Status: [Unaffected]
- Policy Changes: [No]
- Auth Requirements: [service_role key]
- Fixes "Function Search Path Mutable" by setting a secure, empty `search_path` for all functions.

## Performance Impact:
- Indexes: [Unaffected]
- Triggers: [Recreated]
- Estimated Impact: [Negligible. Function recreation is a fast, one-time operation.]
*/

-- Step 1: Drop the existing trigger and function safely.
-- The `CASCADE` option will automatically remove the trigger that depends on the function.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Recreate the function with security best practices.
-- SET search_path = '' prevents the function from being manipulated by other schemas.
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

-- Step 3: Recreate the trigger to call the new, secure function.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 4: Drop the existing course saving function.
DROP FUNCTION IF EXISTS public.save_course_with_children(jsonb);

-- Step 5: Recreate the course saving function with security best practices.
CREATE OR REPLACE FUNCTION public.save_course_with_children(course_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    module_data jsonb;
    lesson_data jsonb;
    course_id_val uuid := (course_data->>'id')::uuid;
    teacher_id_val uuid := (course_data->>'teacher_id')::uuid;
BEGIN
    -- Upsert course details
    INSERT INTO public.courses (id, title, description, category, image_url, is_published, teacher_id)
    VALUES (
        course_id_val,
        course_data->>'title',
        course_data->>'description',
        course_data->>'category',
        course_data->>'image_url',
        (course_data->>'is_published')::boolean,
        teacher_id_val
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        is_published = EXCLUDED.is_published;

    -- Delete modules and lessons that are not in the new payload
    DELETE FROM public.modules WHERE course_id = course_id_val AND id NOT IN (SELECT (jsonb_array_elements(course_data->'modules'))->>'id');
    
    -- Loop through modules and upsert them
    FOR module_data IN SELECT * FROM jsonb_array_elements(course_data->'modules')
    LOOP
        INSERT INTO public.modules (id, course_id, title, "order")
        VALUES (
            (module_data->>'id')::uuid,
            course_id_val,
            module_data->>'title',
            (module_data->>'order')::integer
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            "order" = EXCLUDED."order";

        -- Delete lessons for the current module that are not in the new payload
        DELETE FROM public.lessons WHERE module_id = (module_data->>'id')::uuid AND id NOT IN (SELECT (jsonb_array_elements(module_data->'lessons'))->>'id');

        -- Loop through lessons and upsert them
        FOR lesson_data IN SELECT * FROM jsonb_array_elements(module_data->'lessons')
        LOOP
            INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
            VALUES (
                (lesson_data->>'id')::uuid,
                (module_data->>'id')::uuid,
                lesson_data->>'title',
                (lesson_data->>'order')::integer,
                lesson_data->'content'->>'name',
                (lesson_data->'content'->>'type')::public.file_type,
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
