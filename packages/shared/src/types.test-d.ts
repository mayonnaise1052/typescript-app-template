/**
 * 型のテスト。
 *
 * このファイルは実行されません。Vitest が tsc で型チェックだけを行い、
 * `expectTypeOf` の主張と実際の型が食い違えばテスト失敗になります。
 * 「実行時の値」ではなく「コンパイル時の型」そのものを守るためのテストです。
 *
 * 関連レッスン: testing-types
 */
import { describe, expectTypeOf, it } from 'vitest';
import type {
  Answer,
  ChapterId,
  CreateNoteInput,
  ErrorCode,
  ErrorStatus,
  LessonId,
  PublicQuestion,
  Question,
  Result,
  UserId,
} from './index';
import { ok } from './index';

describe('Branded Types', () => {
  it('UserId と LessonId は相互に代入できない', () => {
    expectTypeOf<UserId>().not.toEqualTypeOf<LessonId>();
    expectTypeOf<UserId>().not.toExtend<LessonId>();
  });

  it('ブランド付きの ID は string として読める', () => {
    expectTypeOf<UserId>().toExtend<string>();
  });

  it('ただの string はブランド付きの ID として渡せない', () => {
    expectTypeOf<string>().not.toExtend<UserId>();
  });
});

describe('as const から導出したユニオン型', () => {
  it('ChapterId は 4 つのリテラルのユニオンになる', () => {
    expectTypeOf<ChapterId>().toEqualTypeOf<'basics' | 'intermediate' | 'advanced' | 'practical'>();
  });

  it('ErrorStatus は number ではなくリテラルのユニオンになる', () => {
    expectTypeOf<ErrorStatus>().toEqualTypeOf<400 | 401 | 403 | 404 | 409 | 429 | 500 | 502>();
    expectTypeOf<'NOT_FOUND'>().toExtend<ErrorCode>();
  });
});

describe('判別可能ユニオン', () => {
  it('kind で絞り込むと固有のフィールドにアクセスできる', () => {
    type FillBlank = Extract<Question, { kind: 'fill-blank' }>;
    expectTypeOf<FillBlank>().toHaveProperty('acceptedAnswers');

    type SingleChoiceAnswer = Extract<Answer, { kind: 'single-choice' }>;
    expectTypeOf<SingleChoiceAnswer['selectedIndex']>().toBeNumber();
  });

  it('公開用の問題には正解が含まれない', () => {
    type PublicSingle = Extract<PublicQuestion, { kind: 'single-choice' }>;
    expectTypeOf<PublicSingle>().not.toHaveProperty('answerIndex');
    expectTypeOf<PublicSingle>().not.toHaveProperty('explanation');
  });
});

describe('スキーマから導出した型', () => {
  it('z.input では default 付きのフィールドが省略可能になる', () => {
    expectTypeOf<{ title: string; body: string }>().toExtend<CreateNoteInput>();
  });
});

describe('Result', () => {
  it('ok() の戻り値は Result に代入できる', () => {
    expectTypeOf(ok(1)).toExtend<Result<number, string>>();
  });
});
