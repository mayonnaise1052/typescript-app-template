import type { PublicQuestion, QuestionId, QuizResult } from '@typequest/shared';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { QuizForm } from './QuizForm';

const id = (value: string) => value as QuestionId;

const questions: PublicQuestion[] = [
  { id: id('q1'), kind: 'single-choice', prompt: '`const` の型は？', choices: ['string', "'ok'"] },
  { id: id('q2'), kind: 'multiple-choice', prompt: '当てはまるものは？', choices: ['A', 'B', 'C'] },
  { id: id('q3'), kind: 'fill-blank', prompt: '空欄を埋めてください', code: 'type K = ____ T;' },
];

/** 必須の props を既定値で埋め、テストごとに必要な部分だけ上書きします。 */
async function renderQuiz(overrides: Partial<Parameters<typeof QuizForm>[0]> = {}) {
  const props = {
    questions,
    result: undefined,
    isSubmitting: false,
    error: null,
    onSubmit: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  const screen = await render(<QuizForm {...props} />);
  return { screen, props };
}

describe('QuizForm', () => {
  it('問題の種類に応じた入力欄を表示する', async () => {
    const { screen } = await renderQuiz();

    expect(screen.getByRole('radio').elements()).toHaveLength(2);
    expect(screen.getByRole('checkbox').elements()).toHaveLength(3);
    await expect.element(screen.getByRole('textbox', { name: /空欄/ })).toBeVisible();
    await expect.element(screen.getByText('type K = ____ T;')).toBeVisible();
  });

  it('入力した解答を、種類ごとの形で onSubmit に渡す', async () => {
    // ロケーターの click() や fill() は、本物のブラウザでの操作として実行されます。
    const { screen, props } = await renderQuiz();

    await screen.getByRole('radio', { name: "'ok'" }).click();
    await screen.getByRole('checkbox', { name: 'A' }).click();
    await screen.getByRole('checkbox', { name: 'C' }).click();
    await screen.getByRole('checkbox', { name: 'A' }).click(); // 選び直して外す
    await screen.getByRole('textbox', { name: /空欄/ }).fill('keyof');
    await screen.getByRole('button', { name: '解答する' }).click();

    expect(props.onSubmit).toHaveBeenCalledWith([
      { questionId: 'q1', kind: 'single-choice', selectedIndex: 1 },
      { questionId: 'q2', kind: 'multiple-choice', selectedIndexes: [2] },
      { questionId: 'q3', kind: 'fill-blank', text: 'keyof' },
    ]);
  });

  it('未解答の問題は送信内容に含めない', async () => {
    const { screen, props } = await renderQuiz();

    await screen.getByRole('button', { name: '解答する' }).click();

    expect(props.onSubmit).toHaveBeenCalledWith([]);
  });

  it('採点結果として、正誤・正解・解説を表示する', async () => {
    const result: QuizResult = {
      lessonId: 'x' as QuizResult['lessonId'],
      score: 1,
      total: 3,
      passed: false,
      attemptedAt: '2026-01-01T00:00:00.000Z',
      results: [
        {
          questionId: id('q1'),
          correct: true,
          correctAnswer: { kind: 'single-choice', answerIndex: 1 },
          explanation: 'リテラル型になります',
        },
        {
          questionId: id('q2'),
          correct: false,
          correctAnswer: { kind: 'multiple-choice', answerIndexes: [0, 2] },
          explanation: 'A と C です',
        },
        {
          questionId: id('q3'),
          correct: false,
          correctAnswer: { kind: 'fill-blank', acceptedAnswers: ['keyof'] },
          explanation: 'keyof を使います',
        },
      ],
    };
    const { screen } = await renderQuiz({ result });

    await expect.element(screen.getByText('3 問中 1 問正解')).toBeVisible();
    await expect.element(screen.getByText('リテラル型になります')).toBeVisible();

    const second = screen.getByRole('group', { name: /当てはまるものは/ });
    await expect.element(second.getByText('✗ 不正解')).toBeVisible();
    await expect.element(second.getByText('A / C')).toBeVisible();

    // 採点後は入力欄を変更できず、送信ボタンは「もう一度」に変わる
    await expect.element(screen.getByRole('radio').first()).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: '解答する' })).not.toBeInTheDocument();
  });

  it('「もう一度挑戦する」で入力を消し、onRetry を呼ぶ', async () => {
    const { screen, props } = await renderQuiz({
      result: {
        lessonId: 'x' as QuizResult['lessonId'],
        score: 0,
        total: 3,
        passed: false,
        attemptedAt: '2026-01-01T00:00:00.000Z',
        results: [],
      },
    });

    await screen.getByRole('button', { name: 'もう一度挑戦する' }).click();

    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it('送信中はボタンを無効にする', async () => {
    const { screen } = await renderQuiz({ isSubmitting: true });
    await expect.element(screen.getByRole('button', { name: '採点中…' })).toBeDisabled();
  });
});
