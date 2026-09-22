import { describe, expect, it } from "vitest";
import { readSavedSignIn, resolvePreferredAuthIdentifier, writeSavedSignIn } from "./SignInForm";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem(key: string) {
      return key in store ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    snapshot() {
      return { ...store };
    },
  };
}

describe("resolvePreferredAuthIdentifier", () => {
  it("trims surrounding whitespace", () => {
    expect(resolvePreferredAuthIdentifier("  alice  ")).toBe("alice");
  });

  it("keeps the remembered identifier when one exists", () => {
    expect(resolvePreferredAuthIdentifier("guest-player")).toBe("guest-player");
  });

  it("returns an empty string when nothing is remembered", () => {
    expect(resolvePreferredAuthIdentifier("")).toBe("");
  });
});

describe("saved sign-in information", () => {
  it("reads a saved username and password when the player opted in", () => {
    const storage = createMemoryStorage({
      "fourfive.saveSignIn": "1",
      "fourfive.lastAuthIdentifier": "  alice  ",
      "fourfive.savedPassword": "secret-word",
    });

    expect(readSavedSignIn(storage)).toEqual({
      identifier: "alice",
      password: "secret-word",
      save: true,
    });
  });

  it("does not restore a password unless the player opted in", () => {
    const storage = createMemoryStorage({
      "fourfive.lastAuthIdentifier": "alice",
      "fourfive.savedPassword": "secret-word",
    });

    expect(readSavedSignIn(storage)).toEqual({
      identifier: "alice",
      password: "",
      save: false,
    });
  });

  it("stores username and password when the player asks to save them", () => {
    const storage = createMemoryStorage();

    writeSavedSignIn(storage, {
      identifier: "  alice  ",
      password: "secret-word",
      save: true,
    });

    expect(storage.snapshot()).toEqual({
      "fourfive.saveSignIn": "1",
      "fourfive.lastAuthIdentifier": "alice",
      "fourfive.savedPassword": "secret-word",
    });
  });

  it("clears a saved password when the player turns the option off", () => {
    const storage = createMemoryStorage({
      "fourfive.saveSignIn": "1",
      "fourfive.lastAuthIdentifier": "alice",
      "fourfive.savedPassword": "secret-word",
    });

    writeSavedSignIn(storage, {
      identifier: "alice",
      password: "secret-word",
      save: false,
    });

    expect(storage.snapshot()).toEqual({
      "fourfive.lastAuthIdentifier": "alice",
    });
  });
});
