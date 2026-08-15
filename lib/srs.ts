export type ReviewState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type ReviewSchedule = ReviewState & {
  nextReviewAt: Date;
  lastReviewedAt: Date;
};

export function scheduleReview(
  note: ReviewState,
  quality: number,
  now = new Date(),
): ReviewSchedule {
  const lastReviewedAt = now;

  if (quality < 3) {
    return {
      repetitions: 0,
      intervalDays: 1,
      easeFactor: note.easeFactor,
      nextReviewAt: addDays(now, 1),
      lastReviewedAt,
    };
  }

  const repetitions = note.repetitions + 1;
  const easeFactor = Math.max(
    1.3,
    note.easeFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 6
        : Math.round(note.intervalDays * easeFactor);

  return {
    repetitions,
    intervalDays,
    easeFactor,
    nextReviewAt: addDays(now, intervalDays),
    lastReviewedAt,
  };
}

function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
