import { AuthError } from '@supabase/supabase-js';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { UserRole } from '../types';
import { BookOpenIcon } from './icons';

type AuthMode = 'login' | 'register';

export const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'register') {
        // Validaciones
        if (!firstName.trim() || !lastName.trim()) {
          toast.error('Por favor ingresa tu nombre y apellido.');
          setIsLoading(false);
          return;
        }

        if (password.length < 8) {
          toast.error('La contraseña debe tener al menos 8 caracteres.');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          toast.error('Las contraseñas no coinciden.');
          setIsLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: `${firstName.trim()} ${lastName.trim()}`,
            },
            emailRedirectTo: window.location.origin
          },
        });

        if (signUpError) throw signUpError;

        // Verificar si el email ya está registrado
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error('Este correo ya está registrado. Intenta iniciar sesión.');
          setIsLoading(false);
          return;
        }

        toast.success('¡Registro exitoso! Ya puedes iniciar sesión.');

        // Limpiar campos y cambiar a login
        setPassword('');
        setConfirmPassword('');
        setMode('login');
      } else {
        // LOGIN
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          // Mejorar mensajes de error
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Correo o contraseña incorrectos');
          } else if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Debes verificar tu correo antes de iniciar sesión');
          }
          throw signInError;
        }

        // Login exitoso - App.tsx manejará la redirección
        toast.success('¡Bienvenido!');
      }
    } catch (err) {
      const authError = err as AuthError | Error;
      console.error('Auth error:', authError);
      toast.error(authError.message || 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-700/20 via-transparent to-transparent" />

        <div className="relative z-20 flex flex-col justify-center px-12 text-white h-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border-2 border-white/20">
              <BookOpenIcon className="w-8 h-8 text-cyan-300" />
            </div>
            <h1 className="text-5xl font-bold tracking-tighter">EduFlow</h1>
          </div>
          <h2 className="text-4xl font-light mb-6 leading-tight">
            Tu Futuro, <br />
            <span className="font-bold text-cyan-400">Tu Ritmo</span>
          </h2>
          <p className="text-slate-300 text-lg max-w-md leading-relaxed">
            La plataforma educativa diseñada para potenciar tu aprendizaje con flexibilidad y elegancia.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shadow-md">
                <BookOpenIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">EduFlow</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Tu Futuro, Tu Ritmo</p>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {mode === 'login' ? 'Ingresa tus credenciales para continuar' : 'Únete a nuestra comunidad educativa'}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {mode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="Tu nombre"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apellido</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="Tu apellido"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo electrónico</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm dark:bg-slate-800 dark:text-white transition-all"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm dark:bg-slate-800 dark:text-white transition-all"
                  placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Contraseña</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="Confirma tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol</label>
                    <select
                      id="role"
                      name="role"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm dark:bg-slate-800 dark:text-white transition-all"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                    >
                      <option value={UserRole.STUDENT}>Estudiante</option>
                      <option value={UserRole.TEACHER}>Docente</option>
                      <option value={UserRole.COORDINATOR}>Coordinador</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-cyan-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'
                )}
              </button>
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {mode === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              <button
                type="button"
                onClick={toggleMode}
                disabled={isLoading}
                className="ml-2 font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors disabled:opacity-50"
              >
                {mode === 'login' ? 'Regístrate ahora' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
