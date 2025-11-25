/*
  # Fix: Handle null content in lessons
  
  This migration fixes the save_course_with_children function to properly handle
  lessons where content is null (lessons without uploaded files).
*/

CREATE OR REPLACE FUNCTION public.save_course_with_children(course_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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
        NULLIF(course_data->>'image_url', 'null'),
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
            -- Handle null content gracefully
            IF lesson_json->'content' IS NOT NULL AND lesson_json->'content' != 'null'::jsonb THEN
                INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
                VALUES (
                    (lesson_json->>'id')::uuid,
                    module_id_val,
                    lesson_json->>'title',
                    (lesson_json->>'order')::integer,
                    lesson_json->'content'->>'name',
                    (lesson_json->'content'->>'type')::public.file_type,
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
            ELSE
                -- Lesson without content
                INSERT INTO public.lessons (id, module_id, title, "order", file_name, file_type, file_url, file_size)
                VALUES (
                    (lesson_json->>'id')::uuid,
                    module_id_val,
                    lesson_json->>'title',
                    (lesson_json->>'order')::integer,
                    NULL,
                    NULL,
                    NULL,
                    NULL
                )
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    "order" = EXCLUDED."order",
                    file_name = NULL,
                    file_type = NULL,
                    file_url = NULL,
                    file_size = NULL;
            END IF;
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

COMMENT ON FUNCTION public.save_course_with_children(jsonb) IS 'Saves a course with all its modules and lessons atomically. Handles null content for lessons without uploaded files.';

