/*
  # [Refine Profiles Schema]
  This script adds first_name and last_name columns to the profiles table and updates the user creation trigger.

  ## Structure Details:
  - Tables affected: profiles
  - Columns added: first_name, last_name
  - Functions updated: handle_new_user
*/

-- 1. Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Update handle_new_user function to extract names from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$;
