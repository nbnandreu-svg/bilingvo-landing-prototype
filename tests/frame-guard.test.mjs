import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../frame-guard.js', import.meta.url), 'utf8');
function run(window) {
  let display = 'none';
  const site = { style: { removeProperty(name) { assert.equal(name, 'display'); display = ''; } } };
  vm.runInNewContext(source, { window, document: { getElementById: () => site } });
  return display;
}
test('top-level page becomes visible', () => {
  const top = {};
  assert.equal(run({ self: top, top }), '');
});
test('any iframe stays hidden, including nested or same-origin frames', () => {
  assert.equal(run({ self: {}, top: {} }), 'none');
});
test('denied access to top fails closed without navigating parent', () => {
  assert.equal(run({ self: {}, get top() { throw new Error('denied'); } }), 'none');
});
