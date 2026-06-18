import { PROGRAMME_OPTIONS } from './programmes';

const expectedProgrammes = [
  'MASTER OF DATA SCIENCE (COURSEWORK)',
  'MASTER OF CYBER SECURITY (COURSEWORK)',
  'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
];

if (JSON.stringify(PROGRAMME_OPTIONS) !== JSON.stringify(expectedProgrammes)) {
  throw new Error(`Programme options do not match the approved system list: ${PROGRAMME_OPTIONS.join(', ')}`);
}

if (new Set(PROGRAMME_OPTIONS).size !== PROGRAMME_OPTIONS.length) {
  throw new Error('Programme options must not contain duplicates.');
}

