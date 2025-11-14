import React, { useState, useRef, ChangeEvent } from 'react';
import { Course, Module, Lesson, LessonFile } from '../types';
import { PlusCircleIcon, VideoIcon, FileTextIcon, Trash2Icon, UploadCloudIcon, GripVerticalIcon, XIcon } from './icons';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';

interface CourseEditorProps {
    course: Course;
    onSave: (updatedCourse: Course) => Promise<void>;
    onPreviewAsStudent: (course: Course) => void;
    onBack: () => void;
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
    </div>
);

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
    const [previewFile, setPreviewFile] = useState<LessonFile | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

    const handleSaveWrapper = async (courseToSave: Course) => {
        setIsSaving(true);
        try {
            await onSave(courseToSave);
        } catch (error: any) {
            console.error('Save failed RAW:', error);

            // Para ver el detalle que devuelve Supabase / PostgREST
            if (error?.message) {
                console.error('Save failed message:', error.message);
            }
            if (error?.error) {
                console.error('Save failed error:', error.error);
            }
            if (error?.data) {
                console.error('Save failed data:', error.data);
            }
        }
        finally {
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

        const toastId = toast.loading('Subiendo imagen...');
        const { error: uploadError } = await supabase.storage.from('course-images').upload(filePath, file);

        if (uploadError) {
            toast.error(`Error al subir la imagen: ${uploadError.message}`, { id: toastId });
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('course-images').getPublicUrl(filePath);
        setCourse({ ...course, imageUrl: publicUrl });
        toast.success('Imagen subida con éxito.', { id: toastId });
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

        setUploadProgress(prev => ({ ...prev, [lessonId]: 0 }));

        const { data, error: uploadError } = await supabase.storage
            .from('lesson-files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            }, (event) => {
                if (event.type === 'progress') {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(prev => ({ ...prev, [lessonId]: progress }));
                }
            });

        if (uploadError) {
            toast.error(`Error al subir el archivo: ${uploadError.message}`);
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[lessonId];
                return newProgress;
            });
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('lesson-files').getPublicUrl(data.path);

        const newFile: LessonFile = { name: file.name, type: file.type as 'video/mp4' | 'application/pdf', url: publicUrl, size: file.size };

        setCourse(prevCourse => ({
            ...prevCourse,
            modules: prevCourse.modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, content: newFile } : l) } : m)
        }));
    };

    const triggerFileInput = (lessonId: string) => {
        fileInputRef.current[lessonId]?.click();
    };

    const removeFile = async (moduleId: string, lessonId: string) => {
        const lesson = course.modules.find(m => m.id === moduleId)?.lessons.find(l => l.id === lessonId);
        if (!lesson || !lesson.content) return;

        try {
            // Extract file path from URL - handle both public URLs and storage paths
            let filePath: string;
            const url = lesson.content.url;

            if (url.includes('/storage/v1/object/public/lesson-files/')) {
                // Public URL format: https://project.supabase.co/storage/v1/object/public/lesson-files/path/to/file
                filePath = url.split('/lesson-files/')[1];
            } else if (url.includes('/lesson-files/')) {
                // Alternative URL format
                const pathParts = url.split('/lesson-files/');
                filePath = pathParts[pathParts.length - 1];
            } else {
                // Try to parse as URL
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
                    // If URL parsing fails, assume it's already a path
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
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[lessonId];
                return newProgress;
            });
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
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-white">
            <ContentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-indigo-600 dark:text-indigo-400 hover:underline">&larr; Volver al Panel</button>
                <div className="flex gap-2">
                    <button onClick={() => handleSaveWrapper(course)} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button onClick={() => onPreviewAsStudent(course)} disabled={isSaving} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">Previsualizar</button>
                    <button onClick={() => handleSaveWrapper({ ...course, isPublished: !course.isPublished })} disabled={isSaving} className={`${course.isPublished ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed`}>
                        {isSaving ? '...' : (course.isPublished ? 'Despublicar' : 'Publicar')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-700">Información del Curso</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título del Curso</label>
                            <input type="text" name="title" id="title" value={course.title} onChange={handleCourseChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                            <textarea name="description" id="description" value={course.description} onChange={handleCourseChange} rows={4} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                            <input type="text" name="category" id="category" value={course.category} onChange={handleCourseChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen del Curso</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {course.imageUrl ? (
                                    <img src={course.imageUrl} alt="preview" className="mx-auto h-32 w-auto object-cover rounded-md" />
                                ) : (
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                )}
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                        <span>Subir un archivo</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                                    </label>
                                    <p className="pl-1">o arrastrar y soltar</p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF</p>
                            </div>
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-bold mt-10 mb-6 border-b pb-4 dark:border-gray-700">Contenido del Curso</h2>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="modules-droppable" type="MODULES">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                <AnimatePresence>
                                    {course.modules.map((module, moduleIndex) => (
                                        <Draggable key={module.id} draggableId={module.id} index={moduleIndex}>
                                            {(provided) => (
                                                <motion.div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    layout
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -300 }}
                                                    className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border dark:border-gray-700"
                                                >
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div {...provided.dragHandleProps} className="cursor-move text-gray-400"><GripVerticalIcon className="w-5 h-5" /></div>
                                                        <span className="font-bold text-lg">Módulo {moduleIndex + 1}:</span>
                                                        <input type="text" value={module.title} onChange={(e) => handleUpdateModuleTitle(module.id, e.target.value)} className="font-bold text-lg bg-transparent border-b-2 border-transparent focus:border-indigo-500 focus:outline-none flex-1 p-1" />
                                                        <button onClick={() => handleDeleteModule(module.id)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5" /></button>
                                                    </div>
                                                    <Droppable droppableId={module.id} type={`LESSONS_${module.id}`}>
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 pl-6">
                                                                <AnimatePresence>
                                                                    {module.lessons.map((lesson, lessonIndex) => (
                                                                        <Draggable key={lesson.id} draggableId={lesson.id} index={lessonIndex}>
                                                                            {(provided) => (
                                                                                <motion.div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    layout
                                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                                                    className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border dark:border-gray-700"
                                                                                >
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div {...provided.dragHandleProps} className="cursor-move text-gray-400"><GripVerticalIcon className="w-5 h-5" /></div>
                                                                                        <input type="text" value={lesson.title} onChange={(e) => handleUpdateLessonTitle(module.id, lesson.id, e.target.value)} className="bg-transparent border-b border-transparent focus:border-gray-300 dark:focus:border-gray-600 focus:outline-none flex-1 p-1" />
                                                                                        <button onClick={() => handleDeleteLesson(module.id, lesson.id)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                    <div className="mt-3 pl-8">
                                                                                        {lesson.content ? (
                                                                                            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                                                                                                <div className="flex items-center gap-2 text-sm truncate">
                                                                                                    {lesson.content.type === 'video/mp4' ? <VideoIcon className="w-5 h-5 text-indigo-500" /> : <FileTextIcon className="w-5 h-5 text-indigo-500" />}
                                                                                                    <span className="truncate">{lesson.content.name}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <button onClick={() => setPreviewFile(lesson.content)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Previsualizar</button>
                                                                                                    <button onClick={() => removeFile(module.id, lesson.id)} className="text-red-500"><XIcon className="w-4 h-4" /></button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : uploadProgress[lesson.id] !== undefined ? (
                                                                                            <ProgressBar progress={uploadProgress[lesson.id]} />
                                                                                        ) : (
                                                                                            <>
                                                                                                <input type="file" className="hidden" ref={el => fileInputRef.current[lesson.id] = el} onChange={(e) => handleFileChange(e, module.id, lesson.id)} accept="video/mp4,application/pdf" />
                                                                                                <button onClick={() => triggerFileInput(lesson.id)} className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-indigo-500 transition-colors">
                                                                                                    <UploadCloudIcon className="mx-auto h-8 w-8 text-gray-400" />
                                                                                                    <span className="mt-2 block text-sm font-medium text-gray-600 dark:text-gray-400">Subir Video (MP4) o Documento (PDF)</span>
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </motion.div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                </AnimatePresence>
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                    <button onClick={() => handleAddLesson(module.id)} className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 ml-6 mt-4">
                                                        <PlusCircleIcon className="w-5 h-5" /> Añadir Lección
                                                    </button>
                                                </motion.div>
                                            )}
                                        </Draggable>
                                    ))}
                                </AnimatePresence>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <button onClick={handleAddModule} className="mt-6 flex items-center gap-2 text-lg font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    <PlusCircleIcon className="w-6 h-6" /> Añadir Módulo
                </button>
            </div>
        </div>
    );
};
