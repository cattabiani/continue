import { Editor } from "@tiptap/core";
import { RangeInFileWithContents } from "core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockIdeMessenger } from "../../../../context/MockIdeMessenger";
import { autoAttachSelection } from "./autoAttachSelection";
import { insertHighlightedCodeBlock } from "./insertHighlightedCodeBlock";

vi.mock("./insertHighlightedCodeBlock", () => ({
  insertHighlightedCodeBlock: vi.fn(),
}));

const editor = {} as Editor;

const selection: RangeInFileWithContents = {
  filepath: "file:///project/src/foo.ts",
  range: {
    start: { line: 2, character: 0 },
    end: { line: 4, character: 10 },
  },
  contents: "const foo = 1;",
};

describe("autoAttachSelection", () => {
  let ideMessenger: MockIdeMessenger;
  let inFlightRef: { current: boolean };

  beforeEach(() => {
    vi.mocked(insertHighlightedCodeBlock).mockClear();
    ideMessenger = new MockIdeMessenger();
    inFlightRef = { current: false };
  });

  test("inserts the selection returned by the IDE", async () => {
    ideMessenger.responses.getAutoAttachSelection = selection;

    const shouldSend = await autoAttachSelection(
      editor,
      ideMessenger,
      "main",
      inFlightRef,
    );

    expect(shouldSend).toBe(true);
    expect(insertHighlightedCodeBlock).toHaveBeenCalledWith(
      editor,
      selection,
      "main",
    );
    expect(inFlightRef.current).toBe(false);
  });

  test("inserts nothing when there is no selection", async () => {
    ideMessenger.responses.getAutoAttachSelection = null;

    const shouldSend = await autoAttachSelection(
      editor,
      ideMessenger,
      "main",
      inFlightRef,
    );

    expect(shouldSend).toBe(true);
    expect(insertHighlightedCodeBlock).not.toHaveBeenCalled();
  });

  test("still sends, without the selection, when the request fails", async () => {
    vi.spyOn(ideMessenger, "request").mockResolvedValue({
      status: "error",
      error: "boom",
      done: true,
    });

    const shouldSend = await autoAttachSelection(
      editor,
      ideMessenger,
      "main",
      inFlightRef,
    );

    expect(shouldSend).toBe(true);
    expect(insertHighlightedCodeBlock).not.toHaveBeenCalled();
    expect(inFlightRef.current).toBe(false);
  });

  test("drops a second call while the first is still waiting", async () => {
    let respond: (value: RangeInFileWithContents | null) => void = () => {};
    ideMessenger.responseHandlers.getAutoAttachSelection = () =>
      new Promise((resolve) => {
        respond = resolve;
      });
    const requestSpy = vi.spyOn(ideMessenger, "request");

    const first = autoAttachSelection(
      editor,
      ideMessenger,
      "main",
      inFlightRef,
    );
    const second = await autoAttachSelection(
      editor,
      ideMessenger,
      "main",
      inFlightRef,
    );

    expect(second).toBe(false);
    expect(requestSpy).toHaveBeenCalledTimes(1);

    respond(selection);
    expect(await first).toBe(true);
    expect(insertHighlightedCodeBlock).toHaveBeenCalledTimes(1);
    expect(inFlightRef.current).toBe(false);
  });
});
