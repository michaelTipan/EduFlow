import React, { useState, useEffect } from 'react';
import { Course, Enrollment, Progress } from '../types';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { BookOpenIcon, PlayCircleIcon, CheckCircleIcon } from './icons';

interface StudentDashboardProps {
    studentId: string;
    onPlayCourse: (course: Course) => void;
}

const normalizeFileType = (mimeType: string): 'pdf' | 'video' | null => {
    if (mimeType === 'application/pdf') {
        return 'pdf';
    } else if (mimeType.startsWith('video/')) {
        return 'video';
    }
    return null;
};

const enumToMimeType = (enumValue: string): 'video/mp4' | 'application/pdf' => {
    if (enumValue === 'pdf') {
        return 'application/pdf';
    } else if (enumValue === 'video') {
        return 'video/mp4';
    }
    return 'application/pdf';
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId, onPlayCourse }) => {
    const [activeTab, setActiveTab] = useState<'catalog' | 'my-courses'>('catalog');
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [progress, setProgress] = useState<Progress[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<Course | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all published courses
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
                .eq('is_published', true)
                .order('order', { foreignTable: 'modules', ascending: true })
                .order('order', { foreignTable: 'modules.lessons', ascending: true });

            if (coursesError) throw coursesError;

            // Fetch enrollments
            const { data: enrollmentsData, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select('*')
                .eq('student_id', studentId);

            if (enrollmentsError) throw enrollmentsError;

            // Fetch progress
            const { data: progressData, error: progressError } = await supabase
                .from('progress')
                .select('*')
                .eq('student_id', studentId);

            if (progressError) throw progressError;

            const formattedCourses: Course[] = coursesData.map(c => ({
                id: c.id,
                title: c.title,
                description: c.description,
                category: c.category,
                imageUrl: c.image_url,
                isPublished: c.is_published,
                teacher_id: c.teacher_id,
                modules: c.modules.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    order: m.order,
                    lessons: m.lessons.map((l: any) => ({
                        id: l.id,
                        title: l.title,
                        order: l.order,
                        content: l.file_url ? {
                            name: l.file_name,
                            type: enumToMimeType(l.file_type || 'pdf'),
                            url: l.file_url,
                            size: l.file_size
                        } : null
                    }))
                }))
            }));

            setCourses(formattedCourses);
            setEnrollments(enrollmentsData);
            setProgress(progressData);

        } catch (error: any) {
            toast.error('Error al cargar cursos');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (courseId: string) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .insert({ student_id: studentId, course_id: courseId });

            if (error) throw error;

            toast.success('¡Inscripción exitosa!');
            await fetchData(); // Refresh data
            setActiveTab('my-courses');
        } catch (error: any) {
            toast.error('Error al inscribirse');
            console.error(error);
        }
    };

    const isEnrolled = (courseId: string) => {
        return enrollments.some(e => e.course_id === courseId);
    };

    const getCourseProgress = (course: Course) => {
        const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
        if (totalLessons === 0) return 0;

        const courseLessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
        const completedLessons = progress.filter(p => courseLessonIds.includes(p.lesson_id) && p.is_completed).length;

        return Math.round((completedLessons / totalLessons) * 100);
    };

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div></div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex gap-4 bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'catalog' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Catálogo de Cursos
                    </button>
                    <button
                        onClick={() => setActiveTab('my-courses')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'my-courses' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Mis Cursos
                    </button>
                </div>
                <div className="relative w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Buscar cursos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white shadow-sm transition-all"
                    />
                </div>
            </div>

            {activeTab === 'catalog' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCourses.map(course => (
                        <div key={course.id} className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-slate-100 dark:border-slate-700">
                            <div className="relative h-48 overflow-hidden">
                                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors z-10" />
                                <img src={course.imageUrl || `https://placehold.co/600x400/0891b2/ffffff?text=${encodeURIComponent(course.title)}`} alt={course.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 px-3 py-1 rounded-full uppercase tracking-wider">
                                        {course.category}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                        <BookOpenIcon className="w-3.5 h-3.5" />
                                        {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lecciones
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{course.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-3 flex-1 leading-relaxed">{course.description}</p>

                                <div className="flex gap-3 mt-auto">
                                    <button
                                        onClick={() => setSelectedCourseForDetails(course)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
                                    >
                                        Ver Detalles
                                    </button>
                                    {isEnrolled(course.id) ? (
                                        <button
                                            onClick={() => {
                                                setActiveTab('my-courses');
                                            }}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg"
                                        >
                                            Ver Curso
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleEnroll(course.id)}
                                            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg hover:shadow-cyan-500/20"
                                        >
                                            Inscribirse
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Course Details Modal */}
            {selectedCourseForDetails && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                        <div className="relative h-64">
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-10" />
                            <img src={selectedCourseForDetails.imageUrl || `https://placehold.co/600x400/0891b2/ffffff?text=${encodeURIComponent(selectedCourseForDetails.title)}`} alt={selectedCourseForDetails.title} className="w-full h-full object-cover" />
                            <button
                                onClick={() => setSelectedCourseForDetails(null)}
                                className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors z-20 backdrop-blur-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <div className="absolute bottom-6 left-6 right-6 z-20">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs font-bold text-white bg-cyan-600 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                        {selectedCourseForDetails.category}
                                    </span>
                                    <span className="text-xs text-slate-200 flex items-center gap-1 font-medium bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                                        <BookOpenIcon className="w-3.5 h-3.5" />
                                        {selectedCourseForDetails.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lecciones
                                    </span>
                                </div>
                                <h2 className="text-3xl font-bold text-white shadow-sm">{selectedCourseForDetails.title}</h2>
                            </div>
                        </div>
                        <div className="p-6 sm:p-8">
                            <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg leading-relaxed">{selectedCourseForDetails.description}</p>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <BookOpenIcon className="w-6 h-6 text-cyan-600" />
                                Contenido del Curso
                            </h3>
                            <div className="space-y-4 mb-8">
                                {selectedCourseForDetails.modules.map(module => (
                                    <div key={module.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-800/50">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-lg">{module.title}</h4>
                                        <ul className="space-y-2.5">
                                            {module.lessons.map(lesson => (
                                                <li key={lesson.id} className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700/50 transition-colors">
                                                    <div className="p-1.5 bg-white dark:bg-slate-700 rounded-md shadow-sm text-cyan-600 dark:text-cyan-400">
                                                        {lesson.content?.type === 'video/mp4' ? (
                                                            <PlayCircleIcon className="w-4 h-4" />
                                                        ) : (
                                                            <BookOpenIcon className="w-4 h-4" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium">{lesson.title}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setSelectedCourseForDetails(null)}
                                    className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cerrar
                                </button>
                                {isEnrolled(selectedCourseForDetails.id) ? (
                                    <button
                                        onClick={() => {
                                            setSelectedCourseForDetails(null);
                                            setActiveTab('my-courses');
                                        }}
                                        className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg hover:shadow-green-500/30 transition-all"
                                    >
                                        Ir al Curso
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            handleEnroll(selectedCourseForDetails.id);
                                            setSelectedCourseForDetails(null);
                                        }}
                                        className="px-8 py-2.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 shadow-lg hover:shadow-cyan-500/30 transition-all"
                                    >
                                        Inscribirse Ahora
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'my-courses' && (
                <div className="space-y-6">
                    {enrollments.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="bg-slate-50 dark:bg-slate-700/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <BookOpenIcon className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No estás inscrito en ningún curso</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 mb-8">Explora el catálogo para encontrar cursos interesantes.</p>
                            <button
                                onClick={() => setActiveTab('catalog')}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-cyan-500/30 transition-all"
                            >
                                Ir al Catálogo
                            </button>
                        </div>
                    ) : (
                        courses.filter(c => isEnrolled(c.id)).map(course => {
                            const progressPercent = getCourseProgress(course);
                            return (
                                <div key={course.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-lg transition-all p-6 flex flex-col sm:flex-row gap-8 items-center border border-slate-100 dark:border-slate-700">
                                    <img src={course.imageUrl || `https://placehold.co/600x400/0891b2/ffffff?text=${encodeURIComponent(course.title)}`} alt={course.title} className="w-full sm:w-56 h-36 object-cover rounded-xl shadow-sm" />
                                    <div className="flex-1 w-full">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{course.title}</h3>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
                                            <div className="bg-cyan-600 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
                                            <span>Progreso: {progressPercent}%</span>
                                            <span>{course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lecciones</span>
                                        </div>
                                        <button
                                            onClick={() => onPlayCourse(course)}
                                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-cyan-500/20 flex items-center gap-2"
                                        >
                                            <PlayCircleIcon className="w-5 h-5" />
                                            {progressPercent > 0 ? 'Continuar Aprendiendo' : 'Comenzar Curso'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};
