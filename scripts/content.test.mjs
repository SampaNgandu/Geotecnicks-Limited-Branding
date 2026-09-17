import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateContent } from './content.mjs';
import { services } from '../src/data/services.mjs';
import { projects } from '../src/data/projects.mjs';
import { expertise } from '../src/data/expertise.mjs';

const currentContent = { services, projects, expertise };
const fixture = () => structuredClone(currentContent);
const invalid = (change, expected) => {
  const content = fixture();
  change(content);
  assert.throws(() => validateContent(content), expected);
};

test('the current content is valid and validation does not modify it', () => {
  const content = fixture();
  assert.equal(validateContent(content), content);
  assert.deepEqual(content, currentContent);
});

test('compatibility modules export exactly the editable JSON arrays', async () => {
  for (const name of ['services', 'projects', 'expertise']) {
    const text = await readFile(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8');
    assert.deepEqual(currentContent[name], JSON.parse(text));
  }
});

test('additional valid content is accepted', () => {
  const content = fixture();
  content.services.push({ ...structuredClone(services[0]), slug: 'field-review', title: 'Field review' });
  content.projects.push({ ...projects[0], title: 'New mine review', year: '2026' });
  content.expertise.push('Core logging');
  assert.doesNotThrow(() => validateContent(content));
});

test('required schemas reject missing fields, unknown fields and non-objects', () => {
  assert.throws(() => validateContent(null), /content must be an object/);
  invalid((value) => { delete value.services; }, /content\.services is required/);
  invalid((value) => { value.hidden = []; }, /content\.hidden is not a supported field/);
  invalid((value) => { value.services[0] = null; }, /services\[0\] must be an object/);
  invalid((value) => { delete value.services[0].summary; }, /services\[0\]\.summary is required/);
  invalid((value) => { value.projects[0].url = 'https://example.com'; }, /projects\[0\]\.url is not a supported field/);
  invalid((value) => { value.expertise[0] = { title: 'Mapping' }; }, /expertise\[0\] must be a nonempty string/);
});

test('all content collections must have entries and stay within their limits', () => {
  for (const [name, maximum] of [['services', 50], ['projects', 250], ['expertise', 100]]) {
    invalid((value) => { value[name] = {}; }, new RegExp(`${name} must be an array`));
    invalid((value) => { value[name] = []; }, new RegExp(`${name} must contain between 1 and ${maximum} entries`));
    invalid((value) => { value[name] = Array(maximum + 1).fill(value[name][0]); }, new RegExp(`${name} must contain between 1 and ${maximum} entries`));
  }
});

test('required strings reject blanks, wrong types and oversized text', () => {
  invalid((value) => { value.services[0].title = ' \n '; }, /services\[0\]\.title must be a nonempty string/);
  invalid((value) => { value.projects[0].partner = false; }, /projects\[0\]\.partner must be a nonempty string/);
  invalid((value) => { value.services[0].summary = 'a'.repeat(2001); }, /services\[0\]\.summary must be at most 2000 characters/);
  invalid((value) => { value.expertise[0] = 'a'.repeat(201); }, /expertise\[0\] must be at most 200 characters/);
});

test('service slugs are safe unique route fragments', () => {
  for (const slug of ['Geotechnical', 'two--hyphens', '-prefix', 'suffix-', '../mining', 'has space']) {
    invalid((value) => { value.services[0].slug = slug; }, /services\[0\]\.slug must use lowercase letters or digits separated by single hyphens/);
  }
  invalid((value) => { value.services[1].slug = value.services[0].slug; }, /services\[1\]\.slug must be unique/);
});

test('duplicate titles and expertise are rejected regardless of case or padding', () => {
  invalid((value) => { value.services[1].title = ` ${value.services[0].title.toUpperCase()} `; }, /services\[1\]\.title must be unique/);
  invalid((value) => { value.projects[1].title = value.projects[0].title.toUpperCase(); }, /projects\[1\]\.title must be unique/);
  invalid((value) => { value.expertise[1] = value.expertise[0].toUpperCase(); }, /expertise\[1\] must be unique/);
});

test('service details are nonempty lists of exactly two strings', () => {
  invalid((value) => { value.services[0].details = []; }, /services\[0\]\.details must contain between 1 and 30 entries/);
  for (const detail of ['Label', ['Label'], ['Label', 'Description', 'Extra'], { label: 'Label' }]) {
    invalid((value) => { value.services[0].details[0] = detail; }, /services\[0\]\.details\[0\] must be a two-item array/);
  }
  invalid((value) => { value.services[0].details[0][1] = ''; }, /services\[0\]\.details\[0\]\[1\] must be a nonempty string/);
  invalid((value) => { value.services[0].deliverables = []; }, /services\[0\]\.deliverables must contain between 1 and 30 entries/);
  invalid((value) => { value.services[0].deliverables[0] = ''; }, /services\[0\]\.deliverables\[0\] must be a nonempty string/);
});

test('project years and categories have stable display and filter values', () => {
  for (const year of [2026, 'abc', '20x6', ' 202', '20260']) {
    invalid((value) => { value.projects[0].year = year; }, /projects\[0\]\.year must be/);
  }
  for (const category of ['mining', 'General', 'Geotechnical ']) {
    invalid((value) => { value.projects[0].category = category; }, /projects\[0\]\.category must be Mining or Geotechnical/);
  }
});

test('excluded service words cannot reappear in any public string field', () => {
  const changes = [
    (value) => { value.services[0].slug = 'construction-services'; },
    (value) => { value.services[0].title = 'Environmental consultancy'; },
    (value) => { value.services[0].tagline = 'CONSTRUCTION'; },
    (value) => { value.services[0].summary = 'Environmental field review'; },
    (value) => { value.services[0].details[0][0] = 'Construction'; },
    (value) => { value.services[0].details[0][1] = 'Environmental work'; },
    (value) => { value.services[0].deliverables[0] = 'Construction report'; },
    (value) => { value.projects[0].title = 'Construction project'; },
    (value) => { value.projects[0].year = 'construction'; },
    (value) => { value.projects[0].category = 'Environmental'; },
    (value) => { value.projects[0].scope = 'Environmental support'; },
    (value) => { value.projects[0].partner = 'Construction partner'; },
    (value) => { value.expertise[0] = 'Environmental consultancy'; },
  ];
  for (const change of changes) {
    invalid(change, /Invalid site content:/);
  }
});
