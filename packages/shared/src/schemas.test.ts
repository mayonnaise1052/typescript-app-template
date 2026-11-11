import { describe, expect, it } from 'vitest';
import {
  AnswerSchema,
  ApiErrorResponseSchema,
  CreateNoteInputSchema,
  ERROR_CODES,
  ERROR_STATUS,
  LoginInputSchema,
  NoteListQuerySchema,
  PackageInfoSchema,
  PaginationQuerySchema,
  PublicQuestionSchema,
  RegisterInputSchema,
  UpdateNoteInputSchema,
  paginate,
} from './index';

describe('RegisterInputSchema', () => {
  const valid = { email: 'Taro@Example.com ', displayName: ' 太郎 ', password: 'correct-horse' };

  it('メールアドレスを小文字にし、前後の空白を取り除く', () => {
    const parsed = RegisterInputSchema.parse(valid);
    expect(parsed.email).toBe('taro@example.com');
    expect(parsed.displayName).toBe('太郎');
  });

  it('短すぎるパスワードを拒否する', () => {
    const result = RegisterInputSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
  });

  it('不正なメールアドレスを拒否する', () => {
    expect(RegisterInputSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('ログインではパスワードの下限を検証しない', () => {
    expect(LoginInputSchema.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(
      true,
    );
  });
});

describe('PaginationQuerySchema', () => {
  it('クエリ文字列を数値に変換し、既定値を補う', () => {
    expect(PaginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 10 });
    expect(PaginationQuerySchema.parse({ page: '3', pageSize: '20' })).toEqual({
      page: 3,
      pageSize: 20,
    });
  });

  it('範囲外の値を拒否する', () => {
    expect(PaginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('paginate は総ページ数を計算する', () => {
    expect(paginate(['a', 'b'], 21, { page: 1, pageSize: 10 })).toMatchObject({ totalPages: 3 });
    expect(paginate([], 0, { page: 1, pageSize: 10 })).toMatchObject({ totalPages: 1 });
  });
});

describe('ノートのスキーマ', () => {
  it('lessonId を省略すると null になる', () => {
    expect(CreateNoteInputSchema.parse({ title: 't', body: 'b' }).lessonId).toBeNull();
  });

  it('空の更新を拒否する', () => {
    expect(UpdateNoteInputSchema.safeParse({}).success).toBe(false);
    expect(UpdateNoteInputSchema.safeParse({ title: '新しいタイトル' }).success).toBe(true);
  });

  it('検索語が長すぎる一覧クエリを拒否する', () => {
    expect(NoteListQuerySchema.safeParse({ q: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('クイズのスキーマ', () => {
  it('kind に応じて必要なフィールドが変わる', () => {
    expect(
      AnswerSchema.safeParse({ questionId: 'q-1', kind: 'single-choice', selectedIndex: 0 })
        .success,
    ).toBe(true);
    // single-choice なのに text を送っても通らない
    expect(
      AnswerSchema.safeParse({ questionId: 'q-1', kind: 'single-choice', text: 'x' }).success,
    ).toBe(false);
  });

  it('公開用の問題からは正解と解説が取り除かれる', () => {
    const parsed = PublicQuestionSchema.parse({
      id: 'q-1',
      kind: 'single-choice',
      prompt: '問題',
      choices: ['a', 'b'],
      answerIndex: 1,
      explanation: '解説',
    });
    expect(parsed).not.toHaveProperty('answerIndex');
    expect(parsed).not.toHaveProperty('explanation');
  });
});

describe('PackageInfoSchema', () => {
  it.each(['react', '@types/node', 'lodash.debounce'])('%s を受け付ける', (name) => {
    expect(PackageInfoSchema.safeParse({ name, version: '1.0.0', description: '' }).success).toBe(
      true,
    );
  });

  it.each(['Has Space', '../etc/passwd', '<script>'])('%s を拒否する', (name) => {
    expect(PackageInfoSchema.safeParse({ name, version: '1.0.0', description: '' }).success).toBe(
      false,
    );
  });
});

describe('エラー定義', () => {
  it('すべてのエラーコードに HTTP ステータスが対応している', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });

  it('エラーレスポンスの形を検証できる', () => {
    const body = { error: { code: 'NOT_FOUND', message: '見つかりません' } };
    expect(ApiErrorResponseSchema.parse(body)).toEqual(body);
    expect(ApiErrorResponseSchema.safeParse({ error: { code: 'UNKNOWN' } }).success).toBe(false);
  });
});
