import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {CanvaError, createTvDesign, designEditUrl} from '@/lib/canva';

/** GET ?designId= → the current edit URL for a design already made here. */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  const designId = new URL(request.url).searchParams.get('designId');
  if (designId === null || designId.length === 0) {
    return NextResponse.json({error: 'designId is required.'}, {status: 400});
  }
  try {
    return NextResponse.json({editUrl: await designEditUrl(designId)});
  } catch (caught) {
    return canvaFailure(caught);
  }
}

/** POST {title} → a fresh blank 1920×1080 design to open in Canva. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  const body = (await request.json().catch(() => ({}))) as {title?: unknown};
  const title =
    typeof body.title === 'string' && body.title.trim().length > 0
      ? body.title.trim()
      : 'Netaville TV slide';

  try {
    const design = await createTvDesign(title);
    return NextResponse.json(
      {designId: design.id, editUrl: design.editUrl},
      {status: 201},
    );
  } catch (caught) {
    return canvaFailure(caught);
  }
}

function canvaFailure(caught: unknown) {
  if (caught instanceof CanvaError) {
    return NextResponse.json({error: caught.message}, {status: caught.status});
  }
  return NextResponse.json({error: 'Could not reach Canva.'}, {status: 502});
}
