import fs from 'node:fs';
import path from 'node:path';
import { productionStoreEnabled, saveProductionTeam } from '../src/server/productionStore';
import type { Team } from '../src/types';

if (!productionStoreEnabled) {
  throw new Error('Set DATABASE_URL before running the production migration.');
}

const dataDirectory = path.resolve((process.env.DATA_DIR || process.cwd()).trim());
const dataFile = path.join(dataDirectory, 'server-data.json');
const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8')) as { teams?: Team[] };
const teams = Array.isArray(saved.teams) ? saved.teams : [];

for (const team of teams) {
  await saveProductionTeam(team);
  console.log(`Migrated ${team.id}: ${team.teamName}`);
}

console.log(`Migrated ${teams.length} team(s) to production storage.`);
