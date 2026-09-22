"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "./lib/auth";

const LAST_AUTH_IDENTIFIER_KEY = "fourfive.lastAuthIdentifier";
const SAVED_PASSWORD_KEY = "fourfive.savedPassword";
const SAVE_SIGN_IN_KEY = "fourfive.saveSignIn";

type AuthStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type SavedSignIn = {
  identifier: string;
  password: string;
  save: boolean;
};

export function resolvePreferredAuthIdentifier(rememberedIdentifier: string) {
  return rememberedIdentifier.trim();
}

export function readSavedSignIn(storage: AuthStorage): SavedSignIn {
  const save = storage.getItem(SAVE_SIGN_IN_KEY) === "1";
  return {
    identifier: resolvePreferredAuthIdentifier(storage.getItem(LAST_AUTH_IDENTIFIER_KEY) ?? ""),
    password: save ? (storage.getItem(SAVED_PASSWORD_KEY) ?? "") : "",
    save,
  };
}

export function writeSavedSignIn(
  storage: AuthStorage,
  input: { identifier: string; password: string; save: boolean }
) {
  const identifier = input.identifier.trim();

  if (input.save && identifier) {
    storage.setItem(SAVE_SIGN_IN_KEY, "1");
    storage.setItem(LAST_AUTH_IDENTIFIER_KEY, identifier);
    storage.setItem(SAVED_PASSWORD_KEY, input.password);
    return;
  }

  storage.removeItem(SAVE_SIGN_IN_KEY);
  storage.removeItem(SAVED_PASSWORD_KEY);
  if (identifier) {
    storage.setItem(LAST_AUTH_IDENTIFIER_KEY, identifier);
  } else {
    storage.removeItem(LAST_AUTH_IDENTIFIER_KEY);
  }
}

function isInvalidCredentialsError(error: unknown) {
  return error instanceof Error && /invalid username or password/i.test(error.message);
}

function isUsernameTakenError(error: unknown) {
  return error instanceof Error && /already taken/i.test(error.message);
}

function readInitialSavedSignIn(): SavedSignIn {
  if (typeof window === "undefined") {
    return { identifier: "", password: "", save: false };
  }

  return readSavedSignIn(window.localStorage);
}

export function SignInForm() {
  const auth = useAuth();
  const [identifier, setIdentifier] = useState(() => readInitialSavedSignIn().identifier);
  const [password, setPassword] = useState(() => readInitialSavedSignIn().password);
  const [saveSignIn, setSaveSignIn] = useState(() => readInitialSavedSignIn().save);
  const [submitting, setSubmitting] = useState(false);
  const [anonymousSubmitting, setAnonymousSubmitting] = useState(false);
  const isDeploymentProtectionBlocked = Boolean(auth.errorMessage?.includes("Vercel Authentication"));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "");
    const password = String(formData.get("password") ?? "");
    const shouldSave = formData.get("saveSignIn") === "on";

    try {
      let authenticatedUser: Awaited<ReturnType<typeof auth.signIn>>;
      try {
        authenticatedUser = await auth.signIn(identifier, password);
      } catch (signInError) {
        if (!isInvalidCredentialsError(signInError)) {
          throw signInError;
        }

        try {
          authenticatedUser = await auth.signUp(identifier, password);
        } catch (signUpError) {
          // Username exists but the password did not match — keep the sign-in
          // wording so we do not tell the player which case they hit.
          throw isUsernameTakenError(signUpError) ? signInError : signUpError;
        }
      }

      if (typeof window !== "undefined") {
        writeSavedSignIn(window.localStorage, {
          identifier: authenticatedUser?.username?.trim() || identifier,
          password,
          save: shouldSave,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-full">
      <h2 className="text-center font-display text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">FourFive</h2>

      {auth.errorMessage ? (
        <div
          className={`mt-8 rounded-xl px-4 py-3 text-sm leading-6 shadow-sm ${
            isDeploymentProtectionBlocked
              ? "border border-amber-200 bg-amber-50 text-amber-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {auth.errorMessage}
        </div>
      ) : null}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-700">Username</span>
          <input
            className="auth-input-field text-[16px]"
            type="text"
            name="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="your-username"
            autoComplete="username"
            autoCapitalize="none"
            required
          />
          <span className="block text-xs leading-5 text-zinc-500">
            Use 2-20 characters with letters, numbers, hyphens, or underscores.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-700">Password</span>
          <input
            className="auth-input-field text-[16px]"
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white/60 px-4 py-3">
          <input
            type="checkbox"
            name="saveSignIn"
            checked={saveSignIn}
            onChange={(event) => setSaveSignIn(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
          />
          <span className="space-y-1">
            <span className="block text-sm font-semibold text-zinc-800">Save my sign-in information</span>
            <span className="block text-xs leading-5 text-zinc-500">
              Keep this username and password on this device so you do not have to type them next time.
            </span>
          </span>
        </label>
        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={submitting || anonymousSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Working..." : "Sign in / create account"}
          </button>
          <button
            type="button"
            disabled={submitting || anonymousSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white/60 px-4 py-3 font-semibold text-zinc-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (submitting || anonymousSubmitting) {
                return;
              }

              setAnonymousSubmitting(true);
              void auth
                .signInAnonymous()
                .catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Anonymous sign-in failed.");
                })
                .finally(() => {
                  setAnonymousSubmitting(false);
                });
            }}
          >
            {anonymousSubmitting ? "Working..." : "Continue as guest"}
          </button>
        </div>
      </form>
    </div>
  );
}
