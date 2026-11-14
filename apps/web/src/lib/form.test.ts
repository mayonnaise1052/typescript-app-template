import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { applyServerErrors, toFormErrors } from './form';

type NoteValues = { title: string; body: string; lessonId: string | null };

describe('toFormErrors', () => {
  it('API の項目別エラーを、項目ごとの最初のメッセージに変換する', () => {
    const error = new ApiError('VALIDATION_ERROR', '入力内容を確認してください', 400, {
      lessonId: ['指定されたレッスンは存在しません', '2 つ目は使わない'],
    });
    expect(toFormErrors<NoteValues>(error)).toEqual({
      _form: '入力内容を確認してください',
      lessonId: '指定されたレッスンは存在しません',
    });
  });

  it('想定外の値でも、一般的なメッセージを返す', () => {
    expect(toFormErrors('boom')).toEqual({ _form: '予期しないエラーが発生しました' });
  });
});

describe('applyServerErrors', () => {
  it('指定した項目のエラーは入力欄に、残りはフォーム全体のエラーに入れる', () => {
    const setError = vi.fn();
    const error = new ApiError('VALIDATION_ERROR', '入力内容を確認してください', 400, {
      lessonId: ['指定されたレッスンは存在しません'],
    });

    applyServerErrors<NoteValues>(error, setError, ['title', 'lessonId']);

    expect(setError).toHaveBeenCalledWith('lessonId', {
      type: 'server',
      message: '指定されたレッスンは存在しません',
    });
    expect(setError).not.toHaveBeenCalledWith('title', expect.anything());
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: '入力内容を確認してください',
    });
  });
});
