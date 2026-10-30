import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.tsx'
import { ArrangeRoute, ArrangeSetPage } from './pages/ArrangePage.tsx'
import { CourseDetailPage } from './pages/CourseDetailPage.tsx'
import { CoursesPage } from './pages/CoursesPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { FlashcardsRoute, ReviewRoute } from './pages/FlashcardsPage.tsx'
import { LessonRoute } from './pages/LessonPage.tsx'
import { ListenRoute, ListenSetPage } from './pages/ListenPage.tsx'
import { QuizRoute } from './pages/QuizPage.tsx'
import { VocabularyRoute } from './pages/VocabularyPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/arrange/:setId" element={<ArrangeSetPage />} />
        <Route path="courses/arrange/:setId/:difficulty" element={<ArrangeRoute />} />
        <Route path="courses/listen/:setId" element={<ListenSetPage />} />
        <Route path="courses/listen/:setId/:difficulty" element={<ListenRoute />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="courses/:courseId/:lesson" element={<LessonRoute />} />
        <Route path="vocabulary" element={<Navigate to="/vocabulary/1" replace />} />
        <Route path="vocabulary/review" element={<ReviewRoute />} />
        <Route path="vocabulary/:level" element={<VocabularyRoute />} />
        <Route path="vocabulary/:level/cards" element={<FlashcardsRoute />} />
        <Route path="vocabulary/:level/quiz" element={<QuizRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
