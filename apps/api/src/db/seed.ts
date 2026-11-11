/**
 * 教材（src/content）を DB に投入するための SQL を組み立てます。
 *
 * 値は SQL 文字列に埋め込まず、プレースホルダ（?）と値の配列に分けて返します。
 * 何度実行しても同じ結果になるよう、UPSERT（あれば更新、なければ挿入）にしています。
 */
import {
  ContentBlockSchema,
  CodeRefSchema,
  LessonIdSchema,
  QuestionSchema,
} from '@typequest/shared';
import { z } from 'zod';
import type { LessonContent } from '../content/types';

export type SeedStatement = {
  sql: string;
  params: (string | number)[];
};

const LessonContentSchema = z.object({
  id: LessonIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.array(ContentBlockSchema).min(1),
  codeRefs: z.array(CodeRefSchema),
});

export function buildSeedStatements(lessons: readonly LessonContent[]): SeedStatement[] {
  const statements: SeedStatement[] = [
    // 問題は入れ直します。教材から消したレッスンも、ここで取り除きます
    // （ON DELETE CASCADE により、関連する進捗も一緒に消えます）。
    { sql: 'DELETE FROM questions', params: [] },
    {
      sql: `DELETE FROM lessons WHERE id NOT IN (${lessons.map(() => '?').join(', ')})`,
      params: lessons.map((lesson) => lesson.id),
    },
  ];

  lessons.forEach((lesson, lessonIndex) => {
    // 教材の書き間違いを、DB に入れる前に検出します。
    const parsed = LessonContentSchema.parse(lesson);

    statements.push({
      sql: `INSERT INTO lessons (id, chapter_id, position, title, summary, body, code_refs)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  chapter_id = excluded.chapter_id,
  position = excluded.position,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  code_refs = excluded.code_refs`,
      params: [
        parsed.id,
        lesson.chapterId,
        lessonIndex + 1,
        parsed.title,
        parsed.summary,
        JSON.stringify(parsed.body),
        JSON.stringify(parsed.codeRefs),
      ],
    });

    lesson.questions.forEach((content, questionIndex) => {
      const question = QuestionSchema.parse({
        ...content,
        id: `${lesson.id}-q${questionIndex + 1}`,
      });
      assertAnswerInRange(question);

      statements.push({
        sql: 'INSERT INTO questions (id, lesson_id, position, data) VALUES (?, ?, ?, ?)',
        params: [question.id, parsed.id, questionIndex + 1, JSON.stringify(question)],
      });
    });
  });

  return statements;
}

/** 正解の番号が選択肢の範囲に収まっているかを確かめます。 */
function assertAnswerInRange(question: z.infer<typeof QuestionSchema>): void {
  const indexes =
    question.kind === 'single-choice'
      ? [question.answerIndex]
      : question.kind === 'multiple-choice'
        ? question.answerIndexes
        : [];
  if (question.kind !== 'fill-blank' && indexes.some((i) => i >= question.choices.length)) {
    throw new Error(`問題 ${question.id} の正解が選択肢の範囲外です`);
  }
}
