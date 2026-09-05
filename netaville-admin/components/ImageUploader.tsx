'use client';

import {useRef, useState} from 'react';
import Image from 'next/image';
import {Button} from './Button';
import {Label} from './Field';

type Props = {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
};

/** Posts to /api/upload and hands back the served URL. */
export function ImageUploader({value, onChange, label = 'Image'}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/upload', {method: 'POST', body});
      const data = (await response.json()) as {url?: string; error?: string};
      if (!response.ok || data.url === undefined) {
        setError(data.error ?? 'That upload failed.');
        return;
      }
      onChange(data.url);
    } catch {
      setError('That upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div className="relative grid h-24 w-40 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-page">
          {value === undefined ? (
            <span className="text-[11px] uppercase tracking-wider text-dim">
              No image
            </span>
          ) : (
            <Image
              src={value}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
              unoptimized
            />
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file !== undefined) {
                void upload(file);
              }
              event.target.value = '';
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => input.current?.click()}>
              {busy ? 'Uploading…' : value === undefined ? 'Upload' : 'Replace'}
            </Button>
            {value === undefined ? null : (
              <Button
                type="button"
                size="sm"
                variant="quiet"
                onClick={() => onChange(undefined)}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-[12px] text-muted">PNG, JPEG, WebP or SVG, 8MB max.</p>
          {error === null ? null : (
            <p className="text-[12px] text-coral-ink">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
