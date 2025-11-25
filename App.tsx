
import { Session } from '@supabase/supabase-js';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { Auth } from './components/Auth';
import { CourseEditor } from './components/CourseEditor';
import { CoursePlayer } from './components/CoursePlayer';
import { CoursePreview } from './components/CoursePreview';
import { BookOpenIcon, Edit3Icon, MoonIcon, PlusCircleIcon, SunIcon, Trash2Icon } from './components/icons';
import { StudentDashboard } from './components/StudentDashboard';
import { supabase } from './lib/supabaseClient';
import { Course, Profile, UserRole } from './types';

const newCourseTemplate: Omit<Course, 'id' | 'teacher_id'> = {
  title: 'Nuevo Curso sin Título',
  description: '',
  category: '',
  imageUrl: null,
  isPublished: false,
  modules: [],
};

type View = 'DASHBOARD' | 'EDITOR' | 'PREVIEW' | 'COURSE_PLAYER';
type Theme = 'light' | 'dark';

// Helper function to normalize MIME type to enum value
const normalizeFileType = (mimeType: string): 'pdf' | 'video' | null => {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return null;
};

// Helper function to convert enum value back to MIME type
const enumToMimeType = (enumValue: string): 'video/mp4' | 'application/pdf' => {
  if (enumValue === 'pdf') {
    return 'application/pdf';
  } else if (enumValue === 'video') {
    return 'video/mp4';
  }
  // Default fallback
  return 'application/pdf';
};

const Header: React.FC<{ profile: Profile; onLogout: () => void; theme: Theme; toggleTheme: () => void }> = ({ profile, onLogout, theme, toggleTheme }) => {
  const displayName = profile.first_name || profile.full_name?.split(' ')[0] || profile.email.split('@')[0];

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="EduFlow Logo" className="w-10 h-10 rounded-full object-cover shadow-sm" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">EduFlow</h1>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">TU FUTURO, TU RITMO</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
            <span className="text-slate-600 dark:text-slate-300 font-medium hidden sm:inline">Hola, {displayName}</span>
            <button onClick={onLogout} className="text-sm font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors">Cerrar Sesión</button>
          </div>
        </div>
      </div>
    </header>
  );
};

const TeacherDashboard: React.FC<{ courses: Course[], onEdit: (course: Course) => void, onCreate: () => void, onDelete: (courseId: string) => void }> = ({ courses, onEdit, onCreate, onDelete }) => {
  if (courses.length === 0) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Mis Cursos</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Gestiona tu contenido educativo desde aquí</p>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-16 max-w-2xl mx-auto border border-slate-100 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-slate-700/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpenIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No has creado ningún curso todavía</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-8 text-lg">¡Comienza a compartir tu conocimiento con el mundo!</p>
          <button onClick={onCreate} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-8 rounded-xl flex items-center gap-3 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-cyan-500/30 mx-auto">
            <PlusCircleIcon className="w-6 h-6" />
            Crear Mi Primer Curso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Mis Cursos</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona y organiza tu contenido educativo</p>
        </div>
        <button onClick={onCreate} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg">
          <PlusCircleIcon className="w-5 h-5" />
          Crear Nuevo Curso
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          <div key={course.id} className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col border border-slate-100 dark:border-slate-700">
            <div className="relative h-56 overflow-hidden">
              <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors z-10" />
              <img
                src={course.imageUrl || `https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/0891b2/ffffff?text=${encodeURIComponent(course.title)}`}
                alt={course.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4 z-20">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md ${course.isPublished ? 'bg-green-500/90 text-white' : 'bg-yellow-500/90 text-white'}`}>
                  {course.isPublished ? 'Publicado' : 'Borrador'}
                </span>
              </div>
            </div >
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-4">
                <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">{course.category || 'General'}</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{course.title}</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm flex-1 line-clamp-3 leading-relaxed">{course.description}</p>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end items-center gap-3">
                <button onClick={() => onEdit(course)} className="text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" title="Editar"><Edit3Icon className="w-5 h-5" /></button>
                <button onClick={() => onDelete(course.id)} className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" title="Eliminar"><Trash2Icon className="w-5 h-5" /></button>
              </div>
            </div>
          </div >
        ))}
      </div >
    </div >
  );
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app_view') as View) || 'DASHBOARD';
    }
    return 'DASHBOARD';
  });
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_selected_course');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Persist navigation state
  useEffect(() => {
    localStorage.setItem('app_view', view);
    if (selectedCourse) {
      localStorage.setItem('app_selected_course', JSON.stringify(selectedCourse));
    } else {
      localStorage.removeItem('app_selected_course');
    }
  }, [view, selectedCourse]);

  const fetchProfileAndCourses = async (currentSession: Session) => {
    // Avoid setting loading to true if we already have profile data for this user
    // This prevents flashing/refreshing feeling when switching tabs
    if (!profile || profile.id !== currentSession.user.id) {
      setLoading(true);
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      if (profileData.role === UserRole.TEACHER) {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            id, title, description, category, image_url, is_published, teacher_id,
            modules (
              id, title, order,
              lessons (
                id, title, order, file_name, file_type, file_url, file_size
              )
            )
          `)
          .eq('teacher_id', profileData.id)
          .order('order', { foreignTable: 'modules', ascending: true })
          .order('order', { foreignTable: 'modules.lessons', ascending: true });

        if (coursesError) throw coursesError;

        const formattedCourses: Course[] = coursesData.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          imageUrl: c.image_url,
          isPublished: c.is_published,
          teacher_id: c.teacher_id,
          modules: c.modules.map(m => ({
            id: m.id,
            title: m.title,
            order: m.order,
            lessons: m.lessons.map(l => ({
              id: l.id,
              title: l.title,
              order: l.order,
              content: l.file_url ? {
                name: l.file_name,
                type: enumToMimeType(normalizeFileType(l.file_type || 'pdf') || 'pdf'),
                url: l.file_url,
                size: l.file_size
              } : null
            }))
          }))
        }));
        setCourses(formattedCourses);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('No se pudieron cargar tus datos.');
      setProfile(null);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Ref para acceder al perfil actual dentro del listener sin reiniciar el efecto
  const profileRef = useRef<Profile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchProfileAndCourses(session);
      } else {
        setLoading(false);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Ignorar eventos de refresco de token si ya tenemos sesión y es el mismo usuario
        if (event === 'TOKEN_REFRESHED' && session?.user.id === currentSession?.user.id) {
          return;
        }

        setSession(currentSession);

        if (currentSession) {
          // Usar la referencia para verificar el perfil actual sin causar re-renders
          const currentProfile = profileRef.current;

          // Solo recargar datos si cambió el usuario o no tenemos perfil
          if (!currentProfile || currentProfile.id !== currentSession.user.id) {
            fetchProfileAndCourses(currentSession);
          }
        } else {
          setProfile(null);
          setCourses([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // ✅ Dependencias vacías para evitar bucles infinitos

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setCourses([]);
    setView('DASHBOARD');
    localStorage.removeItem('app_view');
    localStorage.removeItem('app_selected_course');
  };

  const handleCreateCourse = () => {
    if (!profile) return;
    const newCourse: Course = {
      id: uuidv4(),
      ...newCourseTemplate,
      teacher_id: profile.id
    };
    setSelectedCourse(newCourse);
    setView('EDITOR');
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setView('EDITOR');
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este curso? Esta acción es irreversible y eliminará todos sus módulos y lecciones.')) {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) {
        toast.error(`Error al eliminar el curso: ${error.message}`);
      } else {
        setCourses(courses.filter(c => c.id !== courseId));
        toast.success('Curso eliminado con éxito.');
      }
    }
  };

  const handleSaveCourse = async (updatedCourse: Course) => {
    if (!profile || !session) return;

    const savingToast = toast.loading('Guardando curso...');

    const coursePayload = {
      id: updatedCourse.id,
      title: updatedCourse.title,
      description: updatedCourse.description,
      category: updatedCourse.category,
      image_url: updatedCourse.imageUrl,
      is_published: updatedCourse.isPublished,
      teacher_id: updatedCourse.teacher_id,
      modules: updatedCourse.modules.map(module => ({
        id: module.id,
        title: module.title,
        order: module.order,
        lessons: module.lessons.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          content: lesson.content ? {
            name: lesson.content.name,
            type: normalizeFileType(lesson.content.type) || 'pdf',
            url: lesson.content.url,
            size: lesson.content.size,
          } : null,
        })),
      })),
    };

    try {
      const { error } = await supabase.rpc('save_course_with_children', {
        course_data: coursePayload,
      });

      if (error) {
        throw error;
      }

      toast.success('¡Curso guardado con éxito!', { id: savingToast });
      await fetchProfileAndCourses(session);
      setView('DASHBOARD');
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message}`, { id: savingToast });
      throw error;
    }
  };

  const handlePreview = (course: Course) => {
    setSelectedCourse(course);
    setView('PREVIEW');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><p className="text-slate-600 dark:text-slate-300 text-lg animate-pulse">Cargando plataforma...</p></div>;
  }

  if (!session || !profile) {
    return <Auth />;
  }

  if (profile.role === UserRole.STUDENT) {
    if (view === 'COURSE_PLAYER' && selectedCourse) {
      return <CoursePlayer course={selectedCourse} studentId={profile.id} onExit={() => setView('DASHBOARD')} />;
    }
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header profile={profile} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
        <main>
          <StudentDashboard
            studentId={profile.id}
            onPlayCourse={(course) => {
              setSelectedCourse(course);
              setView('COURSE_PLAYER');
            }}
          />
        </main>
      </div>
    );
  }

  if (profile.role !== UserRole.TEACHER) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Acceso Denegado</h1>
        <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">El acceso a la creación y edición de cursos está limitado a los docentes. Por favor, inicie sesión con una cuenta de docente para continuar.</p>
        <button onClick={handleLogout} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-colors">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header profile={profile} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      <main>
        {view === 'DASHBOARD' && (
          <TeacherDashboard courses={courses} onCreate={handleCreateCourse} onEdit={handleEditCourse} onDelete={handleDeleteCourse} />
        )}
        {view === 'EDITOR' && selectedCourse && (
          <CourseEditor course={selectedCourse} onSave={handleSaveCourse} onBack={() => setView('DASHBOARD')} onPreviewAsStudent={handlePreview} />
        )}
        {view === 'PREVIEW' && selectedCourse && (
          <CoursePreview course={selectedCourse} onExit={() => setView('EDITOR')} />
        )}
      </main>
    </div>
  );
}

export default App;
