import {NextResponse} from 'next/server';
import {readSession} from '@/lib/auth';

export async function GET() {
  const user = await readSession();
  if (user === null) {
    return NextResponse.json({error: 'Admins only.'}, {status: 401});
  }
  return NextResponse.json({user});
}
