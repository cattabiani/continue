import { Editor, JSONContent } from "@tiptap/core";
import { RangeInFileWithContents } from "core";
import { rifWithContentsToContextItem } from "core/commands/util";
import { describe, expect, test, vi } from "vitest";
import { CodeBlock } from "../extensions";
import { insertHighlightedCodeBlock } from "./insertHighlightedCodeBlock";

function createMockEditor(content: JSONContent[]) {
  const insertContentAt = vi.fn();
  const chain = {
    insertContentAt: (...args: unknown[]) => {
      insertContentAt(...args);
      return chain;
    },
    run: vi.fn(),
  };
  const editor = {
    getJSON: () => ({ type: "doc", content }),
    chain: () => chain,
  } as unknown as Editor;
  return { editor, insertContentAt };
}

const rif: RangeInFileWithContents = {
  filepath: "file:///project/src/foo.ts",
  range: {
    start: { line: 2, character: 0 },
    end: { line: 4, character: 10 },
  },
  contents: "const foo = 1;\nconst bar = 2;\nconst baz = 3;",
};

describe("insertHighlightedCodeBlock", () => {
  test("inserts a code block at the top of an empty editor", () => {
    const { editor, insertContentAt } = createMockEditor([]);

    const result = insertHighlightedCodeBlock(editor, rif, "main");

    expect(result.inserted).toBe(true);
    expect(insertContentAt).toHaveBeenCalledWith(0, {
      type: CodeBlock.name,
      attrs: { item: result.contextItem, inputId: "main" },
    });
  });

  test("inserts after existing code blocks, before text", () => {
    const { editor, insertContentAt } = createMockEditor([
      {
        type: CodeBlock.name,
        attrs: { item: { name: "other.ts (1-3)" } },
      },
      { type: "paragraph", content: [{ type: "text", text: "hello" }] },
    ]);

    const result = insertHighlightedCodeBlock(editor, rif, "main");

    expect(result.inserted).toBe(true);
    expect(insertContentAt).toHaveBeenCalledWith(2, expect.anything());
  });

  test("skips an identical code block that is already present", () => {
    const existing = rifWithContentsToContextItem(rif);
    const { editor, insertContentAt } = createMockEditor([
      { type: CodeBlock.name, attrs: { item: existing } },
    ]);

    const result = insertHighlightedCodeBlock(editor, rif, "main");

    expect(result.inserted).toBe(false);
    expect(insertContentAt).not.toHaveBeenCalled();
  });
});
