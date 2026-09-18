import {TvClient} from './TvClient';

export const metadata = {title: 'Netaville TV'};
export const dynamic = 'force-dynamic';

/**
 * The one URL a physical screen ever opens: `<panel host>/tv`.
 *
 * There is nothing to render on the server — the device's identity lives in
 * its own storage, not in a path — so this is a thin shell around the client
 * that enrols itself, holds its token, and plays.
 */
export default function TvPage() {
  return <TvClient />;
}
