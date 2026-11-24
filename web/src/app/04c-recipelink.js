/* ---------- a recipe from a link ----------
   The server reads the recipe on the page (its name, how many it serves, its ingredients as text) and the
   ingredients then go through the same describe-and-check step as a meal typed in, so every food is matched
   to the food data and the person sees the amounts before anything is saved. The method stays on the site;
   the recipe keeps a link back to it. Signed in only: the page is fetched by the server, not the phone. */
const recipeLinkOn = () => Store.durable && authConfigured() && !!AI.sample;
const RL_WHY = {
  not_a_link: 'That does not look like a web address. Paste the link to the recipe page.',
  page_unreachable: 'That page could not be read. Check the link, or describe the ingredients instead.',
  page_refused: 'That site does not let its pages be read this way. Describe the ingredients instead.',
  personal_limit: AI_MSG.personal_limit,
  session_expired: 'Sign in again to do that.',
};
A.reLink = () => {
  if (!recipeLinkOn()) return toast('Sign in to bring a recipe in from a link.');
  openSheet(
    `${sh('Recipe from a link')}<div class="sheet-b"><label class="f">Link to the recipe<input class="inp" id="rlUrl" type="url" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Paste the web address"></label>
    <p class="small muted">Ember reads the ingredients from the page and matches each one to its food data for you to check. The method stays on the site, with a link back to it.</p><p class="tiny muted">Counts as two of today's ${AI_DAILY} AI requests: one for reading the page, one for matching the foods.</p><div id="rlOut"></div></div>
    <div class="sheet-f"><button class="btn ember" data-act="reLinkGo" id="rlGo">${ic('link')} Read the recipe</button></div>`,
    true,
  );
  setTimeout(() => $('#rlUrl') && $('#rlUrl').focus(), 60);
};
A.newRecipeLink = () => {
  A.newRecipe();
  A.reLink();
};
A.reLinkGo = async () => {
  const link = ($('#rlUrl').value || '').trim();
  const out = h => {
    const o = $('#rlOut');
    if (o) o.innerHTML = h;
  };
  if (link.length < 4) return toast('Paste the link first.');
  const go = $('#rlGo');
  go.disabled = true;
  out(`<div class="busy"><div class="spinner"></div>Reading the page</div>`);
  let r;
  try {
    r = await readRecipe(recipeAccess, link);
  } catch (e) {
    if (!$('#rlOut')) return;
    go.disabled = false;
    return out(
      `<div class="banner">${ic('label')}<span>${esc(RL_WHY[e && e.code] || 'Could not reach Ember just now. Check your connection and try again.')}</span></div>`,
    );
  }
  if (!$('#rlOut') || !RE) return;
  go.disabled = false;
  if (!r.found)
    return out(
      `<div class="banner">${ic('label')}<span>No recipe was found on that page. Some sites do not publish theirs in a form that can be read. You can still describe the ingredients.</span></div><button class="btn ghost" data-act="reLinkSay">${ic('mic')} Describe the ingredients</button>`,
    );
  if (!RE.n.trim() && r.name) RE.n = r.name;
  if (r.servings && !RE.items.length) RE.sv = r.servings;
  RE.from = r.site;
  RE.url = /^https?:\/\//i.test(link) ? link : 'https://' + link;
  closeSheet();
  renderRecipe();
  reDescribe(r.ingredients.join('\n'));
  A.sayGo(); // straight to the check step: the ingredients are already written down
};
const reDescribe = seed =>
  openSay({
    title: seed ? 'Check the ingredients' : 'Describe the ingredients',
    seed,
    onDone: es => {
      es.forEach(e => {
        delete e.m;
        delete e.u;
        RE.items.push(e);
      });
      renderRecipe();
    },
  });
A.reLinkSay = () => {
  closeSheet();
  reDescribe('');
};
/* the line under a recipe's ingredients saying where they came from */
const recipeFromLine = r => {
  if (!r.from) return '';
  let href = '';
  try {
    const u = new URL(r.url);
    if (u.protocol === 'https:' || u.protocol === 'http:') href = u.href;
  } catch (e) {}
  return `<p class="tiny muted" style="margin-top:10px">Ingredients read from ${href ? `<a class="link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(r.from)}</a>` : esc(r.from)} and matched to Ember's food data. The method is on the site.</p>`;
};
