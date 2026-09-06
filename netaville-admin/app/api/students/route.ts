import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {listStudents} from '@/lib/store';

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  const search = new URL(request.url).searchParams.get('q') ?? '';
  return NextResponse.json({students: await listStudents(search)});
}
