"use client";

import { useState, useTransition } from "react";
import { QuestionKind, QuestionOrigin } from "@prisma/client";
import {
  addQuestion,
  answerMcq,
  saveWrittenAnswer,
} from "@/app/actions/sections";
import {
  interceptRoutedPaste,
  usePasteRouter,
} from "@/components/SmartPasteHost";

const ORIGIN_LABEL: Record<QuestionOrigin, string> = {
  USER_WRITTEN: "written by me",
  PYQ_LINKED: "past year",
  AI_EXTRACTED: "extracted",
};

const KIND_LABEL: Record<QuestionKind, string> = {
  MCQ: "mcq",
  PRELIMS_STATEMENT: "prelims",
  MAINS_DESCRIPTIVE: "mains",
};

export type QuestionCard = {
  id: string;
  kind: QuestionKind;
  origin: QuestionOrigin;
  stem: string;
  options: string[];
  correctIndices: number[];
  attempt: { selectedIndices: number[]; isCorrect: boolean | null } | null;
};

export function QuestionsPane({
  sectionId,
  questions,
}: {
  sectionId: string;
  questions: QuestionCard[];
}) {
  return (
    <div>
      {questions.length === 0 ? (
        <p className="mb-4 font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
          Write one you'd struggle to answer — that's the one worth keeping.
        </p>
      ) : (
        <ul className="space-y-4">
          {questions.map((question) => (
            <li key={question.id} className="border border-line bg-panel px-3 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                {ORIGIN_LABEL[question.origin]} · {KIND_LABEL[question.kind]}
              </p>
              <p className="mt-1 font-serif text-[15.5px] leading-[1.72] text-ink">
                {question.stem}
              </p>
              {question.kind === QuestionKind.MAINS_DESCRIPTIVE ? (
                <DescriptiveAnswer questionId={question.id} />
              ) : (
                <McqOptions question={question} />
              )}
            </li>
          ))}
        </ul>
      )}
      <AddQuestionForm sectionId={sectionId} />
    </div>
  );
}

function McqOptions({ question }: { question: QuestionCard }) {
  const locked = question.attempt !== null;
  const [picked, setPicked] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  const multi = question.correctIndices.length > 1;

  function choose(index: number) {
    if (locked || pending) return;
    if (!multi) {
      startTransition(() => answerMcq(question.id, [index]));
      return;
    }
    setPicked((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  }

  return (
    <div className="mt-2 space-y-1">
      {question.options.map((option, index) => {
        const selected = locked
          ? (question.attempt?.selectedIndices.includes(index) ?? false)
          : picked.includes(index);
        const correct = question.correctIndices.includes(index);
        let color = "text-ink";
        if (locked && correct) color = "text-ok";
        if (locked && selected && !correct) color = "text-rule";

        return (
          <button
            key={`${question.id}-${index}`}
            type="button"
            disabled={locked || pending}
            onClick={() => choose(index)}
            className={`block w-full px-1 py-0.5 text-left font-serif text-[15.5px] leading-[1.72] ${color} disabled:cursor-default`}
          >
            <span className="font-mono text-[12px] text-ink-3">
              {String.fromCharCode(97 + index)})
            </span>{" "}
            {option}
          </button>
        );
      })}
      {multi && !locked ? (
        <button
          type="button"
          disabled={picked.length === 0 || pending}
          onClick={() => startTransition(() => answerMcq(question.id, picked))}
          className="mt-2 border border-line px-2 py-1 font-mono text-[11px] uppercase text-ink-2 disabled:opacity-40"
        >
          Lock answer
        </button>
      ) : null}
    </div>
  );
}

function DescriptiveAnswer({ questionId }: { questionId: string }) {
  const [answer, setAnswer] = useState("");
  const [filed, setFiled] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2">
      <textarea
        data-no-assist
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Write your answer. Do not paste a model key."
        rows={5}
        className="w-full border border-line bg-paper px-2 py-1.5 font-serif text-[15.5px] leading-[1.72] text-ink"
      />
      <button
        type="button"
        disabled={answer.trim().length === 0 || pending || filed}
        onClick={() => {
          const text = answer;
          setAnswer("");
          setFiled(true);
          startTransition(() => saveWrittenAnswer(questionId, text));
        }}
        className="mt-2 border border-line px-2 py-1 font-mono text-[11px] uppercase text-ink-2 disabled:opacity-40"
      >
        {filed ? "Attempt filed" : pending ? "Filing…" : "File attempt"}
      </button>
    </div>
  );
}

function AddQuestionForm({ sectionId }: { sectionId: string }) {
  const [kind, setKind] = useState<QuestionKind>(QuestionKind.MCQ);
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const paste = usePasteRouter();
  const isMcq = kind !== QuestionKind.MAINS_DESCRIPTIVE;

  function submit() {
    startTransition(async () => {
      const result = await addQuestion({
        sectionId,
        kind,
        stem,
        options,
        correctIndices: correct,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStem("");
      setOptions(["", "", "", ""]);
      setCorrect([]);
      setError(null);
    });
  }

  return (
    <div className="mt-6 space-y-2 border-t border-line pt-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        Write a question
      </p>
      <select
        value={kind}
        onChange={(event) => setKind(event.target.value as QuestionKind)}
        className="border border-line bg-panel px-2 py-1.5 font-mono text-[12px] uppercase text-ink"
      >
        <option value={QuestionKind.MCQ}>MCQ</option>
        <option value={QuestionKind.PRELIMS_STATEMENT}>Prelims statement</option>
        <option value={QuestionKind.MAINS_DESCRIPTIVE}>Mains descriptive</option>
      </select>
      <textarea
        value={stem}
        onChange={(event) => setStem(event.target.value)}
        onPaste={(event) =>
          interceptRoutedPaste(event, paste, (pasted) => pasted.length > 80)
        }
        placeholder="Stem"
        rows={3}
        className="w-full border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] leading-[1.72] text-ink"
      />
      {isMcq
        ? options.map((option, index) => (
            <label key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={correct.includes(index)}
                onChange={() =>
                  setCorrect((current) =>
                    current.includes(index)
                      ? current.filter((item) => item !== index)
                      : [...current, index],
                  )
                }
                className="accent-[var(--rule)]"
              />
              <input
                value={option}
                onChange={(event) => {
                  const next = [...options];
                  next[index] = event.target.value;
                  setOptions(next);
                }}
                placeholder={`${String.fromCharCode(97 + index)})`}
                className="min-w-0 flex-1 border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] text-ink"
              />
            </label>
          ))
        : null}
      {error ? (
        <p className="font-serif text-[13px] italic text-rule" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-40"
      >
        {pending ? "Saving…" : "Keep this question"}
      </button>
    </div>
  );
}
