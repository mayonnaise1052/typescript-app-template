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
import { CodeBlock } from '../../components/CodeBlock';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { cn } from '../../lib/utils';
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
    <form onSubmit={handleSubmit} className="grid justify-items-start gap-5">
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
        <div
          className={cn(
            'flex w-full flex-wrap items-center justify-between gap-3 rounded-lg px-5 py-4',
            result.passed ? 'bg-success-soft' : 'bg-muted',
          )}
          role="status"
        >
          <p>
            <strong>
              {result.total} 問中 {result.score} 問正解
            </strong>
            {result.passed
              ? ' — 全問正解です。このレッスンは完了しました。'
              : ' — 解説を読んで、もう一度挑戦してみましょう。'}
          </p>
          <Button onClick={handleRetry}>もう一度挑戦する</Button>
        </div>
      ) : (
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? '採点中…' : '解答する'}
        </Button>
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
    <fieldset
      className="w-full min-w-0 rounded-lg border bg-card px-5 pt-4 pb-5"
      disabled={disabled}
    >
      <legend className="float-left mb-3 w-full font-semibold">
        <span className="mr-2 text-primary">Q{number}</span>
        <RichText text={question.prompt} />
      </legend>
      <div className="clear-both">
        {question.code && <CodeBlock code={question.code} className="mb-4" />}
        <QuestionInput
          question={question}
          answer={answer}
          disabled={disabled}
          onChange={onChange}
        />
        {result && <ResultView question={question} result={result} />}
      </div>
    </fieldset>
  );
}

const choiceLabelClass =
  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 has-data-checked:border-primary has-data-checked:bg-accent';

function QuestionInput({
  question,
  answer,
  disabled,
  onChange,
}: Pick<QuestionFieldProps, 'question' | 'answer' | 'disabled' | 'onChange'>) {
  const questionId = question.id;

  // 問題の種類ごとに入力欄を出し分けます。判別可能ユニオンなので、
  // 各 case の中では question.choices などに安全にアクセスできます。
  switch (question.kind) {
    case 'single-choice': {
      const selected = answer?.kind === 'single-choice' ? answer.selectedIndex : null;
      return (
        <RadioGroup
          value={selected}
          disabled={disabled}
          onValueChange={(value) => {
            if (typeof value === 'number') {
              onChange({ questionId, kind: 'single-choice', selectedIndex: value });
            }
          }}
        >
          {question.choices.map((choice, index) => (
            <label key={index} className={choiceLabelClass}>
              <RadioGroupItem value={index} />
              <code className="font-mono text-sm">{choice}</code>
            </label>
          ))}
        </RadioGroup>
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
          <p className="mb-2 text-sm text-muted-foreground">
            当てはまるものをすべて選んでください。
          </p>
          <ul className="grid gap-2">
            {question.choices.map((choice, index) => (
              <li key={index}>
                <label className={choiceLabelClass}>
                  <Checkbox
                    checked={selected.includes(index)}
                    disabled={disabled}
                    onCheckedChange={() => toggle(index)}
                  />
                  <code className="font-mono text-sm">{choice}</code>
                </label>
              </li>
            ))}
          </ul>
        </>
      );
    }
    case 'fill-blank':
      return (
        <label className="grid max-w-sm gap-1.5">
          <span className="text-sm font-semibold">空欄（____）に入るコード</span>
          <Input
            type="text"
            className="font-mono"
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
    <div
      className={cn(
        'mt-4 grid gap-1 rounded-md px-4 py-3',
        result.correct ? 'bg-success-soft' : 'bg-destructive-soft',
      )}
    >
      <p className={cn('font-bold', result.correct ? 'text-success' : 'text-destructive')}>
        {result.correct ? '✓ 正解' : '✗ 不正解'}
      </p>
      {!result.correct && (
        <p>
          正解: <code className="font-mono">{describeCorrectAnswer(question, result)}</code>
        </p>
      )}
      <p>
        <RichText text={result.explanation} />
      </p>
    </div>
  );
}
