import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import type { ReactElement } from 'react';
import { Button } from './button';

type ConfirmDialogProps = {
  /** ダイアログを開くボタン（Base UI の render に渡す要素）。 */
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

/**
 * 取り消せない操作の前に確認するダイアログ。
 *
 * ブラウザ標準の window.confirm と違い、見た目をアプリに合わせられ、Base UI が
 * フォーカスをダイアログ内に閉じ込める・Esc で閉じる・閉じたら元のボタンへフォーカスを戻す、
 * といった操作性を受け持ちます。
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <BaseAlertDialog.Root>
      <BaseAlertDialog.Trigger render={trigger} />
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseAlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 grid w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-card p-6 shadow-lg transition-[scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="grid gap-1.5">
            <BaseAlertDialog.Title className="text-lg font-bold">{title}</BaseAlertDialog.Title>
            <BaseAlertDialog.Description className="text-sm text-muted-foreground">
              {description}
            </BaseAlertDialog.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <BaseAlertDialog.Close render={<Button variant="default" />}>
              キャンセル
            </BaseAlertDialog.Close>
            <BaseAlertDialog.Close render={<Button variant="destructive" onClick={onConfirm} />}>
              {confirmLabel}
            </BaseAlertDialog.Close>
          </div>
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}
