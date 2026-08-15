import Image from "next/image";

export function Logo({
  size = 22,
  showWordmark = true,
  className = "",
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        priority
        className="shrink-0 select-none"
        style={{ width: size, height: size }}
      />
      {showWordmark ? (
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-rule">
          longhand
        </span>
      ) : null}
    </span>
  );
}
