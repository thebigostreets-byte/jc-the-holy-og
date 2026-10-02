import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/deploy-pages.yml', 'utf8');
const errors = [];
if (!workflow.includes('npm ci')) errors.push('missing npm ci');
const hydrate = workflow.indexOf('npm run hydrate');
const verify = workflow.indexOf('npm run verify:assets');
const build = workflow.indexOf('npm run build');
if (hydrate < 0) errors.push('missing hydrate');
if (verify < 0) errors.push('missing asset verification');
if (build < 0) errors.push('missing build');
if (hydrate >= 0 && verify >= 0 && hydrate > verify) errors.push('hydrate must precede verify');
if (verify >= 0 && build >= 0 && verify > build) errors.push('verify must precede build');
if (!workflow.includes('node tests/npc-contacts.mjs')) errors.push('missing NPC contact regression');
if (!workflow.includes('git push origin gh-pages')) errors.push('missing Pages push');
if (errors.length) { console.error('Deployment workflow validation failed:'); for (const error of errors) console.error('- ' + error); process.exit(1); }
console.log('Deployment workflow validation passed.');
