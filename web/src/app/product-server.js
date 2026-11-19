// @ts-check
// The app's side of the `product` server function: look a barcode up when the lists shipped with the app
// do not have it. Returns the product's per-100 figures, null when nobody knows the barcode, or
// 'unreachable' when the lookup could not be done just now.

/**
 * @param {{ url: string, key: string, token: () => Promise<string | undefined>, fetch?: typeof fetch }} access
 * @param {string} barcode
 */
export async function lookupBarcode(access, barcode) {
  const send = access.fetch || ((...a) => fetch(...a));
  try {
    const token = await access.token();
    if (!token) return 'unreachable';
    const res = await send(access.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, apikey: access.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode }),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok || !out) return 'unreachable';
    return out.found === true ? out : null;
  } catch (e) {
    return 'unreachable';
  }
}
