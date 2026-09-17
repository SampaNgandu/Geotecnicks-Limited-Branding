import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("enquiry handler produces an encoded email and cancels browser submission", async () => {
  const values = new Map([['name', 'Test & Person'], ['email', 'person@example.com'], ['service', 'Geotechnical Services'], ['details', 'First line\nSecond line & question?']]);
  let submit;
  let prevented = false;
  let valid = false;
  const form = {
    hidden: true,
    querySelector() { return { options: [], selectedOptions: [{ textContent: 'Geotechnical Services' }] }; },
    addEventListener(event, handler) { if (event === 'submit') submit = handler; },
    reportValidity() { return valid; },
  };
  const window = { location: { href: '' } };
  runInNewContext(await readFile(new URL('../src/assets/site.js', import.meta.url), 'utf8'), {
    document: { querySelector: selector => selector === '#enquiry-form' ? form : null, querySelectorAll: () => [] },
    window,
    URLSearchParams,
    FormData: class { get(key) { return values.get(key); } },
  });
  assert.equal(form.hidden, false);
  submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(window.location.href, '');
  valid = true;
  submit({ preventDefault() {} });
  const url = new URL(window.location.href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'geotecnicks.limited@gmail.com');
  assert.equal(url.searchParams.get('subject'), 'Website enquiry — Geotechnical Services');
  assert.match(url.searchParams.get('body'), /Name: Test & Person/);
  assert.match(url.searchParams.get('body'), /Company \/ organisation: Not provided/);
  assert.match(url.searchParams.get('body'), /First line\nSecond line & question\?/);
});
