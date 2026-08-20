"use client";

import { useActionState } from "react";
import { sendFeedback, type FeedbackState } from "@/app/actions/feedback";

const initial: FeedbackState | undefined = undefined;

export function FeedbackForm() {
  const [state, action, pending] = useActionState(sendFeedback, initial);

  if (state?.ok) {
    return (
      <p className="mt-6 font-serif text-[15.5px] leading-[1.72] text-ink">
        Received. Thank you — this is how the room gets quieter.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 max-w-xl">
      <fieldset className="space-y-2">
        <legend className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          This is
        </legend>
        <label className="flex items-center gap-2 font-serif text-[15px] text-ink">
          <input type="radio" name="kind" value="ISSUE" defaultChecked />
          Something broken
        </label>
        <label className="flex items-center gap-2 font-serif text-[15px] text-ink">
          <input type="radio" name="kind" value="IDEA" />
          An idea
        </label>
        <label className="flex items-center gap-2 font-serif text-[15px] text-ink">
          <input type="radio" name="kind" value="OTHER" />
          Other
        </label>
      </fieldset>

      <label className="mt-5 block">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          I was trying to
        </span>
        <input
          name="doing"
          placeholder="Dictate a note, search, sign in…"
          className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] text-ink placeholder:text-ink-3"
        />
      </label>

      <label className="mt-4 block">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          What happened — or what would help
        </span>
        <textarea
          name="body"
          required
          minLength={8}
          rows={6}
          placeholder="Plain words. What you expected, what you got."
          className="mt-1 w-full resize-y border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] leading-[1.6] text-ink placeholder:text-ink-3"
        />
      </label>

      {state && !state.ok ? (
        <p className="mt-2 font-serif text-[13px] italic text-rule" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 border border-rule bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-rule disabled:opacity-40"
      >
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
