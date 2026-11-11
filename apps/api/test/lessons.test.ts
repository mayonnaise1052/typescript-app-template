import {
  LessonDetailSchema,
  LessonSummarySchema,
  ProgressSummarySchema,
  QuizResultSchema,
  type Answer,
  type QuestionId,
} from '@typequest/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { LESSONS } from '../src/content/index';
import { expectError, readJson, resetDatabase, TestClient } from './helpers';

const ListSchema = z.object({ lessons: z.array(LessonSummarySchema) });
const DetailSchema = z.object({ lesson: LessonDetailSchema });
const ResultSchema = z.object({ result: QuizResultSchema });
const ProgressSchema = z.object({ progress: ProgressSummarySchema });

/** 教材の定義から、指定したレッスンの「全問正解」の解答を組み立てます。 */
function correctAnswers(lessonId: string): Answer[] {
  const lesson = LESSONS.find((candidate) => candidate.id === lessonId);
  if (!lesson) throw new Error(`レッスン ${lessonId} がありません`);

  return lesson.questions.map((question, index): Answer => {
    const questionId = `${lessonId}-q${index + 1}` as QuestionId;
    switch (question.kind) {
      case 'single-choice':
        return { questionId, kind: question.kind, selectedIndex: question.answerIndex };
      case 'multiple-choice':
        return { questionId, kind: question.kind, selectedIndexes: question.answerIndexes };
      case 'fill-blank':
        return { questionId, kind: question.kind, text: question.acceptedAnswers[0] ?? '' };
    }
  });
}

const FIRST = 'types-and-inference';

let client: TestClient;

beforeEach(async () => {
  await resetDatabase();
  client = new TestClient();
  await client.register();
});

describe('GET /api/lessons', () => {
  it('全レッスンを学習順に返す', async () => {
    const { lessons } = await readJson(await client.get('/api/lessons'), ListSchema);

    expect(lessons).toHaveLength(LESSONS.length);
    expect(lessons.map((lesson) => lesson.id)).toEqual(LESSONS.map((lesson) => lesson.id));
    expect(lessons.every((lesson) => !lesson.completed)).toBe(true);
  });

  it('未ログインでは 401 を返す', async () => {
    await expectError(await new TestClient().get('/api/lessons'), 401, 'UNAUTHENTICATED');
  });
});

describe('GET /api/lessons/:lessonId', () => {
  it('本文と問題、前後のレッスンを返す', async () => {
    const { lesson } = await readJson(await client.get(`/api/lessons/${FIRST}`), DetailSchema);

    expect(lesson.title).toBe('型注釈と型推論');
    expect(lesson.body.length).toBeGreaterThan(0);
    expect(lesson.questions.length).toBeGreaterThanOrEqual(2);
    expect(lesson.previousLessonId).toBeNull();
    expect(lesson.nextLessonId).toBe('functions');
  });

  it('問題の正解と解説をクライアントに送らない', async () => {
    // スキーマで検証する前の「生の応答」を調べます。
    const text = await (await client.get(`/api/lessons/${FIRST}`)).text();

    expect(text).not.toContain('answerIndex');
    expect(text).not.toContain('answerIndexes');
    expect(text).not.toContain('acceptedAnswers');
    expect(text).not.toContain('explanation');
  });

  it('存在しないレッスンは 404 を返す', async () => {
    await expectError(await client.get('/api/lessons/no-such-lesson'), 404, 'NOT_FOUND');
  });

  it('不正な形式の ID は 400 を返す', async () => {
    await expectError(await client.get('/api/lessons/Invalid_ID!'), 400, 'VALIDATION_ERROR');
  });
});

describe('POST /api/lessons/:lessonId/quiz', () => {
  it('全問正解するとレッスンが完了になる', async () => {
    const response = await client.post(`/api/lessons/${FIRST}/quiz`, {
      answers: correctAnswers(FIRST),
    });

    const { result } = await readJson(response, ResultSchema);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(result.total);

    const { lessons } = await readJson(await client.get('/api/lessons'), ListSchema);
    expect(lessons.find((lesson) => lesson.id === FIRST)?.completed).toBe(true);
  });

  it('間違えると未完了のままで、採点後に正解と解説が返る', async () => {
    const response = await client.post(`/api/lessons/${FIRST}/quiz`, { answers: [] });

    const { result } = await readJson(response, ResultSchema);
    expect(result).toMatchObject({ passed: false, score: 0 });
    expect(result.results[0]?.explanation.length).toBeGreaterThan(0);

    const { lesson } = await readJson(await client.get(`/api/lessons/${FIRST}`), DetailSchema);
    expect(lesson.completed).toBe(false);
  });

  it.each(LESSONS.map((lesson) => lesson.id))('%s: 教材どおりに解答すると合格する', async (id) => {
    const response = await client.post(`/api/lessons/${id}/quiz`, { answers: correctAnswers(id) });
    const { result } = await readJson(response, ResultSchema);
    expect(result.passed).toBe(true);
  });

  it('存在しないレッスンは 404 を返す', async () => {
    const response = await client.post('/api/lessons/no-such-lesson/quiz', { answers: [] });
    await expectError(response, 404, 'NOT_FOUND');
  });

  it('形式が不正な解答は 400 を返す', async () => {
    const response = await client.post(`/api/lessons/${FIRST}/quiz`, {
      answers: [{ questionId: 'q', kind: 'single-choice', selectedIndex: 'zero' }],
    });
    await expectError(response, 400, 'VALIDATION_ERROR');
  });
});

describe('GET /api/progress', () => {
  it('最初はすべて 0', async () => {
    const { progress } = await readJson(await client.get('/api/progress'), ProgressSchema);
    expect(progress).toMatchObject({
      completedLessons: 0,
      totalLessons: LESSONS.length,
      totalAttempts: 0,
      accuracy: null,
      streakDays: 0,
      recentAttempts: [],
    });
    expect(progress.chapters).toHaveLength(4);
  });

  it('解答の結果が進捗に反映される', async () => {
    await client.post(`/api/lessons/${FIRST}/quiz`, { answers: correctAnswers(FIRST) }); // 2/2
    await client.post('/api/lessons/functions/quiz', { answers: [] }); // 0/2

    const { progress } = await readJson(await client.get('/api/progress'), ProgressSchema);
    expect(progress).toMatchObject({
      completedLessons: 1,
      totalAttempts: 2,
      accuracy: 0.5,
      streakDays: 1,
    });
    expect(progress.chapters[0]).toMatchObject({ chapterId: 'basics', completed: 1 });
    expect(progress.recentAttempts).toHaveLength(2);
  });

  it('他のユーザーの進捗は混ざらない', async () => {
    await client.post(`/api/lessons/${FIRST}/quiz`, { answers: correctAnswers(FIRST) });

    const other = new TestClient();
    await other.register({ email: 'hanako@example.com' });
    const { progress } = await readJson(await other.get('/api/progress'), ProgressSchema);

    expect(progress).toMatchObject({ completedLessons: 0, totalAttempts: 0 });
  });
});
