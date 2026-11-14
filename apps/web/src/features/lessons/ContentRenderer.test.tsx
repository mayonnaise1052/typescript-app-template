import type { ContentBlock } from '@typequest/shared';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ContentRenderer } from './ContentRenderer';

describe('ContentRenderer', () => {
  it('ブロックの種類に応じた要素を描画する', async () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', text: '型注釈' },
      { type: 'paragraph', text: '変数に `: 型` と書きます。' },
      { type: 'code', code: 'const a: number = 1;', caption: '例' },
      { type: 'list', items: ['一つ目', '二つ目'] },
      { type: 'callout', tone: 'warning', text: '気を付けましょう' },
    ];

    const screen = await render(<ContentRenderer blocks={blocks} />);

    await expect.element(screen.getByRole('heading', { name: '型注釈' })).toBeVisible();
    // バッククォートで囲んだ部分は <code> 要素になる
    expect(screen.getByText(': 型').element().tagName).toBe('CODE');
    await expect.element(screen.getByText('const a: number = 1;')).toBeVisible();
    expect(screen.getByRole('listitem').elements()).toHaveLength(2);
    await expect.element(screen.getByText('注意')).toBeVisible();
  });

  it('本文に HTML が含まれていても、要素としては解釈しない（XSS 対策）', async () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: '<img src=x onerror="alert(1)"> と `<script>alert(1)</script>`' },
    ];

    const screen = await render(<ContentRenderer blocks={blocks} />);

    expect(screen.container.querySelector('img')).toBeNull();
    expect(screen.container.querySelector('script')).toBeNull();
    await expect.element(screen.getByText('<script>alert(1)</script>')).toBeVisible();
  });
});
