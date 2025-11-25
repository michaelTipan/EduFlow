/*
          # [Function] handle_new_user
          [This function creates a new user profile when a new user signs up.]

          ## Query Description: [This operation securely recreates the function to handle new user profile creation. It sets a fixed search_path to mitigate security risks, resolving the 'Function Search Path Mutable' warning.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          [Recreates the 'handle_new_user' function and its associated trigger.]
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [None]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [Recreated]
          - Estimated Impact: [Negligible. Improves security posture.]
          */

-- Drop the old trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Recreate the function with a secure search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    (new.raw_user_meta_data->>'role')::public.user_role
  );
  RETURN new;
END;
$$;

-- Recreate the trigger to call the function
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


/*
          # [Function] save_course_with_children
          [This function provides an atomic way to save a course and all its nested modules and lessons in a single transaction.]

          ## Query Description: [This creates a new RPC function that accepts a JSON object representing a course. It handles the complex logic of creating, updating, and deleting the course, modules, and lessons within a single database transaction. This significantly improves data integrity and performance compared to making multiple calls from the client.]
          
          ## Metadata:
          - Schema-Category: ["Structural"]
          - Impact-Level: ["Medium"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          [Creates the 'save_course_with_children' function.]
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [The function checks that the calling user is the teacher_id of the course.]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Positive. Reduces multiple client-side network requests into a single, more efficient database operation.]
          */

CREATE OR REPLACE FUNCTION public.save_course_with_children(course_data jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    course_id_val uuid := (course_data->>'id')::uuid;
    teacher_id_val uuid := (course_data->>'teacher_id')::uuid;
    module_data jsonb;
    lesson_data jsonb;
    module_ids_to_keep uuid[];
    lesson_ids_to_keep uuid[];
BEGIN
    -- Ensure the user is the owner of the course
    IF auth.uid() != teacher_id_val THEN
        RAISE EXCEPTION 'User is not authorized to edit this course';
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

    -- Handle modules and lessons
    IF jsonb_array_length(course_data->'modules') > 0 THEN
        -- Collect module IDs from the input JSON
        SELECT array_agg((m->>'id')::uuid) INTO module_ids_to_keep
        FROM jsonb_array_elements(course_data->'modules') m;

        -- Delete modules that are not in the input
        DELETE FROM public.modules
        WHERE course_id = course_id_val AND id NOT IN (SELECT unnest(module_ids_to_keep));

        -- Loop through modules in the input and upsert them
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
                "order" = EXCLUDED.order;

            -- Handle lessons for the current module
            IF jsonb_array_length(module_data->'lessons') > 0 THEN
                -- Collect lesson IDs for the current module
                SELECT array_agg((l->>'id')::uuid) INTO lesson_ids_to_keep
                FROM jsonb_array_elements(module_data->'lessons') l;

                -- Delete lessons for this module that are not in the input
                DELETE FROM public.lessons
                WHERE module_id = (module_data->>'id')::uuid AND id NOT IN (SELECT unnest(lesson_ids_to_keep));

                -- Upsert lessons for the current module
                FOR lesson_data IN SELECT * FROM jsonb_array_elements(module_data->'lessons')
                LOOP
                    INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
                    VALUES (
                        (lesson_data->>'id')::uuid,
                        (module_data->>'id')::uuid,
                        lesson_data->>'title',
                        (lesson_data->>'order')::integer,
                        lesson_data->'content'->>'name',
                        (lesson_data->'content'->>'type')::public.lesson_file_type,
                        lesson_data->'content'->>'url',
                        (lesson_data->'content'->>'size')::bigint
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        "order" = EXCLUDED.order,
                        file_name = EXCLUDED.file_name,
                        file_type = EXCLUDED.file_type,
                        file_url = EXCLUDED.file_url,
                        file_size = EXCLUDED.file_size;
                END LOOP;
            ELSE
                -- If the module has no lessons in the input, delete all its existing lessons
                DELETE FROM public.lessons WHERE module_id = (module_data->>'id')::uuid;
            END IF;
        END LOOP;
    ELSE
        -- If the course has no modules in the input, delete all its existing modules (and lessons via CASCADE)
        DELETE FROM public.modules WHERE course_id = course_id_val;
    END IF;
END;
$$;
