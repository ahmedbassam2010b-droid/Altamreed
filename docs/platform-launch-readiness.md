# Platform launch readiness — 2026-11-28

This document separates code that exists from functionality that is actually ready to advertise. A GitHub merge does not publish Firestore rules or configure Cloudflare/Firebase settings.

## Portals currently present in the repository

- Main student portal: existing email/password and Google authentication, student dashboard, curriculum, library, exams, community and gamification pages.
- Teacher portal: teacher-code authentication; academy identity; classes/groups; subjects; invitation codes; student list; content publishing; teacher-created draft MCQ exams; grades; student self-check-in attendance log; community posts; private messages/notifications; scheduled live-session records.
- Academy student portal: unified student login; joining an academy with an invitation code; active membership listing; attendance self-check-in; academy content; grades; private messages/notifications.
- Public academy landing page and wildcard-subdomain Worker route are present in the repository.

## Important gaps — do not advertise these as finished

1. **Teacher exams are not a complete student exam workflow.** The teacher UI currently creates a single-question MCQ draft. There is no student-side exam-taking/submission experience in the academy student portal, and there is no secure published answer-key / grading flow. Do not expose correct answers in a student-readable exam document.
2. **Live classes are scheduling only.** Real-time audio/video, screen sharing, recording, and reliable large-room streaming are not implemented. They require a separately engineered and tested media service.
3. **Large file hosting is not implemented.** The current teacher/student attachment path stores small data URLs in Firestore and enforces a small size limit. Do not advertise large uploads or video hosting.
4. **Cloudflare wildcard routing is infrastructure-dependent.** Confirm the wildcard DNS record, Worker deployment, and *.bawabet-altamreed.com/* route in the live Cloudflare account. Verify the root domain still serves the main site.
5. **Firestore rules require manual deployment.** Review and publish the repository firestore.rules in Firebase Console. GitHub Pages deployment does not publish Firestore rules.
6. **End-to-end role testing remains required.** Test a normal student, an active teacher, an expired/suspended teacher, a student linked to two teachers, a student with an inactive membership, and a non-admin attempting admin-only actions.
7. **Teacher/academy authentication and subdomain return paths need live testing.** Confirm login redirects preserve the intended academy, and that a student account can access multiple teacher academies without losing the main student portal session.

## Verification checklist before public launch

- [ ] GitHub Pages deployment completes and the production root domain loads.
- [ ] Main student email/password and Google login, email verification, logout, password reset, and existing accounts work.
- [ ] Teacher code/password login works; inactive, suspended, not-yet-started, and expired subscriptions are rejected.
- [ ] Admin create/disable/renew teacher workflow works and each academy slug is unique.
- [ ] Teacher can create classes, groups, subjects, invitations, content, grades, posts, messages, and scheduled sessions.
- [ ] Students can join more than one academy, only see active memberships, self-check-in once per Cairo calendar day, and view their own content/grades/messages.
- [ ] Firestore rules block cross-tenant reads/writes and student access to teacher/admin-only records.
- [ ] Wildcard academy URLs and public profile reads work on the live domain.
- [ ] Mobile layouts, keyboard navigation, loading/error/empty states, and all page links are checked on a real phone.
- [ ] Privacy, terms, contact, about, FAQ, and founder pages are reachable.
- [ ] Curriculum content is imported only after the platform workflows pass; no placeholder curriculum is presented as real content.

## Work included in this branch

- Three clear entry points from the home page.
- Collapsible teacher and academy-student navigation.
- Responsive styling polish and shared official footer on both academy dashboards.
- Academy student list now filters to active memberships and offers a shortcut to the teacher's public academy page.

**Release status: not yet launch-certified.** The remaining items above require implementation, configuration, or real-account testing; this file intentionally avoids treating code presence as proof of production readiness.

## Academy exams — implementation added in this branch

- Teachers can build an exam with multiple MCQ questions and four options per question.
- Correct-answer indexes are stored in a separate private collection, not in the student-readable exam document.
- Teachers can publish a draft to its academy class.
- Active academy students can view published exams, answer them, and submit once.
- Teachers can inspect submitted answers and manually assign a grade and feedback.
- Students can see the grade and teacher feedback after grading.
- Firestore rules restrict answer-key reads to the owning active teacher/admin, constrain student submissions to the student's own active academy membership, and limit grading updates to the owning teacher.

**Grading limitation:** grading is currently teacher-reviewed/manual. Fully automatic grading requires a trusted server-side function so the answer key is never delivered to student browsers. A client-side auto-grader would expose the key and is intentionally not used.

## Scheduled live meetings — improvement added

- Teachers can attach an HTTPS Google Meet / Zoom meeting link to a scheduled lesson.
- Students can see the scheduled meeting in their academy portal and open the external meeting link.
- This is an external meeting integration, not native in-platform video streaming. The app does not provide SFU/TURN, recording, screen-sharing controls, or capacity guarantees.

## Automated validation

A GitHub Actions workflow now runs JavaScript ES-module syntax checks for repository JavaScript files on pushes and pull requests. This is a syntax gate only; it does not replace Firestore Emulator security tests, live authentication tests, or phone/browser end-to-end tests.

## Remaining launch blockers after these additions

- [ ] Confirm the new GitHub Actions syntax workflow passes on this PR.
- [ ] Run Firestore Emulator tests for cross-tenant isolation and all role combinations; publish reviewed rules in Firebase Console only after passing.
- [ ] Test exam authoring, publishing, one-time student submission, manual grading, and student result visibility using separate teacher/student test accounts.
- [ ] Verify external meeting links on mobile and desktop.
- [ ] For native live video, choose and configure a compliant media provider / SFU and TURN service; this is not included in the current no-cost code.
- [ ] For large uploads, provision an object-storage provider and access policy. The current small Firestore attachment cap remains; do not store large files or video data in Firestore.
