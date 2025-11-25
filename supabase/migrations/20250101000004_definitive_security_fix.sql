/*
# [Definitive Security Fix for handle_new_user function]
This operation replaces the existing `handle_new_user` function to definitively resolve the "Function Search Path Mutable" security warning by explicitly setting a secure `search_path`.

## Query Description:
This script first drops the existing `handle_new_user` function and its associated trigger to ensure a clean re-creation. It then creates a new version of the function that is identical in logic but includes `SET search_path = 'public'` in its configuration. This prevents the function from being manipulated by malicious actors who might alter the session's search path. The trigger is then recreated to call this new, secure function. This change has no impact on existing data and is safe to run.

## Metadata:
- Schema-Category: "Security"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by reverting to the old function definition)

## Structure Details:
- Drops and recreates the function: `public.handle_new_user`
- Drops and recreates the trigger: `on_auth_user_created` on `auth.users`

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: Supabase Admin
- Mitigates: Search Path Hijacking (resolves "Function Search Path Mutable" warning).

## Performance Impact:
- Indexes: None
- Triggers: Recreated, no performance change.
- Estimated Impact: Negligible.
*/

-- Drop the existing trigger and function to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Create the function with a secure search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public' -- Explicitly set the search path for security
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

-- Recreate the trigger to call the new function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
