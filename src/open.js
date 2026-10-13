import { spawn } from 'node:child_process';

/** Open a URL or mailto: link in the user's default handler. */
export function open(target) {
  const command =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';

  const args =
    process.platform === 'win32' ? ['/c', 'start', '', target] : [target];

  try {
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}