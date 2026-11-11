import type { PublicQuestion, QuestionId, QuizResult } from '@typequest/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuizForm } from './QuizForm';

const id = (value: string) => value as QuestionId;

const questions: PublicQuestion[] = [
  { id: id('q1'), kind: 'single-choice', prompt: '`const` の型は？', choices: ['string', "'ok'"] },
  { id: id('q2'), kind: 'multiple-choice', prompt: '当てはまるものは？', choices: ['A', 'B', 'C'] },
  { id: id('q3'), kind: 'fill-blank', prompt: '空欄を埋めてください', code: 'type K = ____ T;' },
];

/** 必須の props を既定値で埋め、テストごとに必要な部分だけ上書きします。 */
function renderQuiz(overrides: Partial<Parameters<typeof QuizForm>[0]> = {}) {
  const props = {
    questions,
    result: undefined,
    isSubmitting: false,
    error: null,
    onSubmit: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<QuizForm {...props} />);
  return props;
}

describe('QuizForm', () => {
  it('問題の種類に応じた入力欄を表示する', () => {
    renderQuiz();

    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('textbox', { name: /空欄/ })).toBeInTheDocument();
    expect(screen.getByText('type K = ____ T;')).toBeInTheDocument();
  });

  it('入力した解答を、種類ごとの形で onSubmit に渡す', async () => {
    // userEvent は、実際のユーザーに近い形でクリックやキー入力を再現します。
    const user = userEvent.setup();
    const { onSubmit } = renderQuiz();

    await user.click(screen.getByRole('radio', { name: "'ok'" }));
    await user.click(screen.getByRole('checkbox', { name: 'A' }));
    await user.click(screen.getByRole('checkbox', { name: 'C' }));
    await user.click(screen.getByRole('checkbox', { name: 'A' })); // 選び直して外す
    await user.type(screen.getByRole('textbox', { name: /空欄/ }), 'keyof');
    await user.click(screen.getByRole('button', { name: '解答する' }));

    expect(onSubmit).toHaveBeenCalledWith([
      { questionId: 'q1', kind: 'single-choice', selectedIndex: 1 },
      { questionId: 'q2', kind: 'multiple-choice', selectedIndexes: [2] },
      { questionId: 'q3', kind: 'fill-blank', text: 'keyof' },
    ]);
  });

  it('未解答の問題は送信内容に含めない', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderQuiz();

    await user.click(screen.getByRole('button', { name: '解答する' }));

    expect(onSubmit).toHaveBeenCalledWith([]);
  });

  it('採点結果として、正誤・正解・解説を表示する', () => {
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
    renderQuiz({ result });

    expect(screen.getByText('3 問中 1 問正解')).toBeInTheDocument();
    expect(screen.getByText('リテラル型になります')).toBeInTheDocument();

    const second = screen.getByRole('group', { name: /当てはまるものは/ });
    expect(within(second).getByText('✗ 不正解')).toBeInTheDocument();
    expect(within(second).getByText('A / C')).toBeInTheDocument();

    // 採点後は入力欄を変更できず、送信ボタンは「もう一度」に変わる
    expect(screen.getAllByRole('radio')[0]).toBeDisabled();
    expect(screen.queryByRole('button', { name: '解答する' })).not.toBeInTheDocument();
  });

  it('「もう一度挑戦する」で入力を消し、onRetry を呼ぶ', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderQuiz({
      result: {
        lessonId: 'x' as QuizResult['lessonId'],
        score: 0,
        total: 3,
        passed: false,
        attemptedAt: '2026-01-01T00:00:00.000Z',
        results: [],
      },
    });

    await user.click(screen.getByRole('button', { name: 'もう一度挑戦する' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('送信中はボタンを無効にする', () => {
    renderQuiz({ isSubmitting: true });
    expect(screen.getByRole('button', { name: '採点中…' })).toBeDisabled();
  });
});
