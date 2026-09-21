import { useState, type ReactNode } from "react";
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

export function HowToPlay({ variant = "full", forceOpen, onForceOpenConsumed }: HowToPlayProps) {
  const [open, setOpen] = useState(false);
  const isOpen = open || Boolean(forceOpen);

  const close = () => {
    setOpen(false);
    onForceOpenConsumed?.();
  };

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
            <p className="font-bold text-zinc-900">Pick a secret word</p>
            <p>Both players choose a 5-letter word. No repeating letters.</p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-zinc-900">Guess four-letter words</p>
            <p>
              No repeating letters here either. Every guess tells you how many of its letters appear in your
              opponent&rsquo;s word.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Word word="DUNK" />
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">2</span>
            </div>
            <p>
              2 letters in your guess <span className="font-bold text-zinc-900">DUNK</span> are in the opponent&rsquo;s
              word <span className="font-bold text-zinc-900">QUARK</span>.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-zinc-900">Keep track of the letters</p>
            <p>Tap a letter once for green: it is in their word.</p>
            <p>Tap it twice for red: it is not.</p>
            <span className="inline-flex gap-1">
              <Tile tone="green">U</Tile>
              <Tile tone="red">D</Tile>
            </span>
            <p className="pt-1">Keep marking until you know their 5-letter word, then guess it to win.</p>
          </div>

        </div>
      </SocialOverlay>
    </>
  );
}
