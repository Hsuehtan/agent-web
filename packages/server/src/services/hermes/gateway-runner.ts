import { spawn } from 'child_process'
import { getActiveProfileDir } from './hermes-profile'

export function startGatewayRunManaged(
  hermesBin: string,
  opts: { profileDir?: string } = {},
): { pid: number | null; reused: boolean } {
  const profileDir = opts.profileDir || getActiveProfileDir()
  const child = spawn(hermesBin, ['gateway', 'run', '--replace'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      HERMES_HOME: profileDir,
    },
  })
  // Prevent uncaught ENOENT when hermes binary is not installed
  child.on('error', (err: Error) => {
    console.warn('[gateway-runner] failed to spawn hermes gateway process:', err.message)
  })
  child.unref()

  const pid = child.pid ?? null
  return { pid, reused: false }
}
