import type { GuessView } from "../../shared/types";

/** A guess drawn immediately, before the server has confirmed it. */
export interface PendingGuessRow {
  text: string;
  type: string;
  /**
   * How many rows already held this word — committed plus still in flight —
   * when this row was created. Captured once, at submit time, and never
   * recomputed: it is the watermark the row is measured against. Counting the
   * in-flight rows too gives each copy of a repeated word its own watermark, so
   * retiring one copy cannot disturb the next.
   */
  priorCommittedCount: number;
  /** The row's own place in the history. Known once the server answers. */
  guessNumber?: number;
}

interface CommittedGuessRow {
  text: string;
  type: string;
  guessNumber: number;
}

/** Rows holding this exact word, in either the committed list or the pending one. */
export function countGuessMatches(rows: readonly { text: string; type: string }[], text: string, type: string) {
  return rows.filter((row) => row.type === type && row.text === text).length;
}

function committedRowMatchesPending(committed: readonly CommittedGuessRow[], row: PendingGuessRow) {
  if (row.guessNumber === undefined) {
    return false;
  }
  return committed.some(
    (guess) => guess.guessNumber === row.guessNumber && guess.text === row.text && guess.type === row.type
  );
}

/**
 * Never drop a guess the client has already seen for this game. A newer refetch
 * can briefly return a shorter list — broadcast races, bot turns, tab wake —
 * and replacing myGuesses wholesale erased rows whose optimistic fallback had
 * already retired.
 */
export function mergeGuessViewsMonotonic(previous: readonly GuessView[], incoming: readonly GuessView[]): GuessView[] {
  const byNumber = new Map<number, GuessView>();
  for (const guess of previous) {
    byNumber.set(guess.guessNumber, guess);
  }
  for (const guess of incoming) {
    byNumber.set(guess.guessNumber, guess);
  }
  return [...byNumber.values()].sort((a, b) => a.guessNumber - b.guessNumber);
}

/**
 * Narrows in-flight guess rows to the ones still waiting on a server row.
 *
 * A pending row cannot be matched to its committed row by word alone. A player
 * who guesses a word they already guessed earlier has a committed row with that
 * word sitting in the list from the first time round; matching on the word hands
 * the new row that old one, so the pending row is retired before the server has
 * answered. The word the player just guessed then has no row of its own, and the
 * only copy on screen is the earlier one, part way up the list.
 *
 * Once the server has answered we know the row's own guess number, so it can be
 * matched exactly. Before that, the row is held until a committed row appears
 * above its watermark.
 */
export function selectPendingGuessRows<C extends CommittedGuessRow, O extends PendingGuessRow>(
  committed: readonly C[],
  pending: readonly O[]
): O[] {
  return pending.filter((row) => {
    if (row.guessNumber !== undefined) {
      return !committedRowMatchesPending(committed, row);
    }
    return countGuessMatches(committed, row.text, row.type) <= row.priorCommittedCount;
  });
}

/**
 * The list as the player should read it: oldest first, newest last.
 *
 * Pending rows are NOT simply appended. A row whose server row never arrives —
 * a dropped refetch, a realtime signal missed while the phone was asleep —
 * would otherwise stay pinned to the bottom for as long as it lived, and every
 * genuinely newer guess would be drawn above it, which is what the player sees
 * as a fresh guess landing in the middle of the list. A row the server has
 * answered knows its own guess number, so it can be placed by that number like
 * any other row. Only rows still awaiting an answer go last, where they belong.
 */
export function mergeGuessRows<C extends CommittedGuessRow, O extends PendingGuessRow>(
  committed: readonly C[],
  pending: readonly O[]
): Array<C | O> {
  if (pending.length === 0) {
    return [...committed];
  }

  const answered: Array<C | O> = [...committed];
  const awaiting: O[] = [];
  for (const row of pending) {
    if (row.guessNumber === undefined) {
      awaiting.push(row);
    } else {
      answered.push(row);
    }
  }

  answered.sort((a, b) => (a.guessNumber ?? 0) - (b.guessNumber ?? 0));
  return [...answered, ...awaiting];
}
