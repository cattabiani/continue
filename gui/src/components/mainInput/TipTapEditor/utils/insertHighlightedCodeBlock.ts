import { Editor } from "@tiptap/core";
import { RangeInFileWithContents } from "core";
import { rifWithContentsToContextItem } from "core/commands/util";
import { CodeBlock, PromptBlock } from "../extensions";

/**
 * Inserts a range-in-file (e.g. a highlighted selection) as a removable
 * code block at the top of the editor, skipping if an identical block is
 * already present. `inserted` is false when skipped as a duplicate.
 */
export function insertHighlightedCodeBlock(
  editor: Editor,
  rangeInFileWithContents: RangeInFileWithContents,
  inputId: string,
) {
  const contextItem = rifWithContentsToContextItem(rangeInFileWithContents);

  let index = 0;
  for (const el of editor.getJSON()?.content ?? []) {
    if (el.attrs?.item?.name === contextItem.name) {
      return { inserted: false, contextItem };
    }

    if (el.type === CodeBlock.name || el.type === PromptBlock.name) {
      index += 2;
    } else {
      break;
    }
  }

  editor
    .chain()
    .insertContentAt(index, {
      type: CodeBlock.name,
      attrs: {
        item: contextItem,
        inputId,
      },
    })
    .run();

  return { inserted: true, contextItem };
}
