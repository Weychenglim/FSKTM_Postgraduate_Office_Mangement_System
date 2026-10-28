import assert from 'node:assert/strict';
import test from 'node:test';
import {appointmentMarkingShortcut,parseAppointmentMarkingTarget,appointmentMarkingRoute} from './appointmentMarking';
import type {EvaluationTask} from '../types';
const task:EvaluationTask={id:1,studentId:'PG1',studentName:'Student',initials:'S',researchTitle:'Research',semester:'S1',deadline:'',status:'NOT STARTED',evaluatorRole:'SUPERVISOR',canEdit:true,taskLifecycleStatus:'ACTIVE'};
test('Shortcut is exact to student and marking responsibility and respects edit/lifecycle permissions',()=>{
  assert.equal(appointmentMarkingShortcut([task],'OTHER','SUPERVISOR'),null);
  assert.equal(appointmentMarkingShortcut([task],'PG1','PANEL'),null);
  assert.equal(appointmentMarkingShortcut([task],'PG1','SUPERVISOR')?.label,'Enter marks');
  assert.equal(appointmentMarkingShortcut([{...task,status:'DRAFT SAVED'}],'PG1','SUPERVISOR')?.label,'Continue marking');
  assert.equal(appointmentMarkingShortcut([{...task,canEdit:false}],'PG1','SUPERVISOR')?.label,'View marking task');
  assert.equal(appointmentMarkingShortcut([{...task,taskLifecycleStatus:'RETIRED'}],'PG1','SUPERVISOR'),null);
  assert.equal(appointmentMarkingShortcut([{...task,status:'SUBMITTED',taskLifecycleStatus:'RETIRED'}],'PG1','SUPERVISOR')?.label,'View submitted marks');
  assert.equal(appointmentMarkingShortcut([task,{...task,id:2}],'PG1','SUPERVISOR')?.target.taskId,undefined);
});
test('Encoded links preserve the exact task, student and role; malformed links cannot select a task',()=>{
  const target={studentId:'PG / 1',role:'PANEL' as const,taskId:9};
  assert.deepEqual(parseAppointmentMarkingTarget(appointmentMarkingRoute(target).split('?')[1]),target);
  assert.equal(parseAppointmentMarkingTarget('?student=PG1&role=ADMIN&task=9'),null);
  assert.equal(parseAppointmentMarkingTarget('?role=PANEL&task=9'),null);
  assert.equal(parseAppointmentMarkingTarget('?student=PG1&role=PANEL&task=-1'),null);
});
