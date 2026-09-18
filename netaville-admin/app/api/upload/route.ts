import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const ALLOWED: Record<string, {ext: string; kind: 'image' | 'video'}> = {
  'image/png': {ext: 'png', kind: 'image'},
  'image/jpeg': {ext: 'jpg', kind: 'image'},
  'image/webp': {ext: 'webp', kind: 'image'},
  'image/gif': {ext: 'gif', kind: 'image'},
  'image/svg+xml': {ext: 'svg', kind: 'image'},
  'video/mp4': {ext: 'mp4', kind: 'video'},
};

/** Slide artwork — a still or an .mp4. Files land in public/uploads, served statically. */
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

  const kind = ALLOWED[file.type];
  if (kind === undefined) {
    return NextResponse.json(
      {error: 'PNG, JPEG, WebP, GIF, SVG or MP4 only.'},
      {status: 415},
    );
  }
  const limit =
    kind.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return NextResponse.json(
      {
        error: `That ${kind.kind} is over the ${Math.round(limit / 1024 / 1024)}MB limit.`,
      },
      {status: 413},
    );
  }

  // A generated name, never the uploaded one: the client's filename is
  // untrusted and could otherwise escape the directory.
  const name = `${randomUUID()}.${kind.ext}`;
  const directory = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(directory, {recursive: true});
  await writeFile(
    path.join(directory, name),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json(
    {url: `/uploads/${name}`, kind: kind.kind},
    {status: 201},
  );
}
