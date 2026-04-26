import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCreateContext } from '../use-create-context';

let mockPath = '/';
let mockParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useSearchParams: () => mockParams,
}));

describe('useCreateContext', () => {
  it('returns sprintId when /tareas?sprint=abc', () => {
    mockPath = '/tareas';
    mockParams = new URLSearchParams('sprint=abc');
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({ sprintId: 'abc' });
  });

  it('returns projectId when /proyectos/[id]', () => {
    mockPath = '/proyectos/proj-xyz';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({ projectId: 'proj-xyz' });
  });

  it('returns meetingId when /reuniones/[id]', () => {
    mockPath = '/reuniones/m-1';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({ meetingId: 'm-1' });
  });

  it('returns {} when none apply', () => {
    mockPath = '/wiki';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({});
  });

  it('does not return sprintId for /tareas/[id] route', () => {
    mockPath = '/tareas/task-1';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({});
  });
});
