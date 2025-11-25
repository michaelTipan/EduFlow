export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  COORDINATOR = 'coordinator',
}

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string; // Keep for backward compatibility if needed, or remove
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

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface Progress {
  id: string;
  student_id: string;
  lesson_id: string;
  is_completed: boolean;
  updated_at: string;
}
