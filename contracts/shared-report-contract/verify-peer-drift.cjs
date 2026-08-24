'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const peerRoot = process.argv[2]
if (!peerRoot) throw new Error('Usage: node verify-peer-drift.cjs <peer-repository-root>')

const localContract = __dirname
const peerContract = path.resolve(peerRoot, 'contracts', 'shared-report-contract')
const files = ['fixtures.json', 'validator.cjs']
for (const file of files) {
  const local = fs.readFileSync(path.join(localContract, file))
  const peer = fs.readFileSync(path.join(peerContract, file))
  const localHash = crypto.createHash('sha256').update(local).digest('hex')
  const peerHash = crypto.createHash('sha256').update(peer).digest('hex')
  if (localHash !== peerHash) throw new Error(`${file} drift detected: ${localHash} != ${peerHash}`)
  console.log(`CONTRACT_DRIFT_PASS=${file}:${localHash}`)
}
