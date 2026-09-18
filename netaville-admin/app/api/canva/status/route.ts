import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {canvaStatus} from '@/lib/canva';

/** Whether Canva is set up and linked — drives the buttons in the slide editor. */
export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  return NextResponse.json(await canvaStatus());
}
