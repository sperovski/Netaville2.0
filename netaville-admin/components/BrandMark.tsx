/** The Netaville mark, simplified to the tiles the logo is built from. */
export function BrandMark({size = 28}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="0" y="0" width="15" height="15" rx="2" fill="#17B9DF" />
      <rect x="17" y="0" width="15" height="15" rx="2" fill="#F5B301" />
      <rect x="0" y="17" width="15" height="15" rx="2" fill="#2B1FC9" />
      <rect x="17" y="17" width="15" height="15" rx="2" fill="#F26A57" />
      <circle cx="16" cy="16" r="5" fill="#241F6B" />
    </svg>
  );
}
