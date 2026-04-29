// lib/claude-code/build-cli-command.ts

type Args = {
  prompt: string;
  /**
   * Absolute path of the local repo. When `null` or empty, the command
   * is just `claude "..."` and the user runs it from wherever they are.
   */
  repoPath: string | null;
};

/**
 * Build a shell command the user can paste into their terminal to
 * start a local Claude Code session with the prompt prefilled.
 *
 * The prompt is wrapped in double quotes; backslashes and double
 * quotes inside it are escaped. Newlines are preserved as-is —
 * shells handle multiline double-quoted strings.
 */
export function buildCliCommand({ prompt, repoPath }: Args): string {
  const escaped = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const claudeCmd = `claude "${escaped}"`;
  if (!repoPath) return claudeCmd;
  return `cd ${repoPath} && ${claudeCmd}`;
}
