import assert from 'node:assert/strict';
import * as management from './marksProductionManagement';
import type { MarksAssignmentStudentOption } from '../types';

assert.equal(typeof management.getMarksAssignmentStudents, 'function', 'Backup selection needs period programme targeting without research-semester exclusion.');
const students: MarksAssignmentStudentOption[] = [
  {studentId:'AI1',studentName:'Historical profile',programme:' Programme A ',semester:'Previous semester',researchTitle:'A',supervisorName:'Supervisor'},
  {studentId:'AI2',studentName:'Current profile',programme:'programme a',semester:'Current semester',researchTitle:'B',supervisorName:'Supervisor'},
  {studentId:'DS1',studentName:'Different programme',programme:'Programme B',semester:'Current semester',researchTitle:'C',supervisorName:'Supervisor'},
  {studentId:'BLANK',studentName:'Blank programme',programme:'',semester:'Current semester',researchTitle:'D',supervisorName:'Supervisor'},
];
const targeted = {semester:'Current semester',programmeScope:'SELECTED' as const,programmes:['PROGRAMME A']};
assert.deepEqual(management.getMarksAssignmentStudents(students,targeted).map(row=>row.studentId),['AI1','AI2']);
assert.deepEqual(management.getMarksAssignmentStudents(students,{...targeted,programmes:['Programme B']}).map(row=>row.studentId),['DS1']);
assert.deepEqual(management.getMarksAssignmentStudents(students,{...targeted,programmes:[]}),[]);
assert.deepEqual(management.getMarksAssignmentStudents(students,{programmeScope:'ALL'}),students);
assert.deepEqual(management.getMarksAssignmentStudents(students,{}),students);
assert.deepEqual(management.getMarksAssignmentStudents(students,undefined),[]);
console.log('Marks assignment programme targeting and cross-semester students passed');
