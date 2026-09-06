/**
 * Who counts as a student.
 *
 * Netaville is for UKIM, and the faculty already issues every student an
 * address in the university's domain — so the address *is* the enrolment
 * check, and there is no separate verification step to build or to staff.
 *
 * Accepted: the university root and anything under it, which is how the
 * faculties are organised (students.finki.ukim.mk, pmf.ukim.mk, …), plus the
 * `ukim.edu.mk` form that some departments use.
 *
 * This runs on the phone for the error message, and again on the server in
 * netaville-admin/lib/student.ts, which is the one that actually decides. A
 * check that only exists in the client is a suggestion, not a rule.
 */
const ROOTS = ['ukim.mk', 'ukim.edu.mk'] as const;

export function isUkimEmail(email: string): boolean {
  const at = email.trim().toLowerCase().lastIndexOf('@');
  if (at === -1) {
    return false;
  }
  const domain = email
    .trim()
    .toLowerCase()
    .slice(at + 1);
  // `endsWith('.' + root)` and not a bare `endsWith(root)`: the latter would
  // also accept notukim.mk, which is a different university entirely.
  return ROOTS.some(root => domain === root || domain.endsWith(`.${root}`));
}

/** What the sign-in screen shows when a non-UKIM account comes back. */
export const UKIM_REJECTION =
  'Netaville is for UKIM students. Sign in with your university address — the one ending in ukim.mk.';
