import type { ContentBlock } from '@typequest/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentRenderer } from './ContentRenderer';

describe('ContentRenderer', () => {
  it('ブロックの種類に応じた要素を描画する', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', text: '型注釈' },
      { type: 'paragraph', text: '変数に `: 型` と書きます。' },
      { type: 'code', code: 'const a: number = 1;', caption: '例' },
      { type: 'list', items: ['一つ目', '二つ目'] },
      { type: 'callout', tone: 'warning', text: '気を付けましょう' },
    ];

    render(<ContentRenderer blocks={blocks} />);

    expect(screen.getByRole('heading', { name: '型注釈' })).toBeInTheDocument();
    expect(screen.getByText(': 型').tagName).toBe('CODE');
    expect(screen.getByText('const a: number = 1;')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('注意')).toBeInTheDocument();
  });

  it('本文に HTML が含まれていても、要素としては解釈しない（XSS 対策）', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: '<img src=x onerror="alert(1)"> と `<script>alert(1)</script>`' },
    ];

    const { container } = render(<ContentRenderer blocks={blocks} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });
});
