/* ---------- progress photos: private by default, shared with a coach one photo at a time ---------- */
const POSES = { front: 'Front', side: 'Side', back: 'Back' };
const PHO = { list: null, cl: null, busy: false, pend: null, urls: {} };
let ASSETS;
async function assetStore() {
  if (ASSETS === undefined) {
    try {
      ASSETS = (window.claude && (await window.claude.use('assets'))) || null;
    } catch (e) {
      ASSETS = null;
    }
  }
  return ASSETS;
}
// KNOWN ISSUE, reported to the owner and left as it is: 02-foods.js also declares a `shrink`
// (file -> canvas, for barcode photos). The files share one scope, so this later declaration
// replaces it everywhere, including in decodeBarcode, which then cannot use what it gets back.
// eslint-disable-next-line no-redeclare
function shrink(file, max, q) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file),
      im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.width, im.height)),
        c = document.createElement('canvas');
      c.width = Math.round(im.width * s);
      c.height = Math.round(im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? res({ blob: b, w: c.width, h: c.height }) : rej(new Error('encode'))), 'image/jpeg', q);
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error('decode'));
    };
    im.src = url;
  });
}
/* Keep the picture: as an uploaded file where that is available, otherwise as a smaller copy inside the record itself. */
async function photoStore(file) {
  const a = await assetStore();
  if (a) {
    try {
      const { blob, w, h } = await shrink(file, 1400, 0.82),
        up = await a.upload(blob);
      return { aid: up.id, w, h };
    } catch (e) {
      if (e && e.message === 'decode') throw e;
    }
  }
  const { blob, w, h } = await shrink(file, 720, 0.6),
    src = await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(String(fr.result).split(',')[1]);
      fr.readAsDataURL(blob);
    });
  return { src, w, h };
}
function photoUrl(p) {
  if (p.aid) return '/_blob/' + p.aid;
  if (PHO.urls[p.id]) return PHO.urls[p.id];
  try {
    const bin = atob(p.src || ''),
      u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return (PHO.urls[p.id] = URL.createObjectURL(new Blob([u8], { type: 'image/jpeg' })));
  } catch (e) {
    return '';
  }
}
async function loadPhotos() {
  if (PHO.list || PHO.busy) return;
  PHO.busy = true;
  try {
    const [mine, cl] = await Promise.all([
      Store.list('photos'),
      Store.owner !== false ? Store.list('clphotos') : Promise.resolve([]),
    ]);
    PHO.list = mine.sort((a, b) => (a.d < b.d ? 1 : -1));
    PHO.cl = cl.sort((a, b) => (a.d < b.d ? 1 : -1));
  } catch (e) {
    PHO.list = PHO.list || [];
    PHO.cl = PHO.cl || [];
  }
  PHO.busy = false;
  if ($('#phBody')) renderPhotos();
  else if ($('#ccBody')) renderClient();
  else if (!sheets.length) render();
}
const kgAt = d => {
  const w = P.wts.filter(x => x.d <= d);
  return w.length ? w[w.length - 1].kg : null;
};
/* whose photos a screen is showing: mine, or one client's in coach view */
function photoSet(cid) {
  if (!cid) return PHO.list || [];
  const c = getClient(cid);
  if (!c) return [];
  if (c.kind === 'me') return (PHO.list || []).filter(p => p.sh);
  if (c.kind === 'live') return ((LIVE[c.uid] || {}).ph || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
  return (PHO.cl || []).filter(p => p.cid === cid);
}
const photoTile = (p, cid) =>
  `<button class="pht" data-act="phView" data-id="${p.id}" data-cid="${cid || ''}"><img alt="${POSES[p.pose] || 'Photo'}, ${niceDate(p.d)}" loading="lazy" src="${photoUrl(p)}"><span><b>${niceDate(p.d)}</b>${POSES[p.pose] || ''}${p.sh && !cid ? ' · shared' : ''}</span></button>`;
function photoGrid(cid, limit) {
  const ps = photoSet(cid);
  return ps.length
    ? `<div class="phg">${ps
        .slice(0, limit || 60)
        .map(p => photoTile(p, cid))
        .join('')}</div>`
    : '';
}

A.photos = () => {
  openSheet(`${sh('Progress photos')}<div class="sheet-b" id="phBody"></div>`, true);
  renderPhotos();
  loadPhotos();
};
function renderPhotos() {
  const b = $('#phBody');
  if (!b) return;
  const ps = PHO.list;
  b.innerHTML = `<button class="btn ember" data-act="phAdd">${ic('camera')} Take or choose a photo</button>
    ${!ps ? `<div class="busy"><div class="spinner"></div>Loading your photos</div>` : ps.length ? `${ps.length > 1 ? `<button class="btn ghost" data-act="phCompare" data-id="${ps[0].id}">${ic('swap')} Compare first and latest</button>` : ''}${photoGrid('')}` : `<p class="empty" style="text-align:center;padding:24px 8px">No photos yet. Same spot, same light, same time of day makes the changes easy to see. Every two weeks is plenty.</p>`}
    <p class="tiny muted">${ic('lock')} Photos are private to you. Open one and turn on sharing to let your coach see it.</p>`;
}
A.phAdd = ({ cid }) => {
  PHO.pend = { cid: cid || '' };
  $('#fileProg').click();
};
$('#fileProg').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f && PHO.pend) phNew(f);
});
let PN = null;
function phNew(file) {
  PN = { file, cid: PHO.pend.cid, pose: 'front', sh: false };
  const url = URL.createObjectURL(file);
  openSheet(`${sh('New progress photo')}<div class="sheet-b"><img class="phprev" alt="The photo you picked" src="${url}">
    ${segHtml('phPose', Object.entries(POSES), 'front')}<label class="f">Date<input class="inp" type="date" id="phD" value="${today()}" max="${today()}"></label>
    ${PN.cid ? '' : `<button class="chk" data-act="phShareNew" aria-pressed="false"><span class="tb"></span><span>Let my coach see this one</span></button>`}</div>
    <div class="sheet-f"><button class="btn ember" data-act="phSave" id="phGoBtn">Save photo</button></div>`);
  SEG.phPose = v => {
    PN.pose = v;
  };
  sheets[sheets.length - 1]._onClose = () => URL.revokeObjectURL(url);
}
A.phShareNew = (_, el) => {
  PN.sh = !PN.sh;
  el.setAttribute('aria-pressed', PN.sh);
  el.querySelector('.tb').innerHTML = PN.sh ? ic('check') : '';
};
A.phSave = async () => {
  const d = $('#phD').value || today(),
    btn = $('#phGoBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const st = await photoStore(PN.file),
      id = newId(),
      doc = { id, d, pose: PN.pose, ...st, ...(PN.cid ? { cid: PN.cid } : { kg: kgAt(d), sh: PN.sh }) };
    Store.put(PN.cid ? 'clphotos' : 'photos', id, doc);
    const key = PN.cid ? 'cl' : 'list';
    PHO[key] = [doc].concat(PHO[key] || []).sort((a, b) => (a.d < b.d ? 1 : -1));
    const first = !PN.cid && PHO.list.length === 1;
    closeSheet();
    if (!PN.cid) {
      P.st.photos = (P.st.photos || 0) + 1;
      grant(10, 0, null, 'Progress photo');
      saveProfile();
      if (doc.sh) sharePhotos();
    }
    if ($('#phBody')) renderPhotos();
    if ($('#ccBody')) renderClient();
    render();
    if (first) toast('First one saved. Take the next in two weeks.');
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Save photo';
    toast('That photo could not be saved. Try a different one.');
  }
};
/* a live client's shared photos travel in their status, so only their coach can read them */
function sharePhotos() {
  lastPub = 0;
  publishStatus();
}
const sharedPhotos = () =>
  (PHO.list || [])
    .filter(p => p.sh && p.aid)
    .slice(0, 12)
    .map(p => ({ id: p.id, d: p.d, pose: p.pose, kg: p.kg ?? null, aid: p.aid, w: p.w, h: p.h }));
let PV = null;
A.phView = ({ id, cid }) => {
  const ps = photoSet(cid),
    p = ps.find(x => x.id === id);
  if (!p) return;
  PV = { id, cid: cid || '' };
  const c = cid ? getClient(cid) : null,
    mine = !cid,
    coachOwned = c && c.kind === 'manual';
  openSheet(
    `${sh(niceDate(p.d))}<div class="sheet-b"><img class="phbig" alt="${POSES[p.pose] || 'Photo'}" src="${photoUrl(p)}"><div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill">${POSES[p.pose] || 'Photo'}</span>${p.kg ? `<span class="pill">${p.kg} kg</span>` : ''}${p.sh && mine ? `<span class="pill good">Shared with your coach</span>` : ''}</div>
    ${ps.length > 1 ? `<button class="btn" data-act="phCompare" data-id="${id}" data-cid="${cid || ''}">${ic('swap')} Compare with another</button>` : ''}
    ${mine ? `<button class="btn ghost" data-act="phShare">${ic(p.sh ? 'lock' : 'users')} ${p.sh ? 'Stop sharing with my coach' : 'Share with my coach'}</button>` : ''}
    ${mine || coachOwned ? `<button class="link" data-act="phDel" style="color:var(--bad);align-self:center">Delete this photo</button>` : ''}</div>`,
    true,
  );
};
A.phShare = () => {
  const p = PHO.list.find(x => x.id === PV.id);
  if (!p) return;
  p.sh = !p.sh;
  Store.put('photos', p.id, p);
  sharePhotos();
  closeSheet();
  if ($('#phBody')) renderPhotos();
  toast(p.sh ? 'Your coach can now see this photo' : 'No longer shared');
};
A.phDel = async () => {
  const key = PV.cid ? 'cl' : 'list',
    p = (PHO[key] || []).find(x => x.id === PV.id);
  if (!p) return;
  PHO[key] = PHO[key].filter(x => x.id !== p.id);
  Store.del(PV.cid ? 'clphotos' : 'photos', p.id);
  if (p.aid) {
    const a = await assetStore();
    if (a) a.delete(p.aid).catch(() => {});
  }
  if (p.sh) sharePhotos();
  closeSheet();
  if ($('#phBody')) renderPhotos();
  if ($('#ccBody')) renderClient();
  render();
  toast('Photo deleted');
};
/* before and after, with a slider that wipes between them */
let CMP = null;
A.phCompare = ({ id, cid }) => {
  const ps = photoSet(cid),
    after = ps.find(x => x.id === id) || ps[0];
  if (!after || ps.length < 2) return;
  const older = ps.filter(x => x.id !== after.id),
    same = older.filter(x => x.pose === after.pose),
    before = (same.length ? same : older)[(same.length ? same : older).length - 1];
  CMP = { cid: cid || '', a: before.id, b: after.id };
  openSheet(`${sh('Before and after')}<div class="sheet-b" id="cmpBody"></div>`, true);
  renderCmp();
};
function renderCmp() {
  const b = $('#cmpBody');
  if (!b || !CMP) return;
  const ps = photoSet(CMP.cid);
  let A1 = ps.find(x => x.id === CMP.a),
    B1 = ps.find(x => x.id === CMP.b);
  if (!A1 || !B1) return;
  if (A1.d > B1.d) [A1, B1] = [B1, A1];
  const days = Math.round((pdate(B1.d) - pdate(A1.d)) / 864e5),
    dk = A1.kg && B1.kg ? r1(B1.kg - A1.kg) : null;
  b.innerHTML = `<div class="cmp"><img alt="After, ${niceDate(B1.d)}" src="${photoUrl(B1)}"><img id="cmpTop" alt="Before, ${niceDate(A1.d)}" src="${photoUrl(A1)}" style="clip-path:inset(0 50% 0 0)"><i id="cmpBar" style="left:50%"></i><span class="l">Before</span><span class="r">After</span></div>
    <input type="range" min="0" max="100" value="50" data-on="cmp" aria-label="Slide between before and after">
    <div class="stat4"><div class="stat"><div class="num" style="font-size:18px">${niceDate(A1.d)}</div><span>${A1.kg ? A1.kg + ' kg' : POSES[A1.pose] || 'Before'}</span></div><div class="stat"><div class="num" style="font-size:18px">${niceDate(B1.d)}</div><span>${B1.kg ? B1.kg + ' kg' : POSES[B1.pose] || 'After'}</span></div></div>
    <p class="small muted">${days} day${days === 1 ? '' : 's'} apart${dk != null ? ', ' + (dk === 0 ? 'the same weight' : Math.abs(dk) + ' kg ' + (dk < 0 ? 'lighter' : 'heavier')) : ''}.</p>
    <div class="rail-w"><div class="rail-h"><h2>Pick the two to compare</h2></div><div class="rail">${ps.map(p => `<button class="pht sm ${p.id === CMP.a || p.id === CMP.b ? 'on' : ''}" data-act="cmpPick" data-id="${p.id}"><img alt="${niceDate(p.d)}" src="${photoUrl(p)}"><span><b>${niceDate(p.d)}</b></span></button>`).join('')}</div></div>`;
}
I.cmp = el => {
  const v = +el.value;
  $('#cmpTop').style.clipPath = `inset(0 ${100 - v}% 0 0)`;
  $('#cmpBar').style.left = v + '%';
};
A.cmpPick = ({ id }) => {
  if (id === CMP.a || id === CMP.b) return;
  CMP.a = CMP.b;
  CMP.b = id;
  renderCmp();
};
/* cards for other screens */
function photoCard() {
  if (!PHO.list) {
    loadPhotos();
    return `<section class="card"><div class="between"><h2>Progress photos</h2><button class="link" data-act="photos">Open</button></div><p class="empty">Loading…</p></section>`;
  }
  const ps = PHO.list,
    last = ps[0],
    gap = last ? Math.round((pdate(today()) - pdate(last.d)) / 864e5) : null;
  return `<section class="card stack"><div class="between"><h2>Progress photos</h2><button class="link" data-act="photos">${ps.length ? 'See all ' + ps.length : 'Start'}</button></div>
    ${
      ps.length
        ? `<div class="phg">${ps
            .slice(0, 3)
            .map(p => photoTile(p, ''))
            .join(
              '',
            )}</div><p class="small muted">${gap === 0 ? 'Latest taken today.' : 'Latest taken ' + gap + ' day' + (gap === 1 ? '' : 's') + ' ago.'}${gap >= 14 ? ' Time for the next one.' : ''}</p>`
        : `<p class="small muted">The scale misses a lot. A photo every two weeks shows what the trend line cannot.</p>`
    }
    <button class="btn sm ${ps.length && gap < 14 ? 'ghost' : ''}" data-act="phAdd" style="align-self:flex-start">${ic('camera')} Add a photo</button></section>`;
}
function clientPhotos(c) {
  if (!PHO.list && !PHO.busy) loadPhotos();
  const ps = photoSet(c.id),
    first = c.name.split(' ')[0];
  const note =
    c.kind === 'me'
      ? 'Only photos you marked as shared in your own view appear here.'
      : c.kind === 'live'
        ? first + ' chooses which photos to share with you.'
        : c.kind === 'sample'
          ? 'Sample clients have no photos.'
          : 'Photos you add for ' + first + ' stay in your account.';
  return `${c.kind === 'manual' ? `<button class="btn ember" data-act="phAdd" data-cid="${c.id}">${ic('camera')} Add a photo of ${esc(first)}</button>` : ''}
    ${ps.length > 1 ? `<button class="btn ghost" data-act="phCompare" data-id="${ps[0].id}" data-cid="${c.id}">${ic('swap')} Compare first and latest</button>` : ''}
    ${photoGrid(c.id) || `<p class="empty" style="text-align:center;padding:20px 8px">No photos here yet.</p>`}<p class="tiny muted">${ic('lock')} ${esc(note)}</p>`;
}
