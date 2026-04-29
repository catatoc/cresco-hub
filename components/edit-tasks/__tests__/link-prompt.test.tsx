import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkPrompt } from '../link-prompt';

describe('LinkPrompt', () => {
  it('renders an input prefilled with initialUrl', () => {
    render(<LinkPrompt initialUrl="https://x.com" onSubmit={() => {}} onCancel={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('https://x.com');
  });

  it('calls onSubmit with normalized URL on Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LinkPrompt initialUrl="" onSubmit={onSubmit} onCancel={() => {}} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'example.com');
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('https://example.com');
  });

  it('calls onCancel on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<LinkPrompt initialUrl="" onSubmit={() => {}} onCancel={onCancel} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('submitting an empty input cancels rather than submits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<LinkPrompt initialUrl="" onSubmit={onSubmit} onCancel={onCancel} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('autofocuses on mount', () => {
    render(<LinkPrompt initialUrl="" onSubmit={() => {}} onCancel={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(document.activeElement).toBe(input);
  });
});
