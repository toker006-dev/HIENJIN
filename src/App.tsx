import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.tsx'
import { CourseDetailPage } from './pages/CourseDetailPage.tsx'
import { CoursesPage } from './pages/CoursesPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LessonRoute } from './pages/LessonPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="courses/:courseId/:lesson" element={<LessonRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
