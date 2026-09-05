import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Slide artwork. Files land in public/uploads and are served statically. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({error: 'Attach a file.'}, {status: 400});
  }

  const extension = ALLOWED[file.type];
  if (extension === undefined) {
    return NextResponse.json(
      {error: 'Images only: PNG, JPEG, WebP, GIF or SVG.'},
      {status: 415},
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {error: 'That image is over the 8MB limit.'},
      {status: 413},
    );
  }

  // A generated name, never the uploaded one: the client's filename is
  // untrusted and could otherwise escape the directory.
  const name = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(directory, {recursive: true});
  await writeFile(
    path.join(directory, name),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json({url: `/uploads/${name}`}, {status: 201});
}
