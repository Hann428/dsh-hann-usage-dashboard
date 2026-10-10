/** Import the built plugin using only declared peers from a Harness profile. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
const profileRoot = process.argv[2]
assert.ok(profileRoot, 'Usage: node scripts/check-installed-import.mjs <Harness profile directory>')
const profileRequire = createRequire(path.join(path.resolve(profileRoot), 'package.json'))
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-hann-usage-import-'))
try {
  fs.copyFileSync(path.join(packageRoot, 'package.json'), path.join(temporaryRoot, 'package.json'))
  fs.cpSync(path.join(packageRoot, 'lib'), path.join(temporaryRoot, 'lib'), { recursive: true })
  for (const name of Object.keys(manifest.peerDependencies)) {
    const peerManifestPath = profileRequire.resolve(`${name}/package.json`)
    const peer = JSON.parse(fs.readFileSync(peerManifestPath, 'utf8'))
    assert.equal(peer.name, name, `Unexpected package behind ${name}`)
    const link = path.join(temporaryRoot, 'node_modules', name)
    fs.mkdirSync(path.dirname(link), { recursive: true })
    fs.symlinkSync(path.dirname(peerManifestPath), link, process.platform === 'win32' ? 'junction' : 'dir')
  }
  const isolatedRequire = createRequire(path.join(temporaryRoot, 'package.json'))
  for (const legacy of ['schemastery', 'cordis']) {
    assert.throws(() => isolatedRequire.resolve(legacy), { code: 'MODULE_NOT_FOUND' })
  }
  const plugin = await import(pathToFileURL(path.join(temporaryRoot, 'lib', 'index.js')).href)
  assert.equal(plugin.name, manifest.name)
  assert.equal(typeof plugin.apply, 'function')
  assert.ok(plugin.Config)
  console.log(`PASS: ${manifest.name}@${manifest.version} imports with official desktop peers and no legacy aliases`)
} finally {
  // This directory is created by this check and contains only copies and links.
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
