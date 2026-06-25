import * as esbuild from 'esbuild'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chmodSync, cpSync, mkdirSync, readFileSync, rmSync, readdirSync, copyFileSync, writeFileSync } from 'fs'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'))
const version = pkg.version
const serverOutDir = resolve(rootDir, 'dist/server')

rmSync(serverOutDir, { recursive: true, force: true })
mkdirSync(serverOutDir, { recursive: true })

await esbuild.build({
  entryPoints: [resolve(rootDir, 'packages/server/src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node23',
  format: 'cjs',
  outfile: resolve(serverOutDir, 'index.js'),
  external: ['node-pty', 'node:sqlite', 'socket.io'],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  sourcemap: true,
  minify: true,
  treeShaking: true,
  logLevel: 'info',
})

const bridgeOutDir = resolve(serverOutDir, 'agent-bridge')
mkdirSync(bridgeOutDir, { recursive: true })
cpSync(
  resolve(rootDir, 'packages/server/src/services/hermes/agent-bridge/hermes_bridge.py'),
  resolve(bridgeOutDir, 'hermes_bridge.py'),
)
chmodSync(resolve(bridgeOutDir, 'hermes_bridge.py'), 0o755)

const skillsOutDir = resolve(rootDir, 'dist/skills')
rmSync(skillsOutDir, { recursive: true, force: true })
cpSync(
  resolve(rootDir, 'packages/skills'),
  skillsOutDir,
  { recursive: true },
)

// Copy hermes-agent source (excluding dev/test/docs/media) for production runtime.
// The FaaS runtime is isolated from the build environment, so hermes-agent must be
// included in the deployment artifact. hermes_bridge.py adds this dir to sys.path
// at runtime, so a pip install -e is NOT required in the run phase.
const agentSrcDir = resolve(rootDir, 'hermes-agent')
const agentOutDir = resolve(rootDir, 'dist/hermes-agent')
rmSync(agentOutDir, { recursive: true, force: true })
mkdirSync(agentOutDir, { recursive: true })

const agentExcludes = new Set([
  '.git', '.venv', 'node_modules', 'tests', '.github', 'web', 'website',
  'ui-tui', 'datagen-config-examples', 'docker', 'infographic', 'images',
  'locales', 'nix', 'packaging', 'cron', 'plans', 'optional-skills',
  '__pycache__', 'hermes_agent.egg-info', 'docs', 'assets', '.plans',
  'mini-swe-agent', 'browser-use', 'agent-browser', 'environments',
  'examples', 'wandb', 'testlogs',
])

function copyAgentDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (agentExcludes.has(entry.name)) continue
    // Skip RELEASE_*.md and .md files at root level (keep subdirectory .md)
    if (entry.isFile() && entry.name.startsWith('RELEASE_')) continue
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyAgentDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

copyAgentDir(agentSrcDir, agentOutDir)

// Create a 'hermes' CLI wrapper in dist/bin/ so the FaaS runtime can find it.
// This script does the same as scripts/hermes-mock.sh but uses the deployed
// agent root (relative to the script's own location) instead of a hard-coded path.
const binOutDir = resolve(rootDir, 'dist/bin')
mkdirSync(binOutDir, { recursive: true })
const hermesWrapper = resolve(binOutDir, 'hermes')
writeFileSync(hermesWrapper, `#!/usr/bin/env python3
"""Hermes Agent CLI launcher for FaaS production runtime."""
import sys, os
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
agent_root = os.path.join(base, 'hermes-agent')
pylibs = os.path.join(base, 'pylibs')
os.environ.setdefault('HERMES_AGENT_ROOT', agent_root)
sys.path.insert(0, agent_root)
sys.path.insert(0, pylibs)
from hermes_cli.main import main
main()
`)
chmodSync(hermesWrapper, 0o755)
