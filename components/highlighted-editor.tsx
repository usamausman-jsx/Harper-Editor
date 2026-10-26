// components/highlighted-editor.tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ChangeEvent,
  type UIEvent,
} from "react";

import type { Lint } from "harper.js";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { useHarperLinter } from "@/hooks/use-harper-linter";
import { cn } from "@/lib/utils";

const SHARED_TEXT_STYLE =
  "font-mono text-sm leading-6 whitespace-pre-wrap break-words p-3";

/**
 * Debounces a value so Harper does not lint
 * on every single keystroke.
 */
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return debounced;
}

type Segment =
  | {
      kind: "plain";
      text: string;
      key: string;
    }
  | {
      kind: "lint";
      text: string;
      key: string;
      lint: Lint;
      lintIndex: number;
    };

/**
 * Converts the text + Harper lint results
 * into normal and underlined text segments.
 */
function buildSegments(text: string, lints: Lint[]): Segment[] {
  const sorted = [...lints]
    .map((lint, index) => ({
      lint,
      index,
      span: lint.span(),
    }))
    .sort((a, b) => a.span.start - b.span.start);

  const segments: Segment[] = [];

  let cursor = 0;

  sorted.forEach(({ lint, index, span }, segmentIndex) => {
    /*
     * Skip overlapping lint results.
     */
    if (span.start < cursor) {
      return;
    }

    /*
     * Add normal text appearing before
     * the current lint item.
     */
    if (span.start > cursor) {
      segments.push({
        kind: "plain",
        text: text.slice(cursor, span.start),
        key: `plain-${cursor}`,
      });
    }

    /*
     * Add the problematic text.
     */
    segments.push({
      kind: "lint",
      text: text.slice(span.start, span.end),
      key: `lint-${segmentIndex}-${span.start}`,
      lint,
      lintIndex: index,
    });

    cursor = span.end;
  });

  /*
   * Add remaining normal text.
   */
  if (cursor < text.length) {
    segments.push({
      kind: "plain",
      text: text.slice(cursor),
      key: `plain-end-${cursor}`,
    });
  }

  return segments;
}

export function HighlightedEditor() {
  const [text, setText] = useState(
    "This is a example of how to use harper.js. It dont check grammar perfect.",
  );

  const [lints, setLints] = useState<Lint[]>([]);

  const [openLintIndex, setOpenLintIndex] = useState<number | null>(null);

  const { ready, error, lint, applySuggestion } = useHarperLinter();

  /*
   * Wait 400 ms after typing before linting.
   */
  const debouncedText = useDebouncedValue(text, 400);

  /*
   * Prevent an older lint request from overwriting
   * the results of a newer request.
   */
  const requestId = useRef(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  /**
   * Run Harper.
   */
  const runLint = useCallback(
    async (value: string) => {
      if (!ready) {
        return;
      }

      const id = ++requestId.current;

      try {
        const results = await lint(value);

        if (id === requestId.current) {
          setLints(results);
        }
      } catch (err) {
        console.error("[Editor] Linting failed:", err);

        if (id === requestId.current) {
          setLints([]);
        }
      }
    },
    [lint, ready],
  );

  /**
   * Automatically lint whenever the user stops typing.
   */
  useEffect(() => {
    if (!ready) {
      return;
    }

    void runLint(debouncedText);
  }, [debouncedText, ready, runLint]);

  /**
   * Generate text segments used by the visual overlay.
   */
  const segments = useMemo(() => {
    return buildSegments(text, lints);
  }, [text, lints]);

  /**
   * Handle textarea changes.
   */
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);

    /*
     * Close any open suggestion popover while typing.
     */
    setOpenLintIndex(null);
  }

  /**
   * Keep the overlay synchronized with textarea scrolling.
   */
  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (!overlayRef.current) {
      return;
    }

    overlayRef.current.scrollTop = event.currentTarget.scrollTop;

    overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  /**
   * Apply one of Harper's suggestions.
   */
  async function handleApply(lintItem: Lint, suggestionIndex: number) {
    try {
      const updated = await applySuggestion(text, lintItem, suggestionIndex);

      setText(updated);

      setOpenLintIndex(null);

      /*
       * Immediately lint the corrected text.
       */
      await runLint(updated);

      /*
       * Return focus to the editor.
       */
      textareaRef.current?.focus();
    } catch (err) {
      console.error("[Editor] Failed to apply suggestion:", err);
    }
  }

  return (
    <div className="space-y-2">
      {/* Editor */}
      <div className="relative overflow-visible rounded-md border bg-background">
        {/*
         * Highlight overlay.
         *
         * The actual textarea remains responsible for
         * displaying/editing the text. The overlay creates
         * the wavy lint underlines.
         */}
        <div
          ref={overlayRef}
          className={cn(
            SHARED_TEXT_STYLE,
            "z-20 pointer-events-none absolute inset-0 overflow-auto text-transparent",
          )}
        >
          {segments.map((segment) => {
            /*
             * Normal text.
             */
            if (segment.kind === "plain") {
              return <span key={segment.key}>{segment.text}</span>;
            }

            /*
             * Harper lint result.
             */
            return (
              <Popover
                key={segment.key}
                open={openLintIndex === segment.lintIndex}
                onOpenChange={(open) => {
                  setOpenLintIndex(open ? segment.lintIndex : null);
                }}
              >
                {/*
                 * IMPORTANT:
                 *
                 * Base UI assumes PopoverTrigger renders
                 * a native <button> by default.
                 *
                 * We're rendering a <span>, so
                 * nativeButton={false} is required.
                 */}
                <PopoverTrigger
                  nativeButton={false}
                  render={
                    <span
                      className={cn(
                        "pointer-events-auto",
                        "cursor-pointer",
                        "underline",
                        "decoration-wavy",
                        "decoration-red-500",
                        "decoration-2",
                        "underline-offset-4",
                      )}
                    >
                      {segment.text}
                    </span>
                  }
                />

                <PopoverContent
                  className="w-72 space-y-3 text-sm"
                  sideOffset={6}
                >
                  {/* Harper explanation */}
                  <p className="font-medium">{segment.lint.message()}</p>

                  {/* Suggestions */}
                  {segment.lint.suggestion_count() > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Suggestions
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {segment.lint
                          .suggestions()
                          .map((suggestion, suggestionIndex) => {
                            const replacement =
                              suggestion.get_replacement_text();

                            return (
                              <Button
                                key={suggestionIndex}
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  void handleApply(
                                    segment.lint,
                                    suggestionIndex,
                                  );
                                }}
                              >
                                {replacement || "Remove"}
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No automatic fix available.
                    </p>
                  )}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        {/* Actual editable textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onScroll={handleScroll}
          spellCheck={false}
          aria-label="Spell checked editor"
          placeholder="Start typing..."
          className={cn(
            SHARED_TEXT_STYLE,
            "relative z-10",
            "min-h-[300px]",
            "w-full",
            "resize-y",
            "bg-transparent",
            "text-foreground",
            "outline-none",
          )}
        />
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-xs text-red-600">Harper failed to load: {error}</p>
        ) : !ready ? (
          <p className="text-xs text-muted-foreground">
            Loading spell checker...
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {lints.length === 0
              ? "No issues found"
              : `${lints.length} issue${lints.length === 1 ? "" : "s"} found`}
          </p>
        )}

        {ready && <p className="text-xs text-muted-foreground">Harper ready</p>}
      </div>
    </div>
  );
}
