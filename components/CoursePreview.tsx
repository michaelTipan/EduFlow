import React, { useState, useMemo } from 'react';
import { Course, Module, Lesson } from '../types';
import { BookOpenIcon, VideoIcon, FileTextIcon } from './icons';

interface CoursePreviewProps {
  course: Course;
  onExit: () => void;
}

export const CoursePreview: React.FC<CoursePreviewProps> = ({ course, onExit }) => {
  const firstLesson = useMemo(() => {
    return course.modules?.[0]?.lessons?.[0] || null;
  }, [course]);

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(firstLesson);

  const renderContent = (lesson: Lesson) => {
    if (!lesson.content) {
      return <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg"><p className="text-gray-500 dark:text-gray-400">No hay contenido para esta lección.</p></div>;
    }
    if (lesson.content.type === 'video/mp4') {
      return <video src={lesson.content.url} controls className="w-full h-full rounded-lg bg-black" />;
    }
    if (lesson.content.type === 'application/pdf') {
      return <iframe src={lesson.content.url} className="w-full h-full rounded-lg" title={lesson.title} />;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col">
      <header className="bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center text-slate-900 dark:text-white z-10">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Modo Vista Previa
          </div>
          <h1 className="text-xl font-bold truncate max-w-xl border-l-2 border-slate-200 dark:border-slate-700 pl-4">{course.title}</h1>
        </div>
        <button onClick={onExit} className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-slate-500/20 text-sm">
          Salir de la Vista Previa
        </button>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white dark:bg-slate-800 p-6 overflow-y-auto border-r border-slate-200 dark:border-slate-700 hidden md:block">
          <h2 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Contenido del Curso</h2>
          <div className="space-y-6">
            {course.modules.map((module: Module, moduleIndex: number) => (
              <div key={module.id}>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px]">Módulo {moduleIndex + 1}</span>
                  {module.title}
                </h3>
                <ul className="space-y-1">
                  {module.lessons.map((lesson: Lesson) => (
                    <li key={lesson.id}>
                      <button
                        onClick={() => setSelectedLesson(lesson)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all text-sm ${selectedLesson?.id === lesson.id ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 font-medium shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'}`}
                      >
                        <div className={`p-1 rounded-md ${selectedLesson?.id === lesson.id ? 'bg-white dark:bg-cyan-900/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                          {lesson.content?.type === 'video/mp4' ?
                            <VideoIcon className={`w-3.5 h-3.5 flex-shrink-0 ${selectedLesson?.id === lesson.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`} /> :
                            <FileTextIcon className={`w-3.5 h-3.5 flex-shrink-0 ${selectedLesson?.id === lesson.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`} />
                          }
                        </div>
                        <span className="truncate flex-1">{lesson.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-y-auto">
          {selectedLesson ? (
            <div className="max-w-5xl mx-auto w-full">
              <div className="bg-black rounded-2xl shadow-2xl overflow-hidden aspect-video mb-8 relative border border-slate-800">
                {renderContent(selectedLesson)}
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">{selectedLesson.title}</h2>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {selectedLesson.content?.type === 'video/mp4' ? 'Video' : 'Documento'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full flex-col text-center p-8">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-full shadow-sm mb-6">
                <BookOpenIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bienvenido a la vista previa</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Esta es una simulación de cómo verán el curso tus estudiantes. Selecciona una lección del panel lateral para comenzar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
