import assert from 'node:assert/strict';
import { PROGRAMME_OPTIONS } from '../constants/programmes';
import { parseStudentCsv, splitCsvLine, normaliseProgramme, readyRows } from './csvImport';

const header = 'student_id,full_name,programme,email,phone';
const good = `WGA1,Aisyah Rahman,${PROGRAMME_OPTIONS[0]},a@um.edu.my,012-1`;

// ── splitting ────────────────────────────────────────────────────────────────
assert.deepEqual(splitCsvLine('a,b,c'), ['a', 'b', 'c']);
assert.deepEqual(splitCsvLine('a,"b,with comma",c'), ['a', 'b,with comma', 'c']);
assert.deepEqual(splitCsvLine('a,"say ""hi""",c'), ['a', 'say "hi"', 'c']);
assert.deepEqual(splitCsvLine(' a , b '), ['a', 'b']);

// ── programme normalisation ──────────────────────────────────────────────────
assert.equal(normaliseProgramme(PROGRAMME_OPTIONS[1].toLowerCase()), PROGRAMME_OPTIONS[1]);
assert.equal(normaliseProgramme('PhD (CS)'), null);
assert.equal(normaliseProgramme(''), null);

// ── fatal cases ──────────────────────────────────────────────────────────────
assert.match(parseStudentCsv('').fatal ?? '', /empty/i);
assert.match(parseStudentCsv('name,email\nx,y').fatal ?? '', /missing required column/i);
assert.match(parseStudentCsv(header).fatal ?? '', /no student rows/i);

// ── the happy path ───────────────────────────────────────────────────────────
{
  const { rows, fatal } = parseStudentCsv(`${header}\n${good}`);
  assert.equal(fatal, null);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'Ready');
  assert.equal(rows[0].programme, PROGRAMME_OPTIONS[0]);
  assert.equal(rows[0].id, 'WGA1');
}

// ── every row actually comes from the file, not from a fixture ───────────────
{
  const { rows } = parseStudentCsv(`${header}\n${good}\nWGA2,Chan Li,${PROGRAMME_OPTIONS[2]},b@um.edu.my,012-2`);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.name), ['Aisyah Rahman', 'Chan Li']);
  // Guard against the previous behaviour of staging hardcoded demo people.
  assert.ok(!rows.some((r) => /Ahmad Bin Daud|Sarah Tan|John Doe|Jane Smith/.test(r.name)));
}

// ── validation, with no silent auto-correction ───────────────────────────────
{
  const { rows } = parseStudentCsv(
    [
      header,
      `WGA1,Aisyah,${PROGRAMME_OPTIONS[0]},,012-1`,
      `WGA2,Budi,${PROGRAMME_OPTIONS[0]},not-an-email,012-2`,
      'WGA3,Chandra,PhD (CS),c@um.edu.my,012-3',
      `,Nameless,${PROGRAMME_OPTIONS[0]},d@um.edu.my,012-4`,
      `WGA1,Duplicate Id,${PROGRAMME_OPTIONS[0]},e@um.edu.my,012-5`,
    ].join('\n'),
  );
  assert.deepEqual(
    rows.map((r) => r.status),
    ['Missing Email', 'Missing Email', 'Bad Programme', 'Missing Field', 'Duplicate In File'],
  );
  // No invented identity anywhere.
  assert.equal(rows[0].email, '');
  assert.equal(rows[4].id, 'WGA1');
  assert.equal(readyRows(rows).length, 0);
  assert.match(rows[4].issue, /line 2/);
}

// ── duplicate detection is case-insensitive, matching the backend ────────────
{
  const { rows } = parseStudentCsv(
    `${header}\n${good}\nwga1,Other Person,${PROGRAMME_OPTIONS[0]},z@um.edu.my,012-9`,
  );
  assert.equal(rows[1].status, 'Duplicate In File');
}

console.log('csv import tests passed');
