import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { CredentialField } from '../credential-field';
import messages from '@/messages/es/testUsers.json';

function renderCF(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={{ testUsers: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const writeTextMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeTextMock.mockClear();
  Object.assign(navigator, {
    clipboard: { writeText: writeTextMock },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CredentialField', () => {
  it('text type: renders value plain and copies on click', async () => {
    renderCF(<CredentialField field="user" value="cliente@demo.com" type="text" />);
    expect(screen.getByText('cliente@demo.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copiar usuario/i }));

    expect(writeTextMock).toHaveBeenCalledWith('cliente@demo.com');
  });

  it('password type: masks value with 8 bullets and reveals on toggle', () => {
    renderCF(<CredentialField field="password" value="s3cret-very-long" type="password" />);

    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('s3cret-very-long')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mostrar clave/i }));

    expect(screen.getByText('s3cret-very-long')).toBeInTheDocument();
    expect(screen.queryByText('••••••••')).not.toBeInTheDocument();
  });

  it('password type: auto-hides 30 seconds after reveal', () => {
    vi.useFakeTimers();
    renderCF(<CredentialField field="password" value="s3cret" type="password" />);

    fireEvent.click(screen.getByRole('button', { name: /mostrar clave/i }));
    expect(screen.getByText('s3cret')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.queryByText('s3cret')).not.toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('password type: copy works while masked and copies real value', () => {
    renderCF(<CredentialField field="password" value="s3cret" type="password" />);
    fireEvent.click(screen.getByRole('button', { name: /copiar clave/i }));
    expect(writeTextMock).toHaveBeenCalledWith('s3cret');
  });

  it('url type: renders external link with rel/noopener', () => {
    renderCF(
      <CredentialField field="url" value="https://staging.app.com" type="url" />,
    );
    const link = screen.getByRole('link', { name: /staging\.app\.com/i });
    expect(link).toHaveAttribute('href', 'https://staging.app.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
