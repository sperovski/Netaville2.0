import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {CanvaError, exportDesign, type CanvaExportFormat} from '@/lib/canva';

const MAX_BYTES = 60 * 1024 * 1024;

/**
 * POST {designId, format} → exports the Canva design, downloads it, and saves
 * it into public/uploads (the same place ImageUploader writes to). Returns the
 * served URL; the caller drops it onto the slide as imageUrl or videoUrl.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    designId?: unknown;
    format?: unknown;
  };
  const designId =
    typeof body.designId === 'string' ? body.designId.trim() : '';
  const format: CanvaExportFormat =
    body.format === 'mp4' ? 'mp4' : 'png';
  if (designId.length === 0) {
    return NextResponse.json({error: 'designId is required.'}, {status: 400});
  }

  let downloadUrls: string[];
  try {
    downloadUrls = await exportDesign(designId, format);
  } catch (caught) {
    if (caught instanceof CanvaError) {
      return NextResponse.json(
        {error: caught.message},
        {status: caught.status},
      );
    }
    return NextResponse.json({error: 'Could not reach Canva.'}, {status: 502});
  }

  const source = await fetch(downloadUrls[0]!);
  if (!source.ok) {
    return NextResponse.json(
      {error: 'Canva returned the export but the download failed.'},
      {status: 502},
    );
  }
  const bytes = Buffer.from(await source.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json(
      {error: 'That export is larger than the 60MB limit.'},
      {status: 413},
    );
  }

  const name = `${randomUUID()}.${format === 'mp4' ? 'mp4' : 'png'}`;
  const directory = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(directory, {recursive: true});
  await writeFile(path.join(directory, name), bytes);

  return NextResponse.json(
    {url: `/uploads/${name}`, kind: format === 'mp4' ? 'video' : 'image'},
    {status: 201},
  );
}
