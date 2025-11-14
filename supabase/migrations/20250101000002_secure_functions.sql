/*
# [SECURITY] Secure Functions
Set a secure search_path for all functions.

## Query Description: 
This operation hardens the security of the `handle_new_user` function by explicitly setting its `search_path`. This prevents potential hijacking attacks where a malicious user could create objects (like tables or functions) in a schema that the function might inadvertently use. It ensures the function only looks for objects in the `public` schema.

## Metadata:
- Schema-Category: "Safe"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Modifies the `handle_new_user` function.

## Security Implications:
- RLS Status: Not changed
- Policy Changes: No
- Auth Requirements: None
- Mitigates search_path-related vulnerabilities.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible.
*/

ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
