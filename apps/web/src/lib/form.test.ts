import { RegisterInputSchema } from '@typequest/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { toFormErrors, validateForm } from './form';

describe('validateForm', () => {
  it('検証に通れば、正規化された値を返す', () => {
    const result = validateForm(RegisterInputSchema, {
      email: ' Taro@Example.com',
      displayName: '太郎',
      password: 'correct-horse-battery',
    });
    expect(result).toEqual({
      ok: true,
      value: { email: 'taro@example.com', displayName: '太郎', password: 'correct-horse-battery' },
    });
  });

  it('検証に失敗したら、項目ごとに最初のエラーを返す', () => {
    const result = validateForm(RegisterInputSchema, { email: 'x', displayName: '', password: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.error).sort()).toEqual(['displayName', 'email', 'password']);
      expect(result.error.email).toBe('メールアドレスの形式が正しくありません');
    }
  });
});

describe('toFormErrors', () => {
  it('API の項目別エラーをフォーム用に変換する', () => {
    const error = new ApiError('VALIDATION_ERROR', '入力内容を確認してください', 400, {
      lessonId: ['指定されたレッスンは存在しません'],
    });
    expect(toFormErrors(error)).toEqual({
      _form: '入力内容を確認してください',
      lessonId: '指定されたレッスンは存在しません',
    });
  });

  it('想定外の値でも、一般的なメッセージを返す', () => {
    expect(toFormErrors('boom')).toEqual({ _form: '予期しないエラーが発生しました' });
  });
});
