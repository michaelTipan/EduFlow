import { motion } from 'framer-motion';
import React, { ChangeEvent, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { Course, Lesson, LessonFile, Module } from '../types';
import { CheckCircleIcon, FileTextIcon, GripVerticalIcon, PlusCircleIcon, Trash2Icon, UploadCloudIcon, VideoIcon, XIcon } from './icons';

interface CourseEditorProps {
    course: Course;
    onSave: (updatedCourse: Course) => Promise<void>;
    onPreviewAsStudent: (course: Course) => void;
    onBack: () => void;
}

type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'completed' | 'error';

const UploadProgress: React.FC<{ progress: number; status: UploadStatus }> = ({ progress, status }) => {
    return (
        <div className="w-full mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {status === 'preparing' && 'Preparando archivo...'}
                    {status === 'uploading' && 'Subiendo archivo...'}
                    {status === 'completed' && '¡Completado!'}
                    {status === 'error' && 'Error en la subida'}
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                <motion.div
                    className="bg-indigo-600 h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
            {status === 'completed' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400 text-sm"
                >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Archivo procesado correctamente</span>
                </motion.div>
            )}
        </div>
    );
};

const ContentPreviewModal: React.FC<{ file: LessonFile | null; onClose: () => void }> = ({ file, onClose }) => {
    if (!file) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{file.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                    {file.type === 'video/mp4' ? (
                        <video src={file.url} controls className="w-full h-auto rounded" />
                    ) : (
                        <iframe src={file.url} className="w-full h-[75vh] rounded" title="File Preview" />
                    )}
                </div>
            </div>
        </div>
    );
};

export const CourseEditor: React.FC<CourseEditorProps> = ({ course: initialCourse, onSave, onPreviewAsStudent, onBack }) => {
    const [course, setCourse] = useState<Course>(initialCourse);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: UploadStatus }>({});
    const [previewFile, setPreviewFile] = useState<LessonFile | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // ===== PERSISTENCIA AUTOMÁTICA CON LOCALSTORAGE =====

    // Auto-guardar en localStorage cada vez que cambia el curso
    React.useEffect(() => {
        const key = `course-draft-${course.id}`;
        try {
            localStorage.setItem(key, JSON.stringify(course));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }, [course]);

    // Recuperar draft al montar el componente Y cuando vuelve la pestaña
    // Recuperar draft al montar el componente Y cuando vuelve la pestaña
    React.useEffect(() => {
        const checkAndRecoverDraft = () => {
            if (!initialCourse?.id) return;

            const key = `course-draft-${initialCourse.id}`;
            const savedDraft = localStorage.getItem(key);

            if (savedDraft) {
                try {
                    const parsedDraft = JSON.parse(savedDraft);
                    // Recuperar silenciosamente
                    setCourse(parsedDraft);
                } catch (error) {
                    console.error('Error recovering draft:', error);
                    localStorage.removeItem(key);
                }
            }
        };

        // Pequeño delay para asegurar que todo esté listo
        const timer = setTimeout(checkAndRecoverDraft, 100);

        return () => clearTimeout(timer);
    }, [initialCourse.id]);

    // Advertencia al salir sin guardar
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const key = `course-draft-${course.id}`;
            const hasDraft = localStorage.getItem(key);

            if (hasDraft && JSON.stringify(course) !== JSON.stringify(initialCourse)) {
                e.preventDefault();
                e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de salir?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [course, initialCourse]);

    // ===== FIN PERSISTENCIA =====

    const handleSaveWrapper = async (courseToSave: Course) => {
        setIsSaving(true);
        try {
            await onSave(courseToSave);
            // Limpiar localStorage después de un guardado exitoso
            const key = `course-draft-${course.id}`;
            localStorage.removeItem(key);
            // Sin mensajes - limpieza silenciosa
        } catch (error: any) {
            console.error('Save failed RAW:', error);
            if (error?.message) console.error('Save failed message:', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCourseChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCourse({ ...course, [e.target.name]: e.target.value });
    };

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !course.teacher_id) return;
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${course.teacher_id}/${course.id}/${uuidv4()}.${fileExt}`;

        console.log('📤 Iniciando subida de imagen:', { bucket: 'course-images', path: filePath, size: file.size });
        const toastId = toast.loading('Subiendo imagen...');

        try {
            const { data, error: uploadError } = await supabase.storage.from('course-images').upload(filePath, file, {
                upsert: true
            });

            if (uploadError) {
                console.error('❌ Error de subida:', uploadError);
                throw uploadError;
            }

            console.log('✅ Imagen subida:', data);

            const { data: { publicUrl } } = supabase.storage.from('course-images').getPublicUrl(filePath);
            console.log('🔗 URL Pública:', publicUrl);

            setCourse({ ...course, imageUrl: publicUrl });
            toast.success('Imagen subida con éxito.', { id: toastId });
        } catch (error: any) {
            console.error('❌ Error general en subida:', error);
            toast.error(`Error al subir: ${error.message || 'Error desconocido'}`, { id: toastId });
        }
    };

    const handleAddModule = () => {
        const newModule: Module = { id: uuidv4(), title: `Nuevo Módulo ${course.modules.length + 1}`, lessons: [], order: course.modules.length };
        setCourse({ ...course, modules: [...course.modules, newModule] });
    };

    const handleUpdateModuleTitle = (moduleId: string, title: string) => {
        setCourse({
            ...course,
            modules: course.modules.map(m => m.id === moduleId ? { ...m, title } : m)
        });
    };

    const handleDeleteModule = (moduleId: string) => {
        setCourse({
            ...course,
            modules: course.modules.filter(m => m.id !== moduleId)
        });
    };

    const handleAddLesson = (moduleId: string) => {
        const module = course.modules.find(m => m.id === moduleId);
        if (!module) return;
        const newLesson: Lesson = { id: uuidv4(), title: `Nueva Lección`, content: null, order: module.lessons.length };
        setCourse({
            ...course,
            modules: course.modules.map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m)
        });
    };

    const handleUpdateLessonTitle = (moduleId: string, lessonId: string, title: string) => {
        setCourse({
            ...course,
            modules: course.modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, title } : l) } : m)
        });
    };

    const handleDeleteLesson = (moduleId: string, lessonId: string) => {
        setCourse({
            ...course,
            modules: course.modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m)
        });
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>, moduleId: string, lessonId: string) => {
        if (!e.target.files || e.target.files.length === 0 || !course.teacher_id) return;

        const file = e.target.files[0];
        if (file.type !== 'video/mp4' && file.type !== 'application/pdf') {
            toast.error('Tipo de archivo no soportado. Sube un video MP4 o un PDF.');
            return;
        }

        const fileExt = file.name.split('.').pop();
        const filePath = `${course.teacher_id}/${course.id}/${moduleId}/${lessonId}/${uuidv4()}.${fileExt}`;

        setUploadStatus(prev => ({ ...prev, [lessonId]: 'preparing' }));
        setUploadProgress(prev => ({ ...prev, [lessonId]: 0 }));

        // Simulate "preparing" state for better UX
        await new Promise(resolve => setTimeout(resolve, 800));

        setUploadStatus(prev => ({ ...prev, [lessonId]: 'uploading' }));

        // Simulate progress since Supabase v2 upload doesn't support callback easily
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                const current = prev[lessonId] || 0;
                if (current >= 90) return prev;
                return { ...prev, [lessonId]: current + 10 };
            });
        }, 500);

        const { data, error: uploadError } = await supabase.storage
            .from('lesson-files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        clearInterval(progressInterval);

        if (uploadError) {
            toast.error(`Error al subir el archivo: ${uploadError.message}`);
            setUploadStatus(prev => ({ ...prev, [lessonId]: 'error' }));
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[lessonId];
                return newProgress;
            });
            return;
        }

        setUploadStatus(prev => ({ ...prev, [lessonId]: 'completed' }));
        setUploadProgress(prev => ({ ...prev, [lessonId]: 100 }));

        // Wait for animation to finish before showing the file
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: { publicUrl } } = supabase.storage.from('lesson-files').getPublicUrl(data.path);

        const newFile: LessonFile = { name: file.name, type: file.type as 'video/mp4' | 'application/pdf', url: publicUrl, size: file.size };

        setCourse(prevCourse => ({
            ...prevCourse,
            modules: prevCourse.modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, content: newFile } : l) } : m)
        }));

        // Clean up status
        setUploadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[lessonId];
            return newStatus;
        });
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[lessonId];
            return newProgress;
        });
    };

    const triggerFileInput = (lessonId: string) => {
        fileInputRef.current[lessonId]?.click();
    };

    const removeFile = async (moduleId: string, lessonId: string) => {
        const lesson = course.modules.find(m => m.id === moduleId)?.lessons.find(l => l.id === lessonId);
        if (!lesson || !lesson.content) return;

        try {
            let filePath: string;
            const url = lesson.content.url;

            if (url.includes('/storage/v1/object/public/lesson-files/')) {
                filePath = url.split('/lesson-files/')[1];
            } else if (url.includes('/lesson-files/')) {
                const pathParts = url.split('/lesson-files/');
                filePath = pathParts[pathParts.length - 1];
            } else {
                try {
                    const urlObj = new URL(url);
                    const pathParts = urlObj.pathname.split('/');
                    const lessonFilesIndex = pathParts.indexOf('lesson-files');
                    if (lessonFilesIndex !== -1) {
                        filePath = pathParts.slice(lessonFilesIndex + 1).join('/');
                    } else {
                        throw new Error('No se pudo extraer la ruta del archivo');
                    }
                } catch {
                    filePath = url;
                }
            }

            const { error } = await supabase.storage.from('lesson-files').remove([filePath]);

            if (error) {
                toast.error(`Error al eliminar el archivo: ${error.message}`);
                return;
            }

            setCourse(prevCourse => ({
                ...prevCourse,
                modules: prevCourse.modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, content: null } : l) } : m)
            }));
            toast.success('Archivo eliminado.');
        } catch (error: any) {
            console.error('Error al eliminar archivo:', error);
            toast.error(`Error al eliminar el archivo: ${error.message || 'Error desconocido'}`);
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination, type } = result;
        if (!destination) return;

        if (type === 'MODULES') {
            const items = Array.from(course.modules);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            const updatedModules = items.map((mod, index) => ({ ...mod, order: index }));
            setCourse({ ...course, modules: updatedModules });
        } else if (type.startsWith('LESSONS_')) {
            const moduleId = type.split('_')[1];
            const module = course.modules.find(m => m.id === moduleId);
            if (!module) return;

            const items = Array.from(module.lessons);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            const updatedLessons = items.map((less, index) => ({ ...less, order: index }));
            const updatedModules = course.modules.map(m =>
                m.id === moduleId ? { ...m, lessons: updatedLessons } : m
            );
            setCourse({ ...course, modules: updatedModules });
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-slate-900 dark:text-white">
            <ContentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            <div className="flex justify-between items-center mb-8">
                <button onClick={onBack} className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-2 font-medium transition-colors">
                    <span className="text-xl">&larr;</span> Volver al Panel
                </button>
                <div className="flex gap-3">
                    <button onClick={() => handleSaveWrapper(course)} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none">
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button onClick={() => onPreviewAsStudent(course)} disabled={isSaving} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none">
                        Previsualizar
                    </button>
                    <button onClick={() => handleSaveWrapper({ ...course, isPublished: !course.isPublished })} disabled={isSaving} className={`${course.isPublished ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none`}>
                        {isSaving ? '...' : (course.isPublished ? 'Despublicar' : 'Publicar')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 border border-slate-100 dark:border-slate-700">
                <h2 className="text-2xl font-bold mb-8 border-b border-slate-100 dark:border-slate-700 pb-4 flex items-center gap-3">
                    <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400">
                        <FileTextIcon className="w-6 h-6" />
                    </div>
                    Información del Curso
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Título del Curso</label>
                            <input type="text" name="title" id="title" value={course.title} onChange={handleCourseChange} className="block w-full shadow-sm sm:text-sm border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white py-3 px-4" placeholder="Ej: Introducción a React" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Descripción</label>
                            <textarea name="description" id="description" value={course.description} onChange={handleCourseChange} rows={4} className="block w-full shadow-sm sm:text-sm border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white py-3 px-4" placeholder="Describe de qué trata tu curso..." />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Categoría</label>
                            <input type="text" name="category" id="category" value={course.category} onChange={handleCourseChange} className="block w-full shadow-sm sm:text-sm border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white py-3 px-4" placeholder="Ej: Programación, Diseño, Marketing" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Imagen del Curso</label>
                        <label htmlFor="file-upload" className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-xl hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors bg-slate-50 dark:bg-slate-800/50 cursor-pointer relative group">
                            <div className="space-y-2 text-center w-full">
                                {course.imageUrl ? (
                                    <div className="relative">
                                        <img src={course.imageUrl} alt="preview" className="mx-auto h-40 w-full object-cover rounded-lg shadow-md" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <p className="text-white font-medium">Cambiar imagen</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <svg className="mx-auto h-12 w-12 text-slate-400 group-hover:text-cyan-500 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <p className="mt-2 text-sm text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">Haz clic para subir una imagen</p>
                                    </div>
                                )}
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                            </div>
                        </label>
                    </div>
                </div>

                <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4 flex items-center gap-3">
                    <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400">
                        <GripVerticalIcon className="w-6 h-6" />
                    </div>
                    Contenido del Curso
                </h2>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="modules-droppable" type="MODULES">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                {course.modules.map((module, moduleIndex) => (
                                    <Draggable key={module.id} draggableId={module.id} index={moduleIndex}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-cyan-500 z-50' : ''}`}
                                                style={provided.draggableProps.style}
                                            >
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div {...provided.dragHandleProps} className="cursor-move text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><GripVerticalIcon className="w-6 h-6" /></div>
                                                    <span className="font-bold text-lg text-slate-500 dark:text-slate-400">Módulo {moduleIndex + 1}:</span>
                                                    <input type="text" value={module.title} onChange={(e) => handleUpdateModuleTitle(module.id, e.target.value)} className="font-bold text-xl bg-transparent border-b-2 border-transparent focus:border-cyan-500 focus:outline-none flex-1 p-1 text-slate-900 dark:text-white transition-all" />
                                                    <button onClick={() => handleDeleteModule(module.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2Icon className="w-5 h-5" /></button>
                                                </div>
                                                <Droppable droppableId={module.id} type={`LESSONS_${module.id}`}>
                                                    {(provided) => (
                                                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 pl-2 sm:pl-10">
                                                            {module.lessons.map((lesson, lessonIndex) => (
                                                                <Draggable key={lesson.id} draggableId={lesson.id} index={lessonIndex}>
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-cyan-400 z-50' : ''}`}
                                                                            style={provided.draggableProps.style}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div {...provided.dragHandleProps} className="cursor-move text-slate-300 hover:text-slate-500 transition-colors"><GripVerticalIcon className="w-5 h-5" /></div>
                                                                                <input type="text" value={lesson.title} onChange={(e) => handleUpdateLessonTitle(module.id, lesson.id, e.target.value)} className="bg-transparent border-b border-transparent focus:border-cyan-300 dark:focus:border-cyan-700 focus:outline-none flex-1 p-1 font-medium text-slate-700 dark:text-slate-200" />
                                                                                <button onClick={() => handleDeleteLesson(module.id, lesson.id)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2Icon className="w-4 h-4" /></button>
                                                                            </div>
                                                                            <div className="mt-4 pl-8">
                                                                                {lesson.content ? (
                                                                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                                        <div className="flex items-center gap-3 text-sm truncate">
                                                                                            <div className="p-2 bg-white dark:bg-slate-600 rounded-md shadow-sm">
                                                                                                {lesson.content.type === 'video/mp4' ? <VideoIcon className="w-5 h-5 text-cyan-500" /> : <FileTextIcon className="w-5 h-5 text-cyan-500" />}
                                                                                            </div>
                                                                                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">{lesson.content.name}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-3">
                                                                                            <button onClick={() => setPreviewFile(lesson.content)} className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 uppercase tracking-wide">Ver</button>
                                                                                            <button onClick={() => removeFile(module.id, lesson.id)} className="text-slate-400 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4" /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : uploadStatus[lesson.id] ? (
                                                                                    <UploadProgress progress={uploadProgress[lesson.id] || 0} status={uploadStatus[lesson.id]} />
                                                                                ) : (
                                                                                    <>
                                                                                        <input type="file" className="hidden" ref={el => fileInputRef.current[lesson.id] = el} onChange={(e) => handleFileChange(e, module.id, lesson.id)} accept="video/mp4,application/pdf" />
                                                                                        <button onClick={() => triggerFileInput(lesson.id)} className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 transition-all group">
                                                                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                                                                                <UploadCloudIcon className="h-6 w-6 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                                                                                            </div>
                                                                                            <span className="block text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Subir Video (MP4) o Documento (PDF)</span>
                                                                                            <span className="block text-xs text-slate-400 mt-1">Máximo 100MB</span>
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                                <button onClick={() => handleAddLesson(module.id)} className="flex items-center gap-2 text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 ml-10 mt-6 py-2 px-4 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all">
                                                    <PlusCircleIcon className="w-5 h-5" /> Añadir Lección
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <button onClick={handleAddModule} className="mt-8 w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex items-center justify-center gap-2 text-lg font-bold text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-50/30 dark:hover:bg-cyan-900/10 transition-all">
                    <PlusCircleIcon className="w-6 h-6" /> Añadir Nuevo Módulo
                </button>
            </div>
        </div>
    );
};
