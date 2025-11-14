/*
  # [Function] save_course_with_children (v2)
  [This function performs an "upsert" operation for a course and its nested modules and lessons. It ensures data integrity by performing the entire operation within a single transaction. It handles creating, updating, and deleting courses, modules, and lessons atomically.]

  ## Query Description: [This is a safe operation for saving course data. It checks if the user making the request is the owner of the course before making any changes. It will create new records, update existing ones, and delete any modules or lessons that are no longer present in the input data for that specific course. This ensures the database state matches the editor state.]
  
  ## Metadata:
  - Schema-Category: ["Data"]
  - Impact-Level: ["Medium"]
  - Requires-Backup: [false]
  - Reversible: [false] -- Deletions are permanent
  
  ## Structure Details:
  - Tables affected: public.courses, public.modules, public.lessons
  - Operations: INSERT, UPDATE, DELETE
  
  ## Security Implications:
  - RLS Status: [Enabled]
  - Policy Changes: [No]
  - Auth Requirements: [The function checks that auth.uid() matches the course's teacher_id.]
  
  ## Performance Impact:
  - Indexes: [Utilizes primary keys for upserts.]
  - Triggers: [No]
  - Estimated Impact: [Low to Medium, depending on the number of modules/lessons. The operation is transactional and efficient.]
*/
CREATE OR REPLACE FUNCTION public.save_course_with_children(course_data jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    course_id_val uuid;
    teacher_id_val uuid;
    module_json jsonb;
    module_id_val uuid;
    lesson_json jsonb;
BEGIN
    -- Extract IDs and verify ownership
    course_id_val := (course_data->>'id')::uuid;
    teacher_id_val := (course_data->>'teacher_id')::uuid;

    IF teacher_id_val IS NULL OR teacher_id_val != auth.uid() THEN
        RAISE EXCEPTION 'User does not have permission to edit this course';
    END IF;

    -- Upsert course
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

    -- Upsert modules and lessons
    FOR module_json IN SELECT * FROM jsonb_array_elements(course_data->'modules')
    LOOP
        module_id_val := (module_json->>'id')::uuid;

        INSERT INTO public.modules (id, course_id, title, "order")
        VALUES (
            module_id_val,
            course_id_val,
            module_json->>'title',
            (module_json->>'order')::integer
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            "order" = EXCLUDED."order";

        -- Upsert lessons for the current module
        FOR lesson_json IN SELECT * FROM jsonb_array_elements(module_json->'lessons')
        LOOP
            INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
            VALUES (
                (lesson_json->>'id')::uuid,
                module_id_val,
                lesson_json->>'title',
                (lesson_json->>'order')::integer,
                lesson_json->'content'->>'name',
                lesson_json->'content'->>'type',
                lesson_json->'content'->>'url',
                (lesson_json->'content'->>'size')::bigint
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                "order" = EXCLUDED."order",
                file_name = EXCLUDED.file_name,
                file_type = EXCLUDED.file_type,
                file_url = EXCLUDED.file_url,
                file_size = EXCLUDED.file_size;
        END LOOP;
        
        -- Delete lessons that are no longer in this module
        DELETE FROM public.lessons
        WHERE module_id = module_id_val AND id NOT IN (
            SELECT (l->>'id')::uuid FROM jsonb_array_elements(module_json->'lessons') AS l
        );

    END LOOP;

    -- Delete modules that are no longer in this course
    DELETE FROM public.modules
    WHERE course_id = course_id_val AND id NOT IN (
        SELECT (m->>'id')::uuid FROM jsonb_array_elements(course_data->'modules') AS m
    );

END;
$$;

/*
  # [Function] handle_new_user (v2)
  [This function is a trigger that automatically creates a new user profile in the `public.profiles` table whenever a new user is created in the `auth.users` table.]

  ## Query Description: [This is a safe, automated operation that ensures user data consistency between the authentication system and the public profiles table. It runs after a new user is created.]
  
  ## Metadata:
  - Schema-Category: ["Data"]
  - Impact-Level: ["Low"]
  - Requires-Backup: [false]
  - Reversible: [true] -- The trigger can be dropped.
  
  ## Structure Details:
  - Tables affected: public.profiles
  - Operations: INSERT
  
  ## Security Implications:
  - RLS Status: [Enabled]
  - Policy Changes: [No]
  - Auth Requirements: [Runs with the permissions of the trigger definer.]
  
  ## Performance Impact:
  - Indexes: [N/A]
  - Triggers: [This is the trigger function itself.]
  - Estimated Impact: [Negligible. A single insert after user creation.]
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, (new.raw_user_meta_data->>'role')::public."UserRole");
  RETURN new;
END;
$$;

/*
  # [Trigger] on_auth_user_created (v2)
  [This trigger executes the `handle_new_user` function after a new row is inserted into `auth.users`.]
*/
-- Drop the existing trigger if it exists, then recreate it to link to the new function version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

/*
  # [Security] Harden Function Security
  [This sets a fixed, safe search path for the functions to prevent potential security vulnerabilities related to search path manipulation.]
*/
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.save_course_with_children(jsonb) SET search_path = public;
