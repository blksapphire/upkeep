import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, CATEGORY_IDS, TEMPLATES, categoryLabel, templateById } from './templates.js';

test('templates are unique and fully populated', () => {
  const ids = TEMPLATES.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const template of TEMPLATES) {
    assert.ok(template.title.trim().length > 0);
    assert.ok(CATEGORY_IDS.includes(template.category), `${template.id} has a known category`);
    assert.ok(template.leadDays >= 0 && template.leadDays <= 730, `${template.id} lead is in range`);
    assert.ok(
      template.intervalMonths === null || (template.intervalMonths >= 1 && template.intervalMonths <= 120),
      `${template.id} interval is in range`
    );
  }
});

test('the passport template uses a six-month warning window', () => {
  const passport = templateById('passport');
  assert.equal(passport.leadDays, 180);
  assert.equal(passport.category, 'documents');
  assert.equal(templateById('nope'), null);
});

test('categories are labelled and unknown ids fall back safely', () => {
  assert.equal(CATEGORIES.length, 5);
  assert.equal(categoryLabel('money'), 'Money & cover');
  assert.equal(categoryLabel('nope'), 'Other');
});
