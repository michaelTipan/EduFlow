/*
          # [SECURITY] Harden handle_new_user function
          This migration enhances the security of the `handle_new_user` function by explicitly setting its `search_path`. This is a recommended security practice to prevent potential attacks where a malicious user could create objects (like tables or functions) in a public schema that could then be executed by a trigger function. By setting a specific `search_path`, we ensure the function only looks for objects in trusted schemas.

          ## Query Description: [This operation modifies the configuration of an existing database function to improve security. It alters the `handle_new_user` function to set a fixed `search_path`. This change is non-destructive and has no impact on existing data. It is a preventative security measure.]
          
          ## Metadata:
          - Schema-Category: ["Security", "Structural"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Function Modified: `public.handle_new_user()`
          
          ## Security Implications:
          - RLS Status: [Not Applicable]
          - Policy Changes: [No]
          - Auth Requirements: [No]
          - Mitigates: This change helps mitigate risks associated with CVE-2018-1058 by explicitly defining the search path, preventing malicious users from executing arbitrary code through function triggers.
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [None. This is a configuration change with negligible performance impact.]
          */

ALTER FUNCTION public.handle_new_user() SET search_path = public;
