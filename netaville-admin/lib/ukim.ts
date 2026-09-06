/**
 * Who counts as a student.
 *
 * UKIM issues every student an address in the university's domain, so the
 * address is the enrolment check — there is no separate roster to reconcile
 * and no verification queue for an admin to work through.
 *
 * The app checks this too, for the error message. This copy is the one that
 * decides: the app runs on a device the student controls, and the identity
 * headers it sends are not yet signed, so the server cannot take its word.
 *
 * Accepted: the university root and anything under it, which is how the
 * faculties are organised (students.finki.ukim.mk, pmf.ukim.mk, …), plus the
 * `ukim.edu.mk` form some departments use.
 */
const ROOTS = ['ukim.mk', 'ukim.edu.mk'] as const;

export function isUkimEmail(email: string): boolean {
  const normalised = email.trim().toLowerCase();
  const at = normalised.lastIndexOf('@');
  if (at === -1) {
    return false;
  }
  const domain = normalised.slice(at + 1);
  // `domain === root` or a real subdomain of it — a bare endsWith would also
  // accept notukim.mk, which is a different university entirely.
  return ROOTS.some(root => domain === root || domain.endsWith(`.${root}`));
}
