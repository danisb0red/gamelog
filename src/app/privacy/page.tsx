import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: "What GameLog stores about you, who else handles it, and how to have it deleted.",
  path: "/privacy",
});

const UPDATED = "7 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold tracking-tight text-neutral-100">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-neutral-300">{children}</div>
    </section>
  );
}

const list = "list-disc space-y-1.5 pl-5 marker:text-neutral-600";

export default function PrivacyPage() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-10 sm:pt-16">
      <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-50">Privacy policy</h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500">
        Last updated {UPDATED}
      </p>
      <p className="mt-6 text-[15px] leading-relaxed text-neutral-300">
        GameLog is a small project run by one person. This page says what it keeps about you and
        who else touches that data. There is no advertising on the site and nothing here is sold.
      </p>

      <Section title="What GameLog stores">
        <ul className={list}>
          <li>
            <strong className="font-medium text-neutral-100">Your account:</strong> your email address
            and a password. The password is stored only as a hash by the sign-in service; I can&apos;t
            read it.
          </li>
          <li>
            <strong className="font-medium text-neutral-100">Your profile:</strong> the name and handle
            you chose.
          </li>
          <li>
            <strong className="font-medium text-neutral-100">What you log:</strong> games with their
            status, rating, review, platform and date, plus your lists, favourites and wishlist.
          </li>
          <li>
            <strong className="font-medium text-neutral-100">A calendar link,</strong> if you make one.
            Only a hash of it is kept.
          </li>
        </ul>
      </Section>

      <Section title="What other people can see">
        <p>
          Your name, handle, shelf, diary, lists, favourites, wishlist and reviews are visible to
          anyone who has the link to your profile. I ask search engines not to list profile pages, but
          that is a request, not a lock. Your email address is never shown.
        </p>
        <p>
          Your calendar link is private, but anyone who has it can see the release dates of the
          games on your wishlist and backlog. If you share it by accident, generate a new one and the
          old one stops working.
        </p>
      </Section>

      <Section title="Who else handles your data">
        <ul className={list}>
          <li>
            <strong className="font-medium text-neutral-100">Supabase</strong> runs sign-in and the
            database. The data is stored in Singapore.
          </li>
          <li>
            <strong className="font-medium text-neutral-100">Vercel</strong> hosts the site. Like any
            host, it sees your IP address and the pages you request.
          </li>
          <li>
            <strong className="font-medium text-neutral-100">IGDB</strong> supplies game information
            and cover art. Cover images load straight from IGDB&apos;s image servers, so they can see your
            IP address the way any site serving an image can.
          </li>
        </ul>
        <p>
          GameLog counts page views with Vercel Web Analytics, which sets no cookies and does not
          follow you across other sites. There are no advertising trackers on GameLog.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          One set of cookies keeps you signed in. There are no tracking or advertising cookies.
        </p>
      </Section>

      <Section title="Getting your data deleted or exported">
        <p>
          You can ask for your account and everything in it to be deleted, or for a copy of your
          data. I&apos;ll do it within 30 days.{" "}
          {contact ? (
            <>
              Email{" "}
              <a href={`mailto:${contact}`} className="text-neutral-50 underline underline-offset-4">
                {contact}
              </a>{" "}
              from the address you signed up with.
            </>
          ) : (
            <>Ask by replying to wherever you found the link to GameLog.</>
          )}
        </p>
      </Section>

      <Section title="Age">
        <p>GameLog isn&apos;t meant for children under 13.</p>
      </Section>

      <Section title="Changes">
        <p>
          If this changes in a way that matters, I&apos;ll say so here and the date at the top will
          change.
        </p>
      </Section>
    </main>
  );
}
