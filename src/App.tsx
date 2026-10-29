import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.tsx'
import { CourseDetailPage } from './pages/CourseDetailPage.tsx'
import { CoursesPage } from './pages/CoursesPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { FlashcardsRoute, ReviewRoute } from './pages/FlashcardsPage.tsx'
import { LessonRoute } from './pages/LessonPage.tsx'
import { VocabularyRoute } from './pages/VocabularyPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="courses/:courseId/:lesson" element={<LessonRoute />} />
        <Route path="vocabulary" element={<Navigate to="/vocabulary/1" replace />} />
        <Route path="vocabulary/review" element={<ReviewRoute />} />
        <Route path="vocabulary/:level" element={<VocabularyRoute />} />
        <Route path="vocabulary/:level/cards" element={<FlashcardsRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
