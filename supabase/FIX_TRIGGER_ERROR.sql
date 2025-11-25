-- =====================================================
-- ARREGLO RÁPIDO: Función handle_new_user robusta
-- =====================================================
-- Ejecuta esto en el SQL Editor de Supabase para reemplazar la función

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insertar perfil con valores por defecto seguros
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    first_name, 
    last_name, 
    full_name
  )
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name;
    
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero no falla el registro
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Verificar que el trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
