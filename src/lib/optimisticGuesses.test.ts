import { describe, expect, it } from "vitest";
import type { GuessView } from "../../shared/types";
import {
  countGuessMatches,
  mergeGuessRows,
  mergeGuessViewsMonotonic,
  selectPendingGuessRows,
} from "./optimisticGuesses";

const committed = (...words: string[]) =>
  words.map((text, index) => ({ text, type: "fourLetter", guessNumber: index + 1 }));

const pending = (text: string, priorCommittedCount: number, guessNumber?: number) => ({
  text,
  type: "fourLetter",
  priorCommittedCount,
  ...(guessNumber === undefined ? {} : { guessNumber }),
});

const watermark = (
  list: ReadonlyArray<{ text: string; type: string }>,
  inFlight: ReadonlyArray<{ text: string; type: string }>,
  text: string
) => countGuessMatches(list, text, "fourLetter") + countGuessMatches(inFlight, text, "fourLetter");

describe("selectPendingGuessRows", () => {
  it("keeps a new word until its committed row lands", () => {
    const list = committed("LOCK", "BEAR");
    const row = pending("MIST", watermark(list, [], "MIST"));

    expect(selectPendingGuessRows(list, [row])).toEqual([row]);
    expect(selectPendingGuessRows([...list, { text: "MIST", type: "fourLetter", guessNumber: 3 }], [row])).toEqual([]);
  });

  it("keeps a repeated word until its OWN committed row lands", () => {
    // The reported case: FELT was already in the list, then guessed again.
    // Matching on the word alone retired the new row against the old FELT, so
    // the only FELT on screen stayed part way up, above later guesses.
    const list = committed("FELT", "BULK", "BATH");
    const row = pending("FELT", watermark(list, [], "FELT"));

    expect(selectPendingGuessRows(list, [row])).toEqual([row]);

    const afterCommit = [...list, { text: "FELT", type: "fourLetter", guessNumber: 4 }];
    expect(selectPendingGuessRows(afterCommit, [row])).toEqual([]);
  });

  it("retires two in-flight copies of one word independently", () => {
    const list = committed("LOCK");
    const first = pending("LOCK", watermark(list, [], "LOCK"));
    const second = pending("LOCK", watermark(list, [first], "LOCK"));
    const rows = [first, second];

    expect(selectPendingGuessRows(list, rows)).toEqual([first, second]);

    const afterFirst = [...list, { text: "LOCK", type: "fourLetter", guessNumber: 2 }];
    expect(selectPendingGuessRows(afterFirst, rows)).toEqual([second]);
    // Retiring the first copy must not disturb the second.
    expect(selectPendingGuessRows(afterFirst, [second])).toEqual([second]);

    const afterSecond = [...afterFirst, { text: "LOCK", type: "fourLetter", guessNumber: 3 }];
    expect(selectPendingGuessRows(afterSecond, [second])).toEqual([]);
  });

  it("matches an answered row on its own guess number, not its word", () => {
    const list = committed("FELT", "BULK", "BATH");
    const answered = pending("FELT", 1, 4);

    expect(selectPendingGuessRows(list, [answered])).toEqual([answered]);
    expect(selectPendingGuessRows([...list, { text: "FELT", type: "fourLetter", guessNumber: 4 }], [answered])).toEqual(
      []
    );
  });

  it("keeps an answered row until the committed row matches its number and word", () => {
    const list = committed("LOVE", "STAR", "FROG", "BUCK", "TUCK");
    const answered = pending("BUNT", 0, 6);

    expect(selectPendingGuessRows(list, [answered])).toEqual([answered]);

    // A stale refetch that reuses guess number 6 for a different word must not
    // retire BUNT's optimistic row.
    const stale = [...list, { text: "WAXY", type: "fourLetter", guessNumber: 6 }];
    expect(selectPendingGuessRows(stale, [answered])).toEqual([answered]);
    expect(
      selectPendingGuessRows([...list, { text: "BUNT", type: "fourLetter", guessNumber: 6 }], [answered])
    ).toEqual([]);
  });

  it("does not match a four-letter guess against a full-word guess", () => {
    const list = [{ text: "LOCKS", type: "fullWord", guessNumber: 1 }];
    const row = { text: "LOCKS", type: "fourLetter", priorCommittedCount: 0 };

    expect(selectPendingGuessRows(list, [row])).toEqual([row]);
  });
});

describe("mergeGuessViewsMonotonic", () => {
  const guess = (guessNumber: number, text: string, matchCount = 0): GuessView => ({
    id: `${guessNumber}-${text}`,
    playerId: "player-1",
    type: "fourLetter",
    text,
    matchCount,
    isCorrect: false,
    guessNumber,
    createdAt: guessNumber,
  });

  it("keeps guesses that disappear from a stale refetch", () => {
    const previous = [guess(1, "LOVE"), guess(2, "STAR"), guess(3, "FROG"), guess(4, "BUCK"), guess(5, "TUCK"), guess(6, "BUNT", 2)];
    const incoming = [guess(1, "LOVE"), guess(2, "STAR"), guess(3, "FROG"), guess(4, "BUCK"), guess(5, "TUCK")];

    expect(mergeGuessViewsMonotonic(previous, incoming).map((row) => row.text)).toEqual([
      "LOVE",
      "STAR",
      "FROG",
      "BUCK",
      "TUCK",
      "BUNT",
    ]);
  });

  it("prefers incoming data for a guess number already seen", () => {
    const previous = [guess(1, "LOVE", 0)];
    const incoming = [guess(1, "LOVE", 1)];

    expect(mergeGuessViewsMonotonic(previous, incoming)[0]?.matchCount).toBe(1);
  });
});

describe("mergeGuessRows", () => {
  it("puts a guess still awaiting an answer last", () => {
    const list = committed("HAND", "PART");
    const row = pending("WAXY", 0);

    expect(mergeGuessRows(list, [row]).map((g) => g.text)).toEqual(["HAND", "PART", "WAXY"]);
  });

  it("keeps a newer guess below a stranded older row", () => {
    // A row whose server row never arrived used to stay pinned to the bottom,
    // pushing every later guess above it — a fresh guess landing mid-list.
    // BULK was guessed second; HAND, PART and WAXY are first, third and fourth.
    const list = [
      { text: "HAND", type: "fourLetter", guessNumber: 1 },
      { text: "PART", type: "fourLetter", guessNumber: 3 },
      { text: "WAXY", type: "fourLetter", guessNumber: 4 },
    ];
    const stranded = pending("BULK", 0, 2);

    expect(mergeGuessRows(list, [stranded]).map((g) => g.text)).toEqual(["HAND", "BULK", "PART", "WAXY"]);
  });

  it("returns the committed list untouched when nothing is in flight", () => {
    const list = committed("HAND", "PART");
    expect(mergeGuessRows(list, [])).toEqual(list);
  });
});
