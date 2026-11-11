/**
 * クイズの採点ロジック。
 *
 * DB にも HTTP にも依存しない「純粋関数」だけで書いているので、単体テストが簡単です
 * （grading.test.ts）。ビジネスルールはこのように外部から切り離しておくのが定石です。
 */
import {
  assertNever,
  type Answer,
  type CorrectAnswer,
  type Question,
  type QuestionResult,
} from '@typequest/shared';

/** 空白と大文字小文字、末尾のセミコロンの違いを無視して比較するための正規化。 */
export function normalizeText(text: string): string {
  return text.trim().replace(/;$/, '').replace(/\s+/g, ' ').toLowerCase();
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every((value) => setB.has(value));
}

export function isCorrect(question: Question, answer: Answer | undefined): boolean {
  // 未解答、または問題と解答の種類が食い違っていれば不正解。
  if (answer?.kind !== question.kind) return false;

  // question.kind で分岐すると、各 case の中で question の型が絞り込まれます。
  // answer 側は `answer.kind !== question.kind` の検査だけでは連動して絞り込まれないため、
  // それぞれの case で改めて kind を確認しています。
  switch (question.kind) {
    case 'single-choice':
      return answer.kind === 'single-choice' && answer.selectedIndex === question.answerIndex;
    case 'multiple-choice':
      return (
        answer.kind === 'multiple-choice' && sameSet(answer.selectedIndexes, question.answerIndexes)
      );
    case 'fill-blank':
      return (
        answer.kind === 'fill-blank' &&
        question.acceptedAnswers.some(
          (accepted) => normalizeText(accepted) === normalizeText(answer.text),
        )
      );
    default:
      // 問題の種類を増やしたのに case を書き忘れると、ここがコンパイルエラーになります。
      return assertNever(question);
  }
}

export function toCorrectAnswer(question: Question): CorrectAnswer {
  switch (question.kind) {
    case 'single-choice':
      return { kind: question.kind, answerIndex: question.answerIndex };
    case 'multiple-choice':
      return { kind: question.kind, answerIndexes: question.answerIndexes };
    case 'fill-blank':
      return { kind: question.kind, acceptedAnswers: question.acceptedAnswers };
    default:
      return assertNever(question);
  }
}

export type GradedQuiz = {
  score: number;
  total: number;
  passed: boolean;
  results: QuestionResult[];
};

/** レッスン完了の条件: 全問正解。 */
export function isPassing(score: number, total: number): boolean {
  return total > 0 && score === total;
}

export function gradeQuiz(questions: readonly Question[], answers: readonly Answer[]): GradedQuiz {
  // 同じ問題への解答が複数あれば、最後のものを採用します。
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  const results = questions.map((question): QuestionResult => ({
    questionId: question.id,
    correct: isCorrect(question, answerByQuestion.get(question.id)),
    correctAnswer: toCorrectAnswer(question),
    explanation: question.explanation,
  }));

  const score = results.filter((result) => result.correct).length;
  return { score, total: questions.length, passed: isPassing(score, questions.length), results };
}
