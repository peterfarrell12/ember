// Unit tests for the phone-app helpers. No device needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isNative, tokensFrom, NATIVE_SIGNIN_URL } from '../src/app/native.js';

test('in a browser the app does not think it is the phone app', () => {
  assert.equal(isNative(), false);
  globalThis.Capacitor = { isNativePlatform: () => true };
  assert.equal(isNative(), true);
  delete globalThis.Capacitor;
});

test('a sign-in link that opens the app yields its session tokens', () => {
  assert.deepEqual(
    tokensFrom(
      NATIVE_SIGNIN_URL + '#access_token=AAA&expires_in=3600&refresh_token=RRR&token_type=bearer&type=magiclink',
    ),
    { access_token: 'AAA', refresh_token: 'RRR' },
  );
  assert.deepEqual(tokensFrom(NATIVE_SIGNIN_URL + '/?x=1#access_token=AAA&refresh_token=RRR'), {
    access_token: 'AAA',
    refresh_token: 'RRR',
  });
});

test('an expired link reports its error; anything else is not treated as a sign-in link', () => {
  assert.deepEqual(
    tokensFrom(
      NATIVE_SIGNIN_URL +
        '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    ),
    { error: 'Email link is invalid or has expired' },
  );
  assert.deepEqual(tokensFrom(NATIVE_SIGNIN_URL + '#access_token=AAA'), { error: 'missing' });
  assert.equal(tokensFrom('ie.ember.app://other#access_token=AAA&refresh_token=RRR'), null);
  assert.equal(tokensFrom('https://evil.example/#access_token=AAA&refresh_token=RRR'), null);
  assert.equal(tokensFrom(undefined), null);
});
