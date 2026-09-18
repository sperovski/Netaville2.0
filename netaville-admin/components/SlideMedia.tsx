'use client';

import {useEffect, useRef, useState} from 'react';
import {Button} from './Button';
import {Label} from './Field';

type Patch = {
  imageUrl?: string;
  videoUrl?: string;
  canvaDesignId?: string;
};

type Props = {
  label: string;
  imageUrl?: string;
  videoUrl?: string;
  canvaDesignId?: string;
  /** Used as the Canva design's title when one is created. */
  designTitle: string;
  onChange: (patch: Patch) => void;
};

type CanvaStatus = {
  configured: boolean;
  connected: boolean;
  connectedBy: string | null;
};

/**
 * The artwork picker for poster and commercial slides: upload a still or an
 * .mp4, or design one in Canva and pull the export straight back in. A slide
 * carries an image or a video, never both, so setting one clears the other.
 */
export function SlideMedia({
  label,
  imageUrl,
  videoUrl,
  canvaDesignId,
  designTitle,
  onChange,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'upload' | 'design' | 'import'>(null);
  const [error, setError] = useState<string | null>(null);
  const [importAs, setImportAs] = useState<'png' | 'mp4'>('png');
  const [canva, setCanva] = useState<CanvaStatus | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/canva/status')
      .then(response => (response.ok ? response.json() : null))
      .then((data: CanvaStatus | null) => {
        if (live) {
          setCanva(data);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const upload = async (file: File) => {
    setBusy('upload');
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/upload', {method: 'POST', body});
      const data = (await response.json()) as {
        url?: string;
        kind?: 'image' | 'video';
        error?: string;
      };
      if (!response.ok || data.url === undefined) {
        setError(data.error ?? 'That upload failed.');
        return;
      }
      onChange(
        data.kind === 'video'
          ? {videoUrl: data.url, imageUrl: undefined}
          : {imageUrl: data.url, videoUrl: undefined},
      );
    } catch {
      setError('That upload failed.');
    } finally {
      setBusy(null);
    }
  };

  const openInCanva = async (create: boolean) => {
    setBusy('design');
    setError(null);
    try {
      let designId = canvaDesignId;
      let editUrl: string | undefined;

      if (create || designId === undefined) {
        const response = await fetch('/api/canva/designs', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({title: designTitle}),
        });
        const data = (await response.json()) as {
          designId?: string;
          editUrl?: string;
          error?: string;
        };
        if (!response.ok || data.designId === undefined) {
          setError(data.error ?? 'Could not create the Canva design.');
          return;
        }
        designId = data.designId;
        editUrl = data.editUrl;
        onChange({canvaDesignId: designId});
      } else {
        const response = await fetch(
          `/api/canva/designs?designId=${encodeURIComponent(designId)}`,
        );
        const data = (await response.json()) as {
          editUrl?: string;
          error?: string;
        };
        if (!response.ok || data.editUrl === undefined) {
          setError(data.error ?? 'Could not open the Canva design.');
          return;
        }
        editUrl = data.editUrl;
      }

      window.open(editUrl, '_blank', 'noopener');
    } catch {
      setError('Could not reach Canva.');
    } finally {
      setBusy(null);
    }
  };

  const importFromCanva = async () => {
    if (canvaDesignId === undefined) {
      return;
    }
    setBusy('import');
    setError(null);
    try {
      const response = await fetch('/api/canva/exports', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({designId: canvaDesignId, format: importAs}),
      });
      const data = (await response.json()) as {
        url?: string;
        kind?: 'image' | 'video';
        error?: string;
      };
      if (!response.ok || data.url === undefined) {
        setError(data.error ?? 'The Canva import failed.');
        return;
      }
      onChange(
        data.kind === 'video'
          ? {videoUrl: data.url, imageUrl: undefined}
          : {imageUrl: data.url, videoUrl: undefined},
      );
    } catch {
      setError('Could not reach Canva.');
    } finally {
      setBusy(null);
    }
  };

  const hasArtwork = imageUrl !== undefined || videoUrl !== undefined;

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div className="relative grid h-24 w-40 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-page">
          {videoUrl !== undefined ? (
            <video
              src={videoUrl}
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : imageUrl !== undefined ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[11px] uppercase tracking-wider text-dim">
              No artwork
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file !== undefined) {
                void upload(file);
              }
              event.target.value = '';
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => input.current?.click()}>
              {busy === 'upload'
                ? 'Uploading…'
                : hasArtwork
                  ? 'Replace file'
                  : 'Upload file'}
            </Button>
            {hasArtwork ? (
              <Button
                type="button"
                size="sm"
                variant="quiet"
                disabled={busy !== null}
                onClick={() =>
                  onChange({imageUrl: undefined, videoUrl: undefined})
                }>
                Remove
              </Button>
            ) : null}
          </div>

          <p className="text-[12px] text-muted">
            PNG, JPEG, WebP, SVG (8MB) or MP4 (60MB).
          </p>

          {canva?.configured ? (
            <div className="space-y-2 rounded-control border border-brand-edge bg-brand-tint/40 p-3">
              {!canva.connected ? (
                <>
                  <p className="text-[12.5px] font-semibold text-ink">
                    Design posters and video ads in Canva
                  </p>
                  <a
                    href="/api/canva/connect"
                    className="inline-block rounded-control bg-brand px-3 py-1.5 text-[12.5px] font-bold text-on-brand">
                    Connect Canva
                  </a>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => void openInCanva(canvaDesignId === undefined)}>
                      {busy === 'design'
                        ? 'Opening…'
                        : canvaDesignId === undefined
                          ? 'Design in Canva'
                          : 'Open in Canva'}
                    </Button>
                    {canvaDesignId === undefined ? null : (
                      <>
                        <select
                          value={importAs}
                          onChange={event =>
                            setImportAs(event.target.value as 'png' | 'mp4')
                          }
                          className="rounded-control border border-line bg-surface px-2 py-1.5 text-[12.5px] font-semibold text-ink">
                          <option value="png">as image</option>
                          <option value="mp4">as video</option>
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy !== null}
                          onClick={() => void importFromCanva()}>
                          {busy === 'import' ? 'Importing…' : 'Bring in artwork'}
                        </Button>
                      </>
                    )}
                  </div>
                  {canvaDesignId === undefined ? (
                    <p className="text-[11.5px] text-muted">
                      Opens a blank 1920×1080 canvas. Design it, then import it
                      back here.
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-muted">
                      Linked to a Canva design. Edit it there, then bring the
                      latest version in.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}

          {error === null ? null : (
            <p className="text-[12px] text-coral-ink">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
