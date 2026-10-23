import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata: Metadata = pageMetadata({
  title: "Suggestions and issues",
  description: "Tell the person who makes GameLog what's broken, confusing or missing.",
  path: "/feedback",
});

export default function FeedbackPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-10 sm:pt-16">
      <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-50">
        Suggestions, issues, anything
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-neutral-300">
        GameLog is a passion project. One person makes it, there are no ads, nothing is sold, and
        I&apos;m not trying to make money from it. If something is broken, confusing or missing, or
        you just have an idea, tell me. I read all of it.
      </p>

      <div className="mt-8">
        <FeedbackForm />
      </div>
    </main>
  );
}
