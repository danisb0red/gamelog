import { STATUSES, STATUS_HEX, STATUS_LABEL, type Status } from "@/lib/status";

type StatGame = {
  status: string;
  rating: string | null;
  loggedAt: Date;
};

/**
 * The collection readout.
 *
 * Deliberately not a row of metric cards — that's the dashboard reflex this
 * redesign is trying to escape. Instead: oversized display numerals with tiny
 * mono captions, then a single segmented meter showing the shape of the whole
 * collection at a glance. You should be able to tell a completionist from a
 * hoarder from six feet away, without reading a number.
 */
export function StatStrip({ games }: { games: StatGame[] }) {
  const total = games.length;

  const counts = {} as Record<Status, number>;
  for (const s of STATUSES) counts[s] = 0;
  for (const g of games) {
    if ((STATUSES as readonly string[]).includes(g.status)) counts[g.status as Status]++;
  }

  const rated = games.filter((g) => g.rating != null).map((g) => Number(g.rating));
  const avg = rated.length
    ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1)
    : "—";

  const thisYear = new Date().getFullYear();
  const loggedThisYear = games.filter(
    (g) => new Date(g.loggedAt).getFullYear() === thisYear,
  ).length;

  const stats = [
    { value: String(total), caption: "logged" },
    { value: String(counts.finished), caption: "finished" },
    { value: String(counts.backlog), caption: "in backlog" },
    { value: avg, caption: "avg rating" },
    { value: String(loggedThisYear), caption: `in ${thisYear}` },
  ];

  return (
    <section className="py-8">
      <span className="hud-label">Collection</span>

      <div className="mt-5 flex flex-wrap gap-x-12 gap-y-6">
        {stats.map((s) => (
          <div key={s.caption}>
            <p className="font-display text-4xl font-semibold leading-none tracking-tight text-neutral-100 sm:text-5xl">
              {s.value}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500">
              {s.caption}
            </p>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="mt-8">
          <div className="meter">
            {STATUSES.map((s) =>
              counts[s] > 0 ? (
                <span
                  key={s}
                  style={{
                    width: `${(counts[s] / total) * 100}%`,
                    background: STATUS_HEX[s],
                  }}
                  title={`${STATUS_LABEL[s]}: ${counts[s]}`}
                />
              ) : null,
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {STATUSES.filter((s) => counts[s] > 0).map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500"
              >
                <span
                  className="h-[6px] w-[6px]"
                  style={{ background: STATUS_HEX[s] }}
                />
                {STATUS_LABEL[s].toLowerCase()}
                <span className="text-neutral-400">{counts[s]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
