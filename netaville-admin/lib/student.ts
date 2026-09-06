import {NextResponse} from 'next/server';
import {createStudent, logActivity, touchUser, userByEmail, userById} from './store';
import {isUkimEmail} from './ukim';
import type {User} from './types';

/**
 * Identifies the student behind a call from the mobile app.
 *
 * The app signs in with the student's UKIM Microsoft account and sends that
 * account's id, name and email on every request. Nothing verifies the headers
 * themselves yet — this is the same dev-grade posture as ADMIN_DEV_PASSWORD in
 * lib/auth.ts, and it is spoofable by anyone who can reach the server. When the
 * real token verification lands, verify the bearer token here and return the
 * user it resolves to; every route below keeps working because they only ever
 * see the resolved `User`.
 *
 * The UKIM domain check below runs regardless, and is the reason the app can
 * treat "signed in" and "verified student" as the same thing.
 */
export const STUDENT_ID_HEADER = 'x-netaville-student-id';
export const STUDENT_NAME_HEADER = 'x-netaville-student-name';
export const STUDENT_EMAIL_HEADER = 'x-netaville-student-email';

type Gate = {user: User} | {response: NextResponse};

/**
 * Resolves the caller, creating their record the first time they appear.
 *
 * A student exists in the panel the moment they open the app, which is what
 * makes the admin's student list the real roster rather than a fixture.
 */
export async function requireStudent(request: Request): Promise<Gate> {
  const id = request.headers.get(STUDENT_ID_HEADER)?.trim();
  if (id === undefined || id.length === 0) {
    return {
      response: NextResponse.json({error: 'Sign in first.'}, {status: 401}),
    };
  }

  const email = request.headers.get(STUDENT_EMAIL_HEADER)?.trim() ?? '';
  const name = request.headers.get(STUDENT_NAME_HEADER)?.trim() ?? email;

  // The enrolment check. The app refuses a non-UKIM account before it gets
  // here, but that check runs on the student's own device — this is the one
  // that counts, and it runs before any record is created.
  if (!isUkimEmail(email)) {
    return {
      response: NextResponse.json(
        {error: 'Netaville is for UKIM students. Sign in with your ukim.mk address.'},
        {status: 403},
      ),
    };
  }

  // Match on the Google id first, then on email: a student seeded by hand in
  // the panel should be claimed by their account rather than duplicated.
  const existing =
    (await userById(id)) ?? (email.length > 0 ? await userByEmail(email) : null);

  if (existing !== null) {
    if (!existing.active) {
      return {
        response: NextResponse.json(
          {error: 'This account has been deactivated.'},
          {status: 403},
        ),
      };
    }
    // Seeing them is what keeps them online; presence is read back from this.
    await touchUser(existing.id);
    return {user: {...existing, online: true, lastSeen: new Date().toISOString()}};
  }

  const created = await createStudent({
    id,
    name: name.length > 0 ? name : 'New student',
    email,
  });
  await logActivity('auth', `${created.name} opened the app for the first time`);
  return {user: created};
}
