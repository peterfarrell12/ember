/* ================= what to build next: a list to vote on, and a box for suggestions =================
   The list is the owner's; people signed in get one vote an item and can take it back. Only totals are shown:
   nobody sees who voted for what. A suggestion goes to the owner and to nobody else.
   The database holds the rules (supabase/migrations, roadmap). */
const RM = { list: null, busy: false, err: '' };
const roadmapOn = () => Store.durable && authConfigured();
const rmApi = async () => roadmapApi(await supabaseClient());
const RM_LABEL = { building: 'Being built', done: 'Done' };
A.roadmap = () => {
  if (!roadmapOn()) return toast('Sign in to vote on what comes next.');
  openSheet(
    `${sh('What should Ember build next?')}<div class="sheet-b"><p class="small muted">Vote for what you would use. The most wanted are built first. Only the totals are shown; nobody sees how you voted.</p><div id="rmBody"><div class="busy"><div class="spinner"></div>Loading</div></div>
    <div class="card stack"><h2>Something else?</h2><label class="f">Tell us what is missing<textarea id="rmNote" rows="3" maxlength="500" placeholder="What would make Ember better for you?"></textarea></label><button class="btn ghost" data-act="roadmapSend">${ic('send')} Send</button><p class="tiny muted">Read by the people who build Ember. Not shown to anyone else.</p></div></div>`,
    true,
  );
  rmLoad();
};
async function rmLoad() {
  if (RM.busy) return;
  RM.busy = true;
  try {
    RM.list = await (await rmApi()).board();
    RM.err = '';
  } catch (e) {
    RM.err = 'The list could not be loaded. Check your connection.';
  }
  RM.busy = false;
  rmRender();
}
function rmRender() {
  const o = $('#rmBody');
  if (!o) return;
  if (!RM.list)
    return (o.innerHTML = `<div class="banner">${ic('label')}<span>${esc(RM.err)}</span></div><button class="btn ghost" data-act="roadmapAgain">Try again</button>`);
  const row = i =>
    `<div class="rm-row${i.status === 'done' ? ' done' : ''}"><div class="grow"><b>${esc(i.title)}</b>${RM_LABEL[i.status] ? ` <span class="pill ${i.status === 'done' ? 'good' : 'gold'}">${RM_LABEL[i.status]}</span>` : ''}<small>${esc(i.about)}</small></div>${
      i.status === 'done'
        ? `<span class="rm-n num" aria-label="${i.votes} votes">${fmt(i.votes)}</span>`
        : `<button class="rm-vote${i.mine ? ' on' : ''}" data-act="roadmapVote" data-id="${esc(i.id)}" aria-pressed="${i.mine ? 'true' : 'false'}" aria-label="${i.mine ? 'Take back your vote for' : 'Vote for'} ${esc(i.title)}, ${i.votes} vote${i.votes === 1 ? '' : 's'}">${ic(i.mine ? 'check' : 'plus')}<span class="num">${fmt(i.votes)}</span></button>`
    }</div>`;
  o.innerHTML = RM.list.length
    ? `<div class="card rm-list">${RM.list.map(row).join('')}</div>${RM.err ? `<p class="small" style="color:var(--bad)">${esc(RM.err)}</p>` : ''}`
    : `<p class="empty">Nothing is up for a vote right now.</p>`;
}
A.roadmapAgain = () => rmLoad();
A.roadmapVote = async ({ id }) => {
  const it = (RM.list || []).find(i => i.id === id);
  if (!it || it.busy) return;
  // show the vote at once, then tell the server; put it back if the server says no
  const was = it.mine;
  it.busy = true;
  it.mine = !was;
  it.votes = Math.max(0, it.votes + (was ? -1 : 1));
  RM.err = '';
  rmRender();
  try {
    const api = await rmApi();
    await (was ? api.unvote(id) : api.vote(id));
  } catch (e) {
    it.mine = was;
    it.votes = Math.max(0, it.votes + (was ? 1 : -1));
    RM.err = 'That vote did not go through. Check your connection and try again.';
  }
  it.busy = false;
  rmRender();
};
A.roadmapSend = async () => {
  const el = $('#rmNote'),
    body = el.value.trim();
  if (body.length < 3) return toast('Write a few words first.');
  try {
    await (await rmApi()).suggest(body);
    el.value = '';
    toast('Sent. Thank you.', 'good');
  } catch (e) {
    toast(
      e && e.code === 'too_many_notes'
        ? 'Three suggestions a day is the limit. Send more tomorrow.'
        : 'That did not send. Check your connection and try again.',
    );
  }
};
