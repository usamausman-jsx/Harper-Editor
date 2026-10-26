// hooks/use-harper-linter.ts
"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkerLinter, Lint } from "harper.js";

export function useHarperLinter() {
  const linterRef = useRef<WorkerLinter | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeHarper() {
      let linter: WorkerLinter | null = null;

      try {
        setReady(false);
        setError(null);

        console.log("[Harper] Loading modules...");

        const harper = await import("harper.js");

        // IMPORTANT:
        // Use binaryInlined, NOT slimBinary.
        const { binaryInlined } = await import("harper.js/binaryInlined");

        console.log("[Harper] Modules loaded.");

        linter = new harper.WorkerLinter({
          binary: binaryInlined,
          dialect: harper.Dialect.American,
        });

        console.log("[Harper] Setting up linter...");

        await linter.setup();

        console.log("[Harper] Linter setup complete.");

        if (cancelled) {
          linter.dispose();
          return;
        }

        linterRef.current = linter;
        setReady(true);

        console.log("[Harper] Ready.");
      } catch (err) {
        console.error("[Harper] Initialization failed:", err);

        if (linter) {
          try {
            linter.dispose();
          } catch {
            // Ignore cleanup error
          }
        }

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to initialize Harper.",
          );

          setReady(false);
        }
      }
    }

    void initializeHarper();

    return () => {
      cancelled = true;

      if (linterRef.current) {
        linterRef.current.dispose();
        linterRef.current = null;
      }
    };
  }, []);

  async function lint(text: string): Promise<Lint[]> {
    if (!linterRef.current) {
      return [];
    }

    try {
      return await linterRef.current.lint(text);
    } catch (err) {
      console.error("[Harper] Lint failed:", err);
      return [];
    }
  }

  async function applySuggestion(
    text: string,
    lintItem: Lint,
    suggestionIndex: number,
  ): Promise<string> {
    if (!linterRef.current) {
      return text;
    }

    const suggestions = lintItem.suggestions();
    const suggestion = suggestions[suggestionIndex];

    if (!suggestion) {
      return text;
    }

    try {
      return await linterRef.current.applySuggestion(
        text,
        lintItem,
        suggestion,
      );
    } catch (err) {
      console.error("[Harper] Failed to apply suggestion:", err);

      return text;
    }
  }

  return {
    ready,
    error,
    lint,
    applySuggestion,
  };
}
