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
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center text-gray-900 dark:text-white">
        <h1 className="text-2xl font-bold">Vista Previa del Estudiante: <span className="text-indigo-600 dark:text-indigo-400">{course.title}</span></h1>
        <button onClick={onExit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Salir de la Vista Previa
        </button>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-1/4 bg-white dark:bg-gray-800 p-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Contenido del Curso</h2>
          {course.modules.map((module: Module, moduleIndex: number) => (
            <div key={module.id} className="mb-4">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                Módulo {moduleIndex + 1}: {module.title}
              </h3>
              <ul className="mt-2 space-y-1">
                {module.lessons.map((lesson: Lesson) => (
                  <li key={lesson.id}>
                    <button
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors ${selectedLesson?.id === lesson.id ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      {lesson.content?.type === 'video/mp4' ? <VideoIcon className="w-5 h-5 flex-shrink-0" /> : <FileTextIcon className="w-5 h-5 flex-shrink-0" />}
                      <span className="truncate">{lesson.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 flex flex-col bg-gray-100 dark:bg-gray-900">
            {selectedLesson ? (
              <>
                <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{selectedLesson.title}</h2>
                <div className="flex-1 w-full h-full aspect-video">
                  {renderContent(selectedLesson)}
                </div>
              </>
            ) : (
                 <div className="flex items-center justify-center h-full flex-col text-center">
                    <BookOpenIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4"/>
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Bienvenido a la vista previa del curso</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Selecciona una lección del panel lateral para comenzar.</p>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};
