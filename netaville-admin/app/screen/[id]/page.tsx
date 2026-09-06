import {buildScreenFeed} from '@/lib/feed';
import {ScreenPlayer} from './ScreenPlayer';

export const metadata = {title: 'Netaville screen'};
export const dynamic = 'force-dynamic';

/**
 * What the physical TV opens fullscreen. No chrome, no auth: the screen is a
 * kiosk, and everything on it is public signage. The feed is rendered on the
 * server so the wall never shows a loading state on boot.
 */
export default async function ScreenPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  const feed = await buildScreenFeed(id);

  if (feed === null) {
    return (
      <div className="screen-stage grid h-screen w-screen place-items-center bg-[#0b0a1f] text-white">
        <p className="text-[34px] font-medium text-white/50">
          This screen is not registered.
        </p>
      </div>
    );
  }

  return <ScreenPlayer screenId={id} initialFeed={feed} />;
}
