import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {clearCanvaConnection, logActivity} from '@/lib/store';

/** Drops the stored Canva connection. Designs already exported keep working. */
export async function POST() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  await clearCanvaConnection();
  await logActivity('screen', `${gate.user.name} disconnected Canva`);
  return NextResponse.json({ok: true});
}
