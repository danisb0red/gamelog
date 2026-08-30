import Link from "next/link";
import { STATUSES, STATUS_LABEL, STATUS_HEX, type Status } from "@/lib/status";

/** Status filter pills for a profile's game library, with per-status counts. */
export function StatusTabs({
  username,
  active,
  counts,
  platform = "",
}: {
  username: string;
  active: string; // "all" | Status
  counts: Record<string, number>;
  platform?: string; // preserved across tab clicks
}) {
  const platformQS = platform ? `platform=${encodeURIComponent(platform)}` : "";
  const hrefFor = (statusParam?: Status) => {
    const parts = [statusParam ? `status=${statusParam}` : "", platformQS].filter(Boolean);
    return parts.length ? `/u/${username}?${parts.join("&")}` : `/u/${username}`;
  };

  const tabs: { key: string; label: string; href: string }[] = [
    { key: "all", label: "All", href: hrefFor() },
    ...STATUSES.map((s: Status) => ({
      key: s,
      label: STATUS_LABEL[s],
      href: hrefFor(s),
    })),
  ];

  /**
   * A hairline baseline with the active entry underlined in its own status
   * colour, letting the colour language do the work instead of a filled chip.
   */
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-800/70 pb-0">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const isAll = t.key === "all";
        const count = isAll ? counts.all : (counts[t.key] ?? 0);
        const hex = isAll ? "#ff7a6b" : STATUS_HEX[t.key as Status];

        return (
          <Link
            key={t.key}
            href={t.href}
            className={`group relative flex items-center gap-2 pb-2.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
              isActive ? "text-neutral-100" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {!isAll && (
              <span
                className="h-[6px] w-[6px] transition-opacity"
                style={{ background: hex, opacity: isActive ? 1 : 0.45 }}
                aria-hidden
              />
            )}
            {t.label}
            <span className="tabular-nums text-neutral-400">{count}</span>

            {/* Active underline, coloured by the status it selects. */}
            <span
              className="absolute inset-x-0 -bottom-px h-0.5 transition-opacity"
              style={{ background: hex, opacity: isActive ? 1 : 0 }}
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
