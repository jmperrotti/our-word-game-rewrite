import type { AlphabetState } from "../../shared/types";

// Mirrors the alphabet board's colour language, but as coloured text rather
// than filled tiles: guess words sit inline in the list and the composer, where
// a row of solid tiles would outweigh everything around it.
const LETTER_TONE: Record<AlphabetState, string> = {
  present: "text-emerald-600",
  absent: "text-rose-600",
  unknown: "text-zinc-900",
};

function getGuessLetterClass(state: AlphabetState | undefined) {
  return LETTER_TONE[state ?? "unknown"];
}

/**
 * A guessed word with each letter coloured by how the player has marked it on
 * the alphabet board. Re-renders whenever `alphabet` changes, so re-marking a
 * letter re-colours every word already on screen.
 */
export function GuessLetters({
  word,
  alphabet,
}: {
  word: string;
  alphabet: Record<string, AlphabetState>;
}) {
  return (
    <>
      {word.split("").map((letter, index) => (
        <span key={index} className={getGuessLetterClass(alphabet[letter])}>
          {letter}
        </span>
      ))}
    </>
  );
}
