import { CHAPTERS } from '@typequest/shared';
import { describe, expect, it } from 'vitest';
import { buildSeedStatements } from '../db/seed';
import { LESSONS } from './index';

describe('教材', () => {
  it('すべてのレッスンと問題がスキーマに合っている', () => {
    // buildSeedStatements は内部で Zod による検証を行い、不正なら例外を投げます。
    expect(() => buildSeedStatements(LESSONS)).not.toThrow();
  });

  it('レッスン ID が重複していない', () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('すべての章に 1 つ以上のレッスンがある', () => {
    for (const chapter of CHAPTERS) {
      expect(LESSONS.some((lesson) => lesson.chapterId === chapter.id)).toBe(true);
    }
  });

  it('章の順番どおりに並んでいる', () => {
    const order = CHAPTERS.map((chapter) => chapter.id as string);
    const indexes = LESSONS.map((lesson) => order.indexOf(lesson.chapterId));
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it.each(LESSONS.map((lesson) => [lesson.id, lesson] as const))(
    '%s: 問題が 2 問以上あり、アプリ内の使用箇所が示されている',
    (_id, lesson) => {
      expect(lesson.questions.length).toBeGreaterThanOrEqual(2);
      expect(lesson.codeRefs.length).toBeGreaterThanOrEqual(1);
    },
  );

  it('正解が選択肢の範囲外なら検出する', () => {
    const [first] = LESSONS;
    if (!first) throw new Error('レッスンがありません');
    const broken = {
      ...first,
      questions: [
        {
          kind: 'single-choice' as const,
          prompt: '?',
          choices: ['a', 'b'],
          answerIndex: 5,
          explanation: '',
        },
      ],
    };
    expect(() => buildSeedStatements([broken])).toThrow('範囲外');
  });
});
