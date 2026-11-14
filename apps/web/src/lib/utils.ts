import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * クラス名を結合するヘルパー（shadcn/ui の定番）。
 *
 * - clsx: 条件付きのクラス名（`{ 'opacity-50': disabled }` など）を 1 つの文字列にまとめる
 * - twMerge: Tailwind のクラスが衝突したら後ろを優先する（`px-2` と `px-4` なら `px-4`）
 *
 * 部品の既定のクラスに、呼び出し側が渡したクラスを「上書きできる形」で足すために使います。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
