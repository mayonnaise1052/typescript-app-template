import {
  assertNever,
  type Answer,
  type PublicQuestion,
  type QuestionId,
  type QuestionResult,
  type QuizResult,
} from '@typequest/shared';
import { useState, type SubmitEvent } from 'react';
import { ErrorMessage } from '../../components/Feedback';
import { RichText } from '../../components/RichText';

type QuizFormProps = {
  questions: readonly PublicQuestion[];
  result: QuizResult | undefined;
  isSubmitting: boolean;
  error: unknown;
  onSubmit: (answers: Answer[]) => void;
  onRetry: () => void;
};

/** 問題 ID → 解答。まだ答えていない問題はキーが存在しません。 */
type AnswerMap = Partial<Record<QuestionId, Answer>>;

export function QuizForm({
  questions,
  result,
  isSubmitting,
  error,
  onSubmit,
  onRetry,
}: QuizFormProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});

  const setAnswer = (answer: Answer) =>
    setAnswers((current) => ({ ...current, [answer.questionId]: answer }));

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    // 値が undefined の要素を取り除きつつ、型も Answer[] に絞り込みます（型ガード）。
    onSubmit(Object.values(answers).filter((answer): answer is Answer => answer !== undefined));
  }

  function handleRetry() {
    setAnswers({});
    onRetry();
  }

  const resultById = new Map(result?.results.map((item) => [item.questionId, item]));

  return (
    <form onSubmit={handleSubmit} className="quiz">
      {questions.map((question, index) => (
        <QuestionField
          key={question.id}
          number={index + 1}
          question={question}
          answer={answers[question.id]}
          result={resultById.get(question.id)}
          disabled={isSubmitting || result !== undefined}
          onChange={setAnswer}
        />
      ))}

      {error !== null && error !== undefined && <ErrorMessage error={error} />}

      {result ? (
        <div className={result.passed ? 'quiz-summary passed' : 'quiz-summary'} role="status">
          <p>
            <strong>
              {result.total} 問中 {result.score} 問正解
            </strong>
            {result.passed
              ? ' — 全問正解です。このレッスンは完了しました。'
              : ' — 解説を読んで、もう一度挑戦してみましょう。'}
          </p>
          <button type="button" className="button" onClick={handleRetry}>
            もう一度挑戦する
          </button>
        </div>
      ) : (
        <button type="submit" className="button primary" disabled={isSubmitting}>
          {isSubmitting ? '採点中…' : '解答する'}
        </button>
      )}
    </form>
  );
}

type QuestionFieldProps = {
  number: number;
  question: PublicQuestion;
  answer: Answer | undefined;
  result: QuestionResult | undefined;
  disabled: boolean;
  onChange: (answer: Answer) => void;
};

function QuestionField({
  number,
  question,
  answer,
  result,
  disabled,
  onChange,
}: QuestionFieldProps) {
  return (
    <fieldset className="question" disabled={disabled}>
      <legend>
        <span className="question-number">Q{number}</span>
        <RichText text={question.prompt} />
      </legend>
      {question.code && (
        <pre className="question-code">
          <code>{question.code}</code>
        </pre>
      )}
      <QuestionInput question={question} answer={answer} onChange={onChange} />
      {result && <ResultView question={question} result={result} />}
    </fieldset>
  );
}

function QuestionInput({
  question,
  answer,
  onChange,
}: Pick<QuestionFieldProps, 'question' | 'answer' | 'onChange'>) {
  const questionId = question.id;

  // 問題の種類ごとに入力欄を出し分けます。判別可能ユニオンなので、
  // 各 case の中では question.choices などに安全にアクセスできます。
  switch (question.kind) {
    case 'single-choice': {
      const selected = answer?.kind === 'single-choice' ? answer.selectedIndex : undefined;
      return (
        <ul className="choices">
          {question.choices.map((choice, index) => (
            <li key={index}>
              <label>
                <input
                  type="radio"
                  name={questionId}
                  checked={selected === index}
                  onChange={() =>
                    onChange({ questionId, kind: 'single-choice', selectedIndex: index })
                  }
                />
                <code>{choice}</code>
              </label>
            </li>
          ))}
        </ul>
      );
    }
    case 'multiple-choice': {
      const selected = answer?.kind === 'multiple-choice' ? answer.selectedIndexes : [];
      const toggle = (index: number) =>
        onChange({
          questionId,
          kind: 'multiple-choice',
          selectedIndexes: selected.includes(index)
            ? selected.filter((value) => value !== index)
            : [...selected, index],
        });
      return (
        <>
          <p className="field-hint">当てはまるものをすべて選んでください。</p>
          <ul className="choices">
            {question.choices.map((choice, index) => (
              <li key={index}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(index)}
                    onChange={() => toggle(index)}
                  />
                  <code>{choice}</code>
                </label>
              </li>
            ))}
          </ul>
        </>
      );
    }
    case 'fill-blank':
      return (
        <label className="blank-input">
          <span>空欄（____）に入るコード</span>
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={200}
            value={answer?.kind === 'fill-blank' ? answer.text : ''}
            onChange={(event) =>
              onChange({ questionId, kind: 'fill-blank', text: event.target.value })
            }
          />
        </label>
      );
    default:
      return assertNever(question);
  }
}

/** 採点結果から、表示用の「正解」の文字列を作ります。 */
function describeCorrectAnswer(question: PublicQuestion, result: QuestionResult): string {
  const { correctAnswer } = result;
  switch (correctAnswer.kind) {
    case 'single-choice':
      return question.kind === 'single-choice'
        ? (question.choices[correctAnswer.answerIndex] ?? '')
        : '';
    case 'multiple-choice':
      return question.kind === 'multiple-choice'
        ? correctAnswer.answerIndexes.map((index) => question.choices[index] ?? '').join(' / ')
        : '';
    case 'fill-blank':
      return correctAnswer.acceptedAnswers[0] ?? '';
    default:
      return assertNever(correctAnswer);
  }
}

function ResultView({ question, result }: { question: PublicQuestion; result: QuestionResult }) {
  return (
    <div className={result.correct ? 'result correct' : 'result incorrect'}>
      <p className="result-verdict">{result.correct ? '✓ 正解' : '✗ 不正解'}</p>
      {!result.correct && (
        <p>
          正解: <code>{describeCorrectAnswer(question, result)}</code>
        </p>
      )}
      <p>
        <RichText text={result.explanation} />
      </p>
    </div>
  );
}
