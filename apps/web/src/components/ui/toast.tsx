import { Toast } from '@base-ui/react/toast';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * 操作結果の通知（トースト）。
 *
 * Base UI の Toast を使っています。よく使われる sonner は読み込み時に <style> 要素を
 * 動的に追加するため、このアプリのセキュリティ設定（CSP の style-src 'self'）で
 * ブロックされてしまいます。Base UI はそれを行わないので、CSP を緩めずに済みます
 * （docs/specs/0002-....md の 3.2）。
 *
 * 部品の外（mutation の onSuccess など）からも呼べるよう、マネージャーをアプリに 1 つだけ作ります。
 */
const toastManager = Toast.createToastManager();

/** 通知の種類。`type` として渡し、見た目の切り替えに使います。 */
type ToastKind = 'success' | 'error';

function show(kind: ToastKind, title: string) {
  toastManager.add({ title, type: kind, priority: kind === 'error' ? 'high' : 'low' });
}

export const toast = {
  success: (title: string) => show('success', title),
  error: (title: string) => show('error', title),
};

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((item) => (
    <Toast.Root
      key={item.id}
      toast={item}
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg transition-[opacity,translate] duration-300 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0',
        item.type === 'error' ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-success',
      )}
    >
      {/* 既定では見出し（h2）になりますが、通知はページの見出し構造に含めないので段落にします。 */}
      <Toast.Title render={<p />} className="flex-1 text-sm font-semibold" />
      <Toast.Close
        aria-label="通知を閉じる"
        className="-mr-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </Toast.Close>
    </Toast.Root>
  ));
}

/** 通知の表示場所。アプリに 1 つだけ置きます（routes/__root.tsx）。 */
export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] flex-col gap-2 sm:w-88">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
