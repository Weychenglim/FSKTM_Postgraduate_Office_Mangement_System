# Supervisor capacity reservations and capacity-full closure

Approved in chat on 27 October 2026: reserve the final place on primary Supervisor acceptance, preserve other requests until final approval, then close unaccepted requests whose own effective policy is full. The user requested five further critiques including UI, followed by implementation.

## Behaviour

- A submitted primary request does not reserve a place. Primary requests awaiting Coordinator approval reserve one place globally against the proposed Supervisor's workload, alongside active primary and supporting appointments. Existing accepted requests count too; never silently reject these during rollout.
- Acceptance checks current capacity/eligibility under existing policy/Student/request/Lecturer locks. Two acceptances cannot promise the same place. Rejection/cancellation releases a reservation through its status transition. Final approval excludes that request's reservation and converts it to active load atomically.
- Other workflows that create Supervisor workload, candidate directories, publication minimums, reports and capacity previews must respect these reservations without counting them as active students.
- After a final primary or supporting approval, automatically close only unaccepted primary requests to that same Lecturer whose own effective published policy has active load at or above its limit. Do not close accepted reservations, requests governed by a higher limit, archived requests or requests without usable policy. Preserve incumbent appointments for replacements.
- Use terminal `CANCELLED_CAPACITY_FULL`, existing cancellation reason/time, and `SYSTEM_CLOSE_CAPACITY` audit action. The actor identifies the triggering authorized approver; actor role/display identifies the automatic system action. Notifications explain capacity, never fabricate personal rejection or reveal competing students.
- Preserve authorization, Coordinator authority, reassessment, lifecycle/history, privacy and stale-stage guards. Students can cancel ordinary unaccepted requests and apply elsewhere; Office-origin replacement restrictions remain.

## API contract

Add optional `activeLoad`, `reservedLoad`, `pendingRequests` to existing capacity metadata/candidate/workload payloads. `currentStudents` remains active students; `workloadCount` is active plus reserved; `availableSlots` subtracts both.

Primary request/detail and Student application payloads expose `acceptanceCapacity` for ongoing requests (null for terminal): `{activeLoad:number,reservedLoad:number,limit:number|null,availableSlots:number,pendingRequests:number,state:string}`. This uses the request's effective semester policy, not a module-wide active-semester approximation. Counts disclose no other student's identity or private unavailability reason. Capacity alone does not grant review permission.

## UI

Reuse portal typography, colors, forms, decision dialogs and navigation. No new tab or generic explanation card. Existing Supervisory load card distinguishes active/reserved/available. Request detail exposes current capacity beside actions; accepting the last place explains reservation and final approval, including other waiting requests when known. A capacity block disables Accept only, keeping Reject available and explaining recovery. Student ongoing request explains when the final place is reserved elsewhere and offers the existing cancellation flow. Candidate availability separates active students from reserved places, and says submission does not reserve a place. Capacity-full outcomes are neutral, clearly system generated, in History with a route to start another eligible request.

## Verification

Failing-first API/service tests for reservation, duplicate/competing acceptance, own-reservation conversion, release, shared supporting load, publication, closure/notification/audit, policy scope and authorization. Frontend behaviour and browser tests for counts, last-place confirmation, blocked acceptance with rejection/cancellation preserved, closure/history and small screens. Run affected backend suites, frontend regressions, TypeScript/build, Django checks/migration drift and visual QA. All records used for verification are disposable; do not mutate live academic records or apply a migration to the development database without need.
