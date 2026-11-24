// @ts-check
// "What should Ember build next": a list the owner keeps, with one vote per person per item and a box for
// suggestions. The database holds the rules (supabase/migrations/…_roadmap.sql); this file is only the calls.

const REASONS = ['too_many_notes', 'not_signed_in'];
const fail = error => {
  const text = String((error && error.message) || '');
  throw { code: REASONS.find(r => text.includes(r)) || 'failed', message: text };
};

/** @param {any} client a signed-in Supabase client */
export function roadmapApi(client) {
  return {
    /**
     * The list, most wanted first, with totals and whether this person has voted.
     * @returns {Promise<{ id: string, title: string, about: string, status: 'open' | 'building' | 'done', votes: number, mine: boolean }[]>}
     */
    async board() {
      const { data, error } = await client.rpc('roadmap_board');
      if (error) fail(error);
      return data || [];
    },
    /** Vote for an item. Voting twice is harmless. */
    async vote(itemId) {
      const { error } = await client.from('roadmap_votes').insert({ item_id: itemId });
      if (error && error.code !== '23505') fail(error);
    },
    async unvote(itemId) {
      const { error } = await client.from('roadmap_votes').delete().eq('item_id', itemId);
      if (error) fail(error);
    },
    /** Send the owner a suggestion (3 to 500 characters, three a day). */
    async suggest(body) {
      const { error } = await client.rpc('roadmap_suggest', { p_body: body });
      if (error) fail(error);
    },
  };
}
