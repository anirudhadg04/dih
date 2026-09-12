import type { Team } from '../types';

/**
 * Vercel functions have an ephemeral filesystem. The project already keeps a
 * GitHub backup, so production uses that repository as the durable JSON
 * ledger instead of a database. The Contents API SHA is an optimistic
 * concurrency token, preventing one serverless invocation from overwriting
 * another one's registration.
 */
const repository = String(process.env.GITHUB_BACKUP_REPOSITORY || '').trim();
const token = String(process.env.GITHUB_BACKUP_TOKEN || '').trim();
const branch = String(process.env.GITHUB_BACKUP_BRANCH || 'main').trim();
const dataPath = String(process.env.GITHUB_BACKUP_DATA_PATH || 'backups/server-data.json')
  .trim()
  .replace(/^\/+|\\/g, '');

if (process.env.VERCEL && (!repository || !token)) {
  throw new Error('GITHUB_BACKUP_REPOSITORY and GITHUB_BACKUP_TOKEN must be configured for Vercel production persistence.');
}
if (!/^[\w.-]+\/[\w.-]+$/.test(repository) && repository) {
  throw new Error('GITHUB_BACKUP_REPOSITORY must be in the form owner/repository.');
}
if (!dataPath || dataPath.split('/').some((segment) => segment === '..')) {
  throw new Error('GITHUB_BACKUP_DATA_PATH must be a repository-relative path.');
}

export const productionStoreEnabled = Boolean(repository && token);
export type DuplicateCode = 'TEAM_NAME_EXISTS' | 'EMAIL_EXISTS' | 'USN_EXISTS' | 'PHONE_EXISTS';

type PersistedLedger = { teams?: Team[]; nextTeamNumber?: number };
type RemoteLedger = { ledger: PersistedLedger; sha?: string };

function storageError(message: string, code?: string): Error & { code?: string } {
  const error = new Error(message) as Error & { code?: string };
  if (code) error.code = code;
  return error;
}

function normalizedTeamName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function nextTeamNumber(teams: Team[], savedNext?: number): number {
  return Math.max(
    Number.isFinite(savedNext) ? Number(savedNext) : 0,
    ...teams.map((team) => Number(String(team.id || '').match(/(\d+)$/)?.[1] || 0))
  );
}

function normaliseLedger(input: PersistedLedger | null | undefined): PersistedLedger {
  const teams = Array.isArray(input?.teams) ? input!.teams : [];
  return { teams, nextTeamNumber: nextTeamNumber(teams, input?.nextTeamNumber) };
}

async function githubRequest(pathname: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'anvation-registration-ledger',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {})
    }
  });
}

async function readRemoteLedger(): Promise<RemoteLedger> {
  if (!productionStoreEnabled) return { ledger: normaliseLedger({}) };
  const file = dataPath.split('/').map(encodeURIComponent).join('/');
  const response = await githubRequest(`/repos/${repository}/contents/${file}?ref=${encodeURIComponent(branch)}`);
  if (response.status === 404) return { ledger: normaliseLedger({}) };
  if (!response.ok) throw storageError(`GitHub persistence read failed (${response.status}).`);

  const body: any = await response.json();
  try {
    const content = String(body.content || '').replace(/\s/g, '');
    return { ledger: normaliseLedger(JSON.parse(Buffer.from(content, 'base64').toString('utf8'))), sha: String(body.sha || '') || undefined };
  } catch {
    throw storageError('The GitHub registration ledger is not valid JSON.');
  }
}

async function writeRemoteLedger(ledger: PersistedLedger, sha?: string): Promise<boolean> {
  const file = dataPath.split('/').map(encodeURIComponent).join('/');
  const response = await githubRequest(`/repos/${repository}/contents/${file}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Update ANVATION registration ledger',
      content: Buffer.from(JSON.stringify(normaliseLedger(ledger), null, 2), 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {})
    })
  });
  if (response.status === 409 || response.status === 422) return false;
  if (!response.ok) throw storageError(`GitHub persistence write failed (${response.status}).`);
  return true;
}

async function mutateLedger(mutator: (ledger: PersistedLedger) => void): Promise<PersistedLedger> {
  if (!productionStoreEnabled) throw storageError('GitHub production persistence is not configured.');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const remote = await readRemoteLedger();
    const ledger = normaliseLedger(remote.ledger);
    mutator(ledger);
    ledger.nextTeamNumber = nextTeamNumber(ledger.teams || [], ledger.nextTeamNumber);
    if (await writeRemoteLedger(ledger, remote.sha)) return ledger;
  }
  throw storageError('The registration ledger changed concurrently. Please retry.');
}

export async function ensureProductionSchema(): Promise<void> {
  // Compatibility no-op: this application deliberately has no database schema.
}

export async function loadProductionTeams(): Promise<Team[]> {
  if (!productionStoreEnabled) return [];
  return (await readRemoteLedger()).ledger.teams || [];
}

export async function getProductionNextTeamNumber(): Promise<number> {
  if (!productionStoreEnabled) return 0;
  const ledger = (await readRemoteLedger()).ledger;
  return nextTeamNumber(ledger.teams || [], ledger.nextTeamNumber);
}

export async function findProductionDuplicate(conflict: {
  teamName?: string;
  participants?: Array<{ email?: string; usn?: string; phone?: string }>;
}): Promise<{ code: DuplicateCode; value: string } | null> {
  if (!productionStoreEnabled) return null;
  const teams = (await readRemoteLedger()).ledger.teams || [];
  const teamNameKey = conflict.teamName ? normalizedTeamName(conflict.teamName) : '';
  if (teamNameKey && teams.some((team) => normalizedTeamName(team.teamName || '') === teamNameKey)) {
    return { code: 'TEAM_NAME_EXISTS', value: conflict.teamName!.trim() };
  }
  for (const participant of conflict.participants || []) {
    const email = String(participant.email || '').trim().toLowerCase();
    const usn = String(participant.usn || '').trim().toUpperCase();
    const phone = String(participant.phone || '').replace(/\D/g, '');
    for (const team of teams) {
      if (team.members.some((member) => email && member.email.trim().toLowerCase() === email)) return { code: 'EMAIL_EXISTS', value: email };
      if (team.members.some((member) => usn && member.usn.trim().toUpperCase() === usn)) return { code: 'USN_EXISTS', value: usn };
      if (team.members.some((member) => phone && member.phone.replace(/\D/g, '') === phone)) return { code: 'PHONE_EXISTS', value: phone };
    }
  }
  return null;
}

export async function saveProductionTeam(team: Team): Promise<void> {
  await mutateLedger((ledger) => {
    const teams = ledger.teams || (ledger.teams = []);
    if (teams.some((candidate) => candidate.id === team.id)) throw storageError('Team ID already exists.', 'TEAM_ID_EXISTS');
    if (teams.some((candidate) => normalizedTeamName(candidate.teamName || '') === normalizedTeamName(team.teamName || ''))) {
      throw storageError('Team name already exists.', 'TEAM_NAME_EXISTS');
    }
    for (const participant of team.members) {
      const email = String(participant.email || '').trim().toLowerCase();
      const usn = String(participant.usn || '').trim().toUpperCase();
      const phone = String(participant.phone || '').replace(/\D/g, '');
      for (const candidate of teams) {
        if (candidate.members.some((member) => email && member.email.trim().toLowerCase() === email)) {
          throw storageError('Participant email already exists.', 'EMAIL_EXISTS');
        }
        if (candidate.members.some((member) => usn && member.usn.trim().toUpperCase() === usn)) {
          throw storageError('Participant USN already exists.', 'USN_EXISTS');
        }
        if (candidate.members.some((member) => phone && member.phone.replace(/\D/g, '') === phone)) {
          throw storageError('Participant phone already exists.', 'PHONE_EXISTS');
        }
      }
    }
    teams.push(team);
  });
}

export async function updateProductionTeam(team: Team): Promise<void> {
  await mutateLedger((ledger) => {
    const teams = ledger.teams || [];
    const index = teams.findIndex((candidate) => candidate.id === team.id);
    if (index === -1) throw storageError('Team not found in the registration ledger.', 'TEAM_NOT_FOUND');
    teams[index] = team;
  });
}

export async function transitionProductionTeam(teamId: string, changes: Partial<Team>): Promise<{ team: Team; alreadyTransitioned: boolean }> {
  if (!productionStoreEnabled) throw storageError('GitHub production persistence is not configured.');
  const requestedStatus = changes.approvalStatus;
  if (requestedStatus !== 'APPROVED' && requestedStatus !== 'REJECTED') {
    throw storageError('A terminal approval status is required.');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const remote = await readRemoteLedger();
    const ledger = normaliseLedger(remote.ledger);
    const teams = ledger.teams || [];
    const index = teams.findIndex((candidate) => candidate.id === teamId);
    if (index === -1) throw storageError('Team not found in the registration ledger.', 'TEAM_NOT_FOUND');
    const current = teams[index];
    if (current.approvalStatus === requestedStatus) return { team: current, alreadyTransitioned: true };
    if (current.approvalStatus === 'APPROVED' || current.approvalStatus === 'REJECTED') {
      throw storageError(`Team has already been ${String(current.approvalStatus).toLowerCase()}.`, `TEAM_${current.approvalStatus}`);
    }

    const next: Team = { ...current, ...changes, id: current.id, members: current.members };
    teams[index] = next;
    if (await writeRemoteLedger(ledger, remote.sha)) return { team: next, alreadyTransitioned: false };
  }
  throw storageError('The registration ledger changed concurrently. Please retry.');
}

export async function deleteProductionTeam(teamId: string): Promise<void> {
  await mutateLedger((ledger) => {
    const teams = ledger.teams || [];
    const index = teams.findIndex((candidate) => candidate.id === teamId);
    if (index === -1) throw storageError('Team not found in the registration ledger.', 'TEAM_NOT_FOUND');
    teams.splice(index, 1);
  });
}
