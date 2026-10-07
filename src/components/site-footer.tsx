import Link from "next/link";

/**
 * Sitewide footer: the data credit and the privacy link, which until now were
 * nowhere on the site. Sits inside the layout's padded wrapper, so on a phone it
 * clears the fixed tab bar like everything else.
 */
export function SiteFooter() {
  return (
    <footer className="relative z-[2] mt-auto border-t border-neutral-800/60 px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-neutral-500">
        <p>
          Game data from{" "}
          <a
            href="https://www.igdb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-neutral-200"
          >
            IGDB
          </a>
        </p>
        <Link href="/privacy" className="underline underline-offset-4 transition-colors hover:text-neutral-200">
          Privacy
        </Link>
      </div>
      <p className="mx-auto mt-3 max-w-6xl text-[12px] leading-relaxed text-neutral-500">
        Not affiliated with any game publisher or platform. Game names and artwork belong to their owners.
      </p>
    </footer>
  );
}
