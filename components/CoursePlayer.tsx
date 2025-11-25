import React, { useState, useEffect, useRef } from 'react';
import { Course, Lesson } from '../types';
import { supabase } from '../lib/supabaseClient';
import { CheckCircleIcon, PlayCircleIcon, FileTextIcon, XIcon } from './icons';
import toast from 'react-hot-toast';

interface CoursePlayerProps {
    course: Course;
    studentId: string;
    onExit: () => void;
}

export const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, studentId, onExit }) => {
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Flatten lessons for easier navigation
    const allLessons = course.modules.flatMap(m => m.lessons);

    useEffect(() => {
        // Load progress
        const fetchProgress = async () => {
            const { data, error } = await supabase
                .from('progress')
                .select('lesson_id')
                .eq('student_id', studentId)
                .eq('is_completed', true);

            if (data) {
                setCompletedLessonIds(data.map(p => p.lesson_id));
            }
        };
        fetchProgress();

        // Set initial lesson (first uncompleted or first overall)
        if (allLessons.length > 0) {
            // Find first uncompleted lesson
            // We need to wait for completedLessonIds to be populated, but for now let's just default to first
            // A better approach would be to do this after fetching progress, but for simplicity:
            setCurrentLesson(allLessons[0]);
        }
    }, [course.id, studentId]);

    useEffect(() => {
        if (currentLesson && currentLesson.content?.type === 'application/pdf' && !completedLessonIds.includes(currentLesson.id)) {
            handleLessonComplete(currentLesson.id);
        }
    }, [currentLesson, completedLessonIds]);

    const handleLessonComplete = async (lessonId: string) => {
        if (completedLessonIds.includes(lessonId)) return;

        try {
            const { error } = await supabase
                .from('progress')
                .upsert({
                    student_id: studentId,
                    lesson_id: lessonId,
                    is_completed: true,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id, lesson_id' });

            if (error) throw error;

            setCompletedLessonIds(prev => [...prev, lessonId]);
            toast.success('¡Lección completada!');
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current && currentLesson) {
            const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            if (progress > 80 && !completedLessonIds.includes(currentLesson.id)) {
                handleLessonComplete(currentLesson.id);
            }
        }
    };

    const navigateLesson = (direction: 'next' | 'prev') => {
        if (!currentLesson) return;
        const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
        if (direction === 'next' && currentIndex < allLessons.length - 1) {
            setCurrentLesson(allLessons[currentIndex + 1]);
        } else if (direction === 'prev' && currentIndex > 0) {
            setCurrentLesson(allLessons[currentIndex - 1]);
        }
    };

    if (!currentLesson) return <div className="flex items-center justify-center h-screen text-white bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div></div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate border-l-2 border-slate-200 dark:border-slate-700 pl-4">{course.title}</h2>
                </div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Progreso: {Math.round((completedLessonIds.length / allLessons.length) * 100)}%
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto hidden md:block">
                    <div className="p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-lg">Contenido del Curso</h3>
                        <div className="space-y-6">
                            {course.modules.map((module, index) => (
                                <div key={module.id}>
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px]">Módulo {index + 1}</span>
                                        {module.title}
                                    </h4>
                                    <div className="space-y-1">
                                        {module.lessons.map(lesson => {
                                            const isCompleted = completedLessonIds.includes(lesson.id);
                                            const isActive = currentLesson.id === lesson.id;
                                            return (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => setCurrentLesson(lesson)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${isActive ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/50'}`}
                                                >
                                                    {isCompleted ? (
                                                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    ) : (
                                                        <div className={`p-1 rounded-md ${isActive ? 'bg-white dark:bg-cyan-900/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                            {lesson.content?.type === 'video/mp4' ?
                                                                <PlayCircleIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`} /> :
                                                                <FileTextIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`} />
                                                            }
                                                        </div>
                                                    )}
                                                    <span className="truncate text-left flex-1">{lesson.title}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    <div className="max-w-5xl mx-auto w-full p-4 sm:p-8">
                        <div className="bg-black rounded-2xl shadow-2xl overflow-hidden aspect-video mb-8 relative border border-slate-800">
                            {currentLesson.content ? (
                                currentLesson.content.type === 'video/mp4' ? (
                                    <video
                                        ref={videoRef}
                                        src={currentLesson.content.url}
                                        controls
                                        className="w-full h-full"
                                        onTimeUpdate={handleVideoTimeUpdate}
                                    />
                                ) : (
                                    <iframe
                                        src={currentLesson.content.url}
                                        className="w-full h-full"
                                        title={currentLesson.title}
                                    />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                                    <FileTextIcon className="w-16 h-16 opacity-20" />
                                    <p>Contenido no disponible</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-200 dark:border-slate-700 pb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{currentLesson.title}</h1>
                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-medium uppercase tracking-wide">
                                        {currentLesson.content?.type === 'video/mp4' ? 'Video' : 'Documento'}
                                    </span>
                                    {completedLessonIds.includes(currentLesson.id) && (
                                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                                            <CheckCircleIcon className="w-4 h-4" /> Completado
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => navigateLesson('prev')}
                                    disabled={allLessons.findIndex(l => l.id === currentLesson.id) === 0}
                                    className="flex-1 sm:flex-none px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => navigateLesson('next')}
                                    disabled={allLessons.findIndex(l => l.id === currentLesson.id) === allLessons.length - 1}
                                    className="flex-1 sm:flex-none px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/30 transition-all"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
