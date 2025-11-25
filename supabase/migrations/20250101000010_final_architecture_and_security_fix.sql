/*
# [Definitive Security Fix &amp; Function Refactor]
This migration definitively resolves the 'Function Search Path Mutable' warnings by dropping and recreating all custom database functions and their dependent triggers. It ensures all functions run with a secure, non-mutable search path.

## Query Description: [This operation will safely drop and recreate the functions responsible for user profile creation and atomic course saves. It uses `DROP ... CASCADE` to handle dependencies automatically, ensuring a clean and secure re-installation. This is a safe and necessary final step for security hardening.]

## Metadata:
- Schema-Category: ["Structural", "Security"]
- Impact-Level: ["Medium"]
- Requires-Backup: false
- Reversible: false

## Structure Details:
- Drops trigger `on_auth_user_created` on `auth.users`.
- Drops function `handle_new_user()`.
- Drops function `save_course_with_children(jsonb)`.
- Recreates all dropped objects with `SET search_path = 'public'`.

## Security Implications:
- RLS Status: [Unaffected]
- Policy Changes: [No]
- Auth Requirements: [service_role]
- Mitigates: `Function Search Path Mutable` security warning.

## Performance Impact:
- Indexes: [Unaffected]
- Triggers: [Recreated]
- Estimated Impact: [Negligible. A one-time structural change.]
*/

-- Step 1: Drop the existing trigger and function for user handling, if they exist.
-- The CASCADE will automatically remove the trigger that depends on the function.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Recreate the user handling function with a secure search path.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search path to prevent hijacking.
SET search_path = 'public'
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 4: Drop the old course saving function if it exists.
DROP FUNCTION IF EXISTS public.save_course_with_children(jsonb);

-- Step 5: Recreate the course saving function with a secure search path.
CREATE OR REPLACE FUNCTION public.save_course_with_children(course_data jsonb)
RETURNS void
LANGUAGE plpgsql
-- Set a secure search path.
SET search_path = 'public'
AS $$
DECLARE
    module_data jsonb;
    lesson_data jsonb;
    course_id_val uuid := (course_data->>'id')::uuid;
    teacher_id_val uuid := (course_data->>'teacher_id')::uuid;
BEGIN
    -- Upsert Course
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

    -- Delete modules and lessons that are not in the new data
    DELETE FROM public.modules WHERE course_id = course_id_val AND id NOT IN (SELECT (jsonb_array_elements(course_data->'modules'))->>'id')::uuid);
    -- Cascade delete on modules table will handle lessons.

    -- Loop through modules and upsert
    FOR module_data IN SELECT * FROM jsonb_array_elements(course_data->'modules')
    LOOP
        INSERT INTO public.modules (id, course_id, title, "order")
        VALUES (
            (module_data->>'id')::uuid,
            course_id_val,
            module_data->>'title',
            (module_data->>'order')::int
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            "order" = EXCLUDED."order";

        -- Loop through lessons and upsert
        FOR lesson_data IN SELECT * FROM jsonb_array_elements(module_data->'lessons')
        LOOP
            INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
            VALUES (
                (lesson_data->>'id')::uuid,
                (module_data->>'id')::uuid,
                lesson_data->>'title',
                (lesson_data->>'order')::int,
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
