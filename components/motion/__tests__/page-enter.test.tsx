import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageEnter } from '../page-enter';

describe('PageEnter', () => {
  it('renders children inside a wrapper div', () => {
    render(<PageEnter><span data-testid="child">hi</span></PageEnter>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies the enter animation classes', () => {
    const { container } = render(<PageEnter>x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-in');
    expect(wrapper.className).toContain('fade-in');
    expect(wrapper.className).toContain('slide-in-from-bottom-1');
  });

  it('merges custom className', () => {
    const { container } = render(<PageEnter className="custom-class">x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('applies animation-delay when delay prop is set', () => {
    const { container } = render(<PageEnter delay={120}>x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.animationDelay).toBe('120ms');
  });

  it('does not set animation-delay when delay is 0 or omitted', () => {
    const { container } = render(<PageEnter>x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.animationDelay).toBe('');
  });
});
