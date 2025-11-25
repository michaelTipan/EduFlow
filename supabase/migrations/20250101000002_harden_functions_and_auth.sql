/*
# [Function Security Hardening]
This migration hardens the security of the `handle_new_user` function by explicitly setting its `search_path`.

## Query Description:
This operation modifies the `handle_new_user` function to prevent potential search path hijacking attacks. By setting a fixed `search_path`, we ensure the function always executes with expected and secure permissions, resolving the "Function Search Path Mutable" security warning. This change has no impact on existing data and is safe to apply.

## Metadata:
- Schema-Category: "Security"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Modifies function: `public.handle_new_user`

## Security Implications:
- RLS Status: Not applicable
- Policy Changes: No
- Auth Requirements: Resolves a security warning related to function execution context.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible performance impact.
*/
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
