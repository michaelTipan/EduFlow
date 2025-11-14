/*
# [Function Hardening & Finalization]
This script replaces the user creation function to definitively fix the 'search_path' security warning. It also ensures the function is robust.

## Query Description:
This operation replaces the existing `handle_new_user` function with a more secure version that explicitly sets its execution scope. This mitigates a security warning and follows database best practices. No data will be affected.

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true (by reverting to the previous function definition)

## Structure Details:
- Function: `public.handle_new_user`

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: Supabase admin
- Fixes: Resolves the "Function Search Path Mutable" warning.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.users
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
