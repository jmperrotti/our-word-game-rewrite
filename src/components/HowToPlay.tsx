import { useEffect, useState, type ReactNode } from "react";
import confetti from "canvas-confetti";
import { SocialOverlay } from "./social/SocialOverlay";

interface HowToPlayProps {
  /** "full" renders a quiet text button (lobby); "icon" a compact ? button (in-game header). */
  variant?: "full" | "icon";
  forceOpen?: boolean;
  onForceOpenConsumed?: () => void;
}

// Mini letter tiles, styled exactly like the game's alphabet/rearranger tiles,
// so the rules teach with the same visual vocabulary the board uses.
function Tile({ tone = "neutral", children }: { tone?: "neutral" | "green" | "red"; children: ReactNode }) {
  const tones = {
    neutral: "border-zinc-300 bg-white text-zinc-800",
    green: "border-emerald-600 bg-emerald-500 text-white",
    red: "border-rose-600 bg-rose-500 text-white",
  } as const;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border-2 align-middle font-mono text-sm font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Word({ word, tone = "neutral" }: { word: string; tone?: "neutral" | "green" | "red" }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={word}>
      {word.split("").map((letter, i) => (
        <Tile key={i} tone={tone}>
          {letter}
        </Tile>
      ))}
    </span>
  );
}

function GuessComposerExample({
  word,
  selected,
  result,
  showTypeToggle = true,
  showSubmitArrow = true,
}: {
  word: string;
  selected: "four" | "five";
  result?: string;
  showTypeToggle?: boolean;
  showSubmitArrow?: boolean;
}) {
  const selectedClass =
    "inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-900 bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 shadow-sm";
  const idleClass =
    "inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-3 py-2 text-center text-sm font-semibold text-zinc-700";

  return (
    <div className="space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5">
          <Word word={word} />
          {result ? <span className="text-sm font-semibold text-zinc-700">{result}</span> : null}
        </div>
        {showSubmitArrow ? (
          <span
            aria-hidden="true"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-lg font-bold text-white"
          >
            ↑
          </span>
        ) : null}
      </div>
      {showTypeToggle ? (
        <div className="grid grid-cols-2 rounded-lg bg-zinc-100 p-0.5">
          <span className={selected === "four" ? selectedClass : idleClass}>four-letter word</span>
          <span className={selected === "five" ? selectedClass : idleClass}>five-letter word</span>
        </div>
      ) : null}
    </div>
  );
}

export function HowToPlay({ variant = "full", forceOpen, onForceOpenConsumed }: HowToPlayProps) {
  const [open, setOpen] = useState(false);
  const isOpen = open || Boolean(forceOpen);

  const close = () => {
    setOpen(false);
    onForceOpenConsumed?.();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 } });
  }, [isOpen]);

  return (
    <>
      {variant === "full" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-900 hover:decoration-zinc-500"
        >
          How to play
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="How to play"
          title="How to play"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white font-mono text-sm font-bold text-zinc-600 transition hover:bg-zinc-50 active:scale-[0.96]"
        >
          ?
        </button>
      )}

      <SocialOverlay open={isOpen} onClose={close} title="FourFive" size="md">
        <div className="space-y-6 text-sm leading-6 text-zinc-700">
          <div className="space-y-1">
            <p className="text-base font-bold text-zinc-900">
              Guess your opponent&rsquo;s 5-letter word before they guess yours.
            </p>
            <p>Use 4-letter words to guess your opponent&rsquo;s 5-letter word.</p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-zinc-900">Pick a secret word.</p>
            <p>Both players choose a 5-letter word. No repeating letters.</p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-zinc-900">Guess four-letter words.</p>
            <p>
              No repeating letters here either! Every guess tells you how many of its letters appear in your
              opponent&rsquo;s word.
            </p>
            <GuessComposerExample
              word="DUNK"
              selected="four"
              result="2"
              showTypeToggle={false}
              showSubmitArrow={false}
            />
            <p>
              2 letters in your guess <span className="font-bold text-zinc-900">DUNK</span> are in the opponent&rsquo;s
              word <span className="font-bold text-zinc-900">QUARK</span>.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-zinc-900">Keep track of the letters.</p>
            <p>Tap a letter once for green if it is in their word.</p>
            <p>Tap it twice for red if it is not.</p>
            <span className="inline-flex gap-1">
              <Tile tone="green">U</Tile>
              <Tile tone="red">D</Tile>
            </span>
            <p className="pt-1">Keep marking letters until you know their 5-letter word, then guess it correctly to win.</p>
            <GuessComposerExample word="QUARK" selected="five" />
          </div>

          <div className="space-y-2 text-center">
            <p className="select-none text-2xl leading-none" aria-hidden="true">
              🎉🎊✨
            </p>
            <p className="font-bold text-zinc-900">Win, and claim bragging rights!</p>
          </div>

        </div>
      </SocialOverlay>
    </>
  );
}
