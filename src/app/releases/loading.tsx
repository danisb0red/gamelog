import { CalendarSkeleton, MonthHeaderSkeleton } from "@/components/releases/calendar-skeleton";

/** Without this, navigating here would flash the root (home) skeleton. */
export default function ReleasesLoading() {
  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:pt-14">
        <MonthHeaderSkeleton />
        <CalendarSkeleton />
      </div>
    </main>
  );
}
