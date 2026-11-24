// @ts-check
// Squads on Supabase: invite-only groups who share a display name, this week's XP, a streak and a count of
// sessions, and nothing else. The database decides who may see what (supabase/migrations/…_squads.sql);
// this file is only the calls.

const REASONS = [
  'not_found',
  'too_many_owned',
  'too_many_joined',
  'squad_full',
  'not_a_member',
  'not_owner',
  'not_signed_in',
];
const fail = error => {
  const text = String((error && error.message) || '');
  throw { code: REASONS.find(r => text.includes(r)) || 'failed', message: text };
};

/**
 * @param {any} client a signed-in Supabase client
 * @param {string} userId
 */
export function squadsApi(client, userId) {
  return {
    /** The squads this person belongs to. */
    async mine() {
      const { data, error } = await client
        .from('squads')
        .select('id, code, name, owner, challenge')
        .order('created_at');
      if (error) fail(error);
      return data.map(s => ({ ...s, owned: s.owner === userId }));
    },
    /** Start a squad; the caller owns it. Returns { id, code }. */
    async create(name, memberName) {
      const { data, error } = await client.rpc('create_squad', { p_name: name, p_member_name: memberName });
      if (error) fail(error);
      return Array.isArray(data) ? data[0] : data;
    },
    /** Join by code. Returns the squad's id. */
    async join(code, memberName) {
      const { data, error } = await client.rpc('join_squad', { p_code: code, p_member_name: memberName });
      if (error) fail(error);
      return data;
    },
    async leave(squadId) {
      const { error } = await client.from('squad_members').delete().eq('squad_id', squadId).eq('user_id', userId);
      if (error) fail(error);
    },
    /**
     * Put this person's figures for the week on every board they are on.
     * @param {{ week: string, xp: number, streak: number, sessions: number, name?: string }} stats
     */
    async publish(stats) {
      const row = {
        week: stats.week,
        xp: Math.max(0, Math.min(100000, Math.round(stats.xp) || 0)),
        streak: Math.max(0, Math.min(5000, Math.round(stats.streak) || 0)),
        sessions: Math.max(0, Math.min(60, Math.round(stats.sessions) || 0)),
        updated_at: new Date().toISOString(),
        ...(stats.name ? { name: String(stats.name).trim().slice(0, 24) } : {}),
      };
      const { error } = await client.from('squad_members').update(row).eq('user_id', userId);
      if (error) fail(error);
    },
    /** The week's board: { members, active, sessions, rank, top: [{ me, name, xp, streak, sessions }] }. */
    async board(squadId, week) {
      const { data, error } = await client.rpc('squad_board', { p_squad: squadId, p_week: week });
      if (error) fail(error);
      return data;
    },
    /** Owner only: rename the squad or set its challenge. */
    async edit(squadId, changes) {
      const { error } = await client.from('squads').update(changes).eq('id', squadId);
      if (error) fail(error);
    },
    /** Owner only: remove everyone going by a name. Returns how many went. */
    async remove(squadId, name) {
      const { data, error } = await client.rpc('squad_remove', { p_squad: squadId, p_name: name });
      if (error) fail(error);
      return data;
    },
    /** Owner only: delete the squad and its board. */
    async destroy(squadId) {
      const { error } = await client.from('squads').delete().eq('id', squadId);
      if (error) fail(error);
    },
  };
}
