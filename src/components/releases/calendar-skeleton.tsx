/** Placeholder shapes that match the real layout, so nothing jumps when data lands. */
const bar = "animate-pulse rounded bg-surface-2";

export function MonthHeaderSkeleton() {
  return (
    <div>
      <div className={`h-3 w-28 ${bar}`} />
      <div className={`mt-4 h-11 w-56 sm:h-16 sm:w-80 ${bar}`} />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="mt-8 sm:mt-10">
      <div className="flex items-end gap-5 sm:gap-8">
        <div className={`aspect-[3/4] w-[118px] rounded-[4px] xs:w-[136px] sm:w-48 ${bar}`} />
        <div className="flex-1 space-y-3 pb-1">
          <div className={`h-3 w-32 ${bar}`} />
          <div className={`h-8 w-3/4 sm:h-12 ${bar}`} />
          <div className={`h-3 w-40 ${bar}`} />
        </div>
      </div>

      <div className={`mt-10 h-10 w-full rounded-full sm:w-96 ${bar}`} />

      {[0, 1].map((g) => (
        <div key={g} className="mt-8">
          <div className={`h-8 w-24 ${bar}`} />
          {[0, 1, 2].map((r) => (
            <div key={r} className="flex items-center gap-3.5 border-b border-neutral-800/50 py-3">
              <div className={`aspect-[3/4] w-14 rounded-[3px] ${bar}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-2/3 ${bar}`} />
                <div className={`h-3 w-1/3 ${bar}`} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
