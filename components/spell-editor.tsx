// components/spell-editor.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Lint } from "harper.js";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHarperLinter } from "@/hooks/use-harper-linter";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SpellEditor() {
  const [text, setText] = useState(
    "This is a example of how to use harper.js.",
  );
  const [lints, setLints] = useState<Lint[]>([]);
  const { ready, lint, applySuggestion, error } = useHarperLinter();
  const debouncedText = useDebouncedValue(text, 400);
  const requestId = useRef(0);

  const runLint = useCallback(
    async (value: string) => {
      const id = ++requestId.current;
      const results = await lint(value);
      if (id === requestId.current) setLints(results);
    },
    [lint],
  );

  useEffect(() => {
    if (ready) runLint(debouncedText);
  }, [debouncedText, ready, runLint]);

  async function handleApply(lintItem: Lint, suggestionIndex: number) {
    const updated = await applySuggestion(text, lintItem, suggestionIndex);
    setText(updated);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardContent className="pt-6">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="Start typing..."
          />
          {error ? (
            <p className="text-sm text-red-600">
              Harper failed to load: {error}
            </p>
          ) : !ready ? (
            <p className="text-sm text-gray-500">Loading spell checker...</p>
          ) : (
            <p className="text-sm text-green-600">Spell checker ready</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="text-sm font-medium">Suggestions</h3>
          {lints.length === 0 && (
            <p className="text-sm text-muted-foreground">No issues found.</p>
          )}
          {lints.map((l, i) => {
            const span = l.span();
            const problemText = text.slice(span.start, span.end);
            return (
              <div key={i} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{problemText}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{l.message()}</p>
                {l.suggestion_count() > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {l.suggestions().map((sug, si) => (
                      <Button
                        key={si}
                        size="sm"
                        variant="secondary"
                        onClick={() => handleApply(l, si)}
                      >
                        {sug.get_replacement_text() || "Remove"}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
