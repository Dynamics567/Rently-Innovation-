/**
 * Runs as Vercel's build command (see vercel.json) — writes a version marker
 * the deployed frontend can poll to detect that a newer deploy has gone
 * live and prompt/auto-reload (see assets/rently.js's watchForUpdates()).
 * VERCEL_GIT_COMMIT_SHA is set automatically on every git-triggered deploy;
 * the timestamp fallback covers local/manual builds where it's absent.
 */
const fs = require('fs');
const path = require('path');

const version = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());
fs.writeFileSync(path.join(__dirname, 'prototype', 'version.json'), JSON.stringify({ version }));
console.log(`Wrote prototype/version.json with version ${version}`);
