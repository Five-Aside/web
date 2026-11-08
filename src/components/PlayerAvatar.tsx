type PlayerAvatarProps = {
  id: string;
  name: string;
  photoPath?: string | null;
  size?: "sm" | "md";
  className?: string;
};

export function PlayerAvatar({
  id,
  name,
  photoPath,
  size = "md",
  className = "",
}: PlayerAvatarProps) {
  const dim = size === "sm" ? "size-7" : "size-9";
  const font = size === "sm" ? "text-xs" : "text-sm";
  const initial = (name.trim()[0] || "?").toUpperCase();

  if (photoPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatars/${id}?t=${encodeURIComponent(photoPath)}`}
        alt=""
        className={`${dim} shrink-0 object-cover ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center border border-line bg-pitch-lift ${font} font-semibold text-muted ${className}`.trim()}
      aria-hidden
    >
      {initial}
    </span>
  );
}
