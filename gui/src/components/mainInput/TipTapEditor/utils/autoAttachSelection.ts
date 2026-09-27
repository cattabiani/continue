import { Editor } from "@tiptap/core";
import { MutableRefObject } from "react";
import { IIdeMessenger } from "../../../../context/IdeMessenger";
import { insertHighlightedCodeBlock } from "./insertHighlightedCodeBlock";

/**
 * Asks the IDE for the current selection and, if there is one, inserts it
 * into the editor as a code block. Returns false without asking if a
 * previous call is still waiting (e.g. Enter pressed twice), in which case
 * the caller should drop this send so the message isn't sent twice.
 */
export async function autoAttachSelection(
  editor: Editor,
  ideMessenger: IIdeMessenger,
  inputId: string,
  inFlightRef: MutableRefObject<boolean>,
): Promise<boolean> {
  if (inFlightRef.current) {
    return false;
  }
  inFlightRef.current = true;
  try {
    const result = await ideMessenger.request(
      "getAutoAttachSelection",
      undefined,
    );
    if (result.status === "success" && result.content) {
      insertHighlightedCodeBlock(editor, result.content, inputId);
    }
    return true;
  } finally {
    inFlightRef.current = false;
  }
}
