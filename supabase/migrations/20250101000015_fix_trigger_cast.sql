/*
  # [Fix Handle New User Trigger]
  This script updates the handle_new_user function to remove the invalid cast to "UserRole".
  The role column in profiles is text, so we should insert the text value directly.
*/

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
