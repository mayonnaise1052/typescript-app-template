import type { Answer, Question, QuestionId } from '@typequest/shared';
import { describe, expect, it } from 'vitest';
import { gradeQuiz, isCorrect, isPassing, normalizeText } from './grading';

// テストデータを作る小さな関数（ファクトリ）。各テストでは「違い」だけを書けば済みます。
const id = (value: string) => value as QuestionId;

const single: Question = {
  id: id('q1'),
  kind: 'single-choice',
  prompt: '1 + 1 は？',
  choices: ['1', '2', '3'],
  answerIndex: 1,
  explanation: '2 です',
};

const multiple: Question = {
  id: id('q2'),
  kind: 'multiple-choice',
  prompt: '偶数をすべて選んでください',
  choices: ['1', '2', '3', '4'],
  answerIndexes: [1, 3],
  explanation: '2 と 4 です',
};

const fillBlank: Question = {
  id: id('q3'),
  kind: 'fill-blank',
  prompt: '空欄を埋めてください',
  acceptedAnswers: ['as const', 'readonly'],
  explanation: 'as const です',
};

describe('isCorrect', () => {
  it('単一選択: 正解の番号と一致すれば正解', () => {
    expect(
      isCorrect(single, { questionId: single.id, kind: 'single-choice', selectedIndex: 1 }),
    ).toBe(true);
    expect(
      isCorrect(single, { questionId: single.id, kind: 'single-choice', selectedIndex: 0 }),
    ).toBe(false);
  });

  it('複数選択: 順番が違っても、選んだ集合が一致すれば正解', () => {
    const answer = (selectedIndexes: number[]): Answer => ({
      questionId: multiple.id,
      kind: 'multiple-choice',
      selectedIndexes,
    });
    expect(isCorrect(multiple, answer([3, 1]))).toBe(true);
    expect(isCorrect(multiple, answer([1]))).toBe(false); // 足りない
    expect(isCorrect(multiple, answer([1, 2, 3]))).toBe(false); // 余計なものを含む
    expect(isCorrect(multiple, answer([]))).toBe(false);
  });

  it('穴埋め: 空白や大文字小文字、末尾のセミコロンの違いを無視する', () => {
    const answer = (text: string): Answer => ({
      questionId: fillBlank.id,
      kind: 'fill-blank',
      text,
    });
    expect(isCorrect(fillBlank, answer('as const'))).toBe(true);
    expect(isCorrect(fillBlank, answer('  AS   CONST; '))).toBe(true);
    expect(isCorrect(fillBlank, answer('readonly'))).toBe(true);
    expect(isCorrect(fillBlank, answer('const'))).toBe(false);
    expect(isCorrect(fillBlank, answer(''))).toBe(false);
  });

  it('未解答は不正解', () => {
    expect(isCorrect(single, undefined)).toBe(false);
  });

  it('問題と解答の種類が食い違っていれば不正解', () => {
    expect(isCorrect(single, { questionId: single.id, kind: 'fill-blank', text: '1' })).toBe(false);
  });
});

describe('normalizeText', () => {
  it('連続する空白を 1 つにまとめる', () => {
    expect(normalizeText('  keyof   typeof  ')).toBe('keyof typeof');
  });
});

describe('gradeQuiz', () => {
  const questions = [single, multiple, fillBlank];

  it('全問正解なら合格', () => {
    const graded = gradeQuiz(questions, [
      { questionId: single.id, kind: 'single-choice', selectedIndex: 1 },
      { questionId: multiple.id, kind: 'multiple-choice', selectedIndexes: [1, 3] },
      { questionId: fillBlank.id, kind: 'fill-blank', text: 'as const' },
    ]);
    expect(graded).toMatchObject({ score: 3, total: 3, passed: true });
  });

  it('1 問でも間違えれば不合格で、正解と解説が返る', () => {
    const graded = gradeQuiz(questions, [
      { questionId: single.id, kind: 'single-choice', selectedIndex: 0 },
      { questionId: multiple.id, kind: 'multiple-choice', selectedIndexes: [1, 3] },
    ]);
    expect(graded).toMatchObject({ score: 1, total: 3, passed: false });
    expect(graded.results[0]).toEqual({
      questionId: single.id,
      correct: false,
      correctAnswer: { kind: 'single-choice', answerIndex: 1 },
      explanation: '2 です',
    });
    // 未解答の問題も結果に含まれる
    expect(graded.results[2]?.correct).toBe(false);
  });

  it('存在しない問題への解答は無視する', () => {
    const graded = gradeQuiz(
      [single],
      [{ questionId: id('unknown'), kind: 'single-choice', selectedIndex: 1 }],
    );
    expect(graded).toMatchObject({ score: 0, total: 1 });
  });
});

describe('isPassing', () => {
  it('問題が 0 件なら合格にしない', () => {
    expect(isPassing(0, 0)).toBe(false);
  });
});
