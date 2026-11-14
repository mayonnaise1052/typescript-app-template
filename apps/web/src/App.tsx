import { Link, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { GuestOnly, RequireAuth } from './features/auth/RequireAuth';
import { LessonListPage } from './features/lessons/LessonListPage';
import { LessonPage } from './features/lessons/LessonPage';
import { NotesPage } from './features/notes/NotesPage';
import { PackagesPage } from './features/packages/PackagesPage';
import { DashboardPage } from './features/progress/DashboardPage';

function NotFoundPage() {
  return (
    <main className="auth-page">
      <h1>ページが見つかりません</h1>
      <p>
        <Link to="/">ダッシュボードへ戻る</Link>
      </p>
    </main>
  );
}

/** 画面の経路（ルーティング）の定義。 */
export function App() {
  return (
    <>
      {/* パスが変わったらページの先頭へ戻す（戻る・進むではブラウザの復元に任せる） */}
      <ScrollToTop />
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/lessons" element={<LessonListPage />} />
            <Route path="/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/packages" element={<PackagesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
