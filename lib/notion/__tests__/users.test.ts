import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  users: { retrieve: vi.fn() },
};

describe('getUser', () => {
  beforeEach(async () => {
    mockNotion.users.retrieve.mockReset();
    // Re-import to clear module-level cache between tests
    vi.resetModules();
  });

  it('parses a Notion person response', async () => {
    const { getUser } = await import('../users');

    mockNotion.users.retrieve.mockResolvedValueOnce({
      id: 'user-abc',
      type: 'person',
      name: 'Carlos',
      avatar_url: 'https://example.com/avatar.png',
      person: { email: 'carlos@focuskids.co' },
    });

    const user = await getUser('user-abc');

    expect(user).toEqual({
      id: 'user-abc',
      name: 'Carlos',
      avatarUrl: 'https://example.com/avatar.png',
      email: 'carlos@focuskids.co',
    });
    expect(mockNotion.users.retrieve).toHaveBeenCalledWith({ user_id: 'user-abc' });
  });
});
