export type PixelIconName =
  | "feed"
  | "games"
  | "clean"
  | "status"
  | "bag"
  | "social"
  | "shop"
  | "settings"
  | "sync"
  | "offline"
  | "warning"
  | "coin"
  | "heart"
  | "health"
  | "sleep"
  | "gift"
  | "evolution"
  | "cloud";
export function PixelIcon({
  name,
  label,
  className = "",
}: {
  name: PixelIconName;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={`pixel-icon ${className}`}
      role={label ? "img" : "presentation"}
      aria-label={label}
    >
      <use href={`${import.meta.env.BASE_URL}pixel-icon-sheet.svg#${name}`} />
    </svg>
  );
}
