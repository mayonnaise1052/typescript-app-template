import { advanced } from './chapter3-advanced';
import { intro } from './chapter0-intro';
import { basics } from './chapter1-basics';
import { intermediate } from './chapter2-intermediate';
import { practical } from './chapter4-practical';
import type { LessonContent } from './types';

/** 全レッスン。配列の順番がそのまま学習順になります。 */
export const LESSONS: readonly LessonContent[] = [
  ...intro,
  ...basics,
  ...intermediate,
  ...advanced,
  ...practical,
];
