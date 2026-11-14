/**
 * テストで使う API の偽の応答（フィクスチャ）。
 * 各テストは、ここにある応答の組み合わせを worker.use(...) で登録して使います。
 */
import { http, HttpResponse } from 'msw';

export const testUser = {
  id: 'user-1',
  email: 'taro@example.com',
  displayName: '太郎',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const testLesson = {
  id: 'generics',
  chapterId: 'intermediate',
  order: 8,
  title: 'ジェネリクス',
  summary: '型を引数として受け取ります。',
  completed: false,
};

const unauthenticated = () =>
  HttpResponse.json(
    { error: { code: 'UNAUTHENTICATED', message: 'ログインが必要です' } },
    { status: 401 },
  );

/** ログイン状態の API（GET /api/auth/me）。 */
export const authHandlers = {
  signedIn: () => http.get('*/api/auth/me', () => HttpResponse.json({ user: testUser })),
  signedOut: () => http.get('*/api/auth/me', unauthenticated),
};

/** ダッシュボードの表示に必要な API。 */
export const dashboardHandlers = () => [
  http.get('*/api/lessons', () => HttpResponse.json({ lessons: [testLesson] })),
  http.get('*/api/progress', () =>
    HttpResponse.json({
      progress: {
        completedLessons: 0,
        totalLessons: 1,
        chapters: [],
        totalAttempts: 0,
        accuracy: null,
        streakDays: 0,
        recentAttempts: [],
      },
    }),
  ),
];
