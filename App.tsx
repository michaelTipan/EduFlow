import React, { useState, useEffect } from 'react';
import { Course, Profile, UserRole } from './types';
import { Auth } from './components/Auth';
import { CourseEditor } from './components/CourseEditor';
import { CoursePreview } from './components/CoursePreview';
import { BookOpenIcon, Edit3Icon, PlusCircleIcon, Trash2Icon } from './components/icons';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const newCourseTemplate: Omit<Course, 'id' | 'teacher_id'> = {
    title: 'Nuevo Curso sin Título',
    description: '',
    category: '',
    imageUrl: null,
    isPublished: false,
    modules: [],
};

type View = 'DASHBOARD' | 'EDITOR' | 'PREVIEW';

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

const Header: React.FC<{ profile: Profile; onLogout: () => void }> = ({ profile, onLogout }) => (
    <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-3">
                    <BookOpenIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400"/>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EduFlow</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-gray-600 dark:text-gray-300">Bienvenido, {profile.email} ({profile.role})</span>
                    <button onClick={onLogout} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Cerrar Sesión</button>
                </div>
            </div>
        </div>
    </header>
);

const TeacherDashboard: React.FC<{ courses: Course[], onEdit: (course: Course) => void, onCreate: () => void, onDelete: (courseId: string) => void }> = ({ courses, onEdit, onCreate, onDelete }) => {
    if (courses.length === 0) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Mis Cursos</h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12">
                    <BookOpenIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No has creado ningún curso todavía</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">¡Comienza a compartir tu conocimiento con el mundo!</p>
                    <button onClick={onCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors mx-auto">
                        <PlusCircleIcon className="w-5 h-5"/>
                        Crear Mi Primer Curso
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Mis Cursos</h2>
                <button onClick={onCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
                    <PlusCircleIcon className="w-5 h-5"/>
                    Crear Nuevo Curso
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                    <div key={course.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
                        <img src={course.imageUrl || `https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/6366f1/ffffff?text=${encodeURIComponent(course.title)}`} alt={course.title} className="w-full h-48 object-cover"/>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm flex-1">{course.description}</p>
                            <div className="mt-4 flex justify-between items-center">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${course.isPublished ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                    {course.isPublished ? 'Publicado' : 'Borrador'}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => onEdit(course)} className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Edit3Icon className="w-5 h-5"/></button>
                                    <button onClick={() => onDelete(course.id)} className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Trash2Icon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [view, setView] = useState<View>('DASHBOARD');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndCourses = async (currentSession: Session) => {
    setLoading(true);
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
                type: enumToMimeType(l.file_type || 'pdf'), // Convert enum value back to MIME type
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
      (_event, session) => {
        setSession(session);
        if (session) {
          setTimeout(() => {
            fetchProfileAndCourses(session);
          }, 0);
        } else {
          setProfile(null);
          setCourses([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setCourses([]);
    setView('DASHBOARD');
  };

  const handleCreateCourse = () => {
    if(!profile) return;
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
  
    // Prepare the payload for the RPC function, converting keys to snake_case
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
            type: normalizeFileType(lesson.content.type) || 'pdf', // Normalize MIME type to enum value
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><p className="text-white text-lg">Cargando plataforma...</p></div>;
  }

  if (!session || !profile) {
    return <Auth />;
  }

  if (profile.role !== UserRole.TEACHER) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-white p-4 text-center">
        <h1 className="text-2xl mb-4">Acceso Denegado</h1>
        <p className="mb-4 max-w-md">El acceso a la creación y edición de cursos está limitado a los docentes. Por favor, inicie sesión con una cuenta de docente para continuar.</p>
        <button onClick={handleLogout} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header profile={profile} onLogout={handleLogout} />
      <main>
        {view === 'DASHBOARD' && (
            <TeacherDashboard courses={courses} onCreate={handleCreateCourse} onEdit={handleEditCourse} onDelete={handleDeleteCourse}/>
        )}
        {view === 'EDITOR' && selectedCourse && (
            <CourseEditor course={selectedCourse} onSave={handleSaveCourse} onBack={() => setView('DASHBOARD')} onPreviewAsStudent={handlePreview}/>
        )}
        {view === 'PREVIEW' && selectedCourse && (
            <CoursePreview course={selectedCourse} onExit={() => setView('EDITOR')} />
        )}
      </main>
    </div>
  );
}

export default App;
