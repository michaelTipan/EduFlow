export enum UserRole {
  STUDENT = 'Estudiante',
  TEACHER = 'Docente',
  COORDINATOR = 'Coordinador',
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
}

export interface LessonFile {
  name: string;
  type: 'video/mp4' | 'application/pdf';
  url: string;
  size: number;
}

export interface Lesson {
  id: string;
  title: string;
  content: LessonFile | null;
  order: number;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string | null;
  modules: Module[];
  isPublished: boolean;
  teacher_id: string;
}
