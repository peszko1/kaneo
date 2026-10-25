import { Editor } from "@tiptap/core";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { BulletToTaskItem } from "./bullet-to-task-item";

let editor: Editor;

function bullets(...items: string[]) {
  editor?.destroy();
  editor = new Editor({
    extensions: [
      StarterKit.configure({ trailingNode: false }),
      TaskList,
      TaskItem,
      BulletToTaskItem,
    ],
    content: {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: items.map((text) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: text ? [{ type: "text", text }] : [],
              },
            ],
          })),
        },
      ],
    },
  });
  editor.commands.focus("end");
}

function typeSpace() {
  const { view } = editor;
  const { from, to } = view.state.selection;
  const handled = view.someProp("handleTextInput", (handle) =>
    handle(view, from, to, " ", () => view.state.tr.insertText(" ", from, to)),
  );
  if (!handled) view.dispatch(view.state.tr.insertText(" ", from, to));
}

afterEach(() => editor?.destroy());

describe("BulletToTaskItem", () => {
  it("turns a bullet that starts with [ ] into an open task", () => {
    bullets("[ ]");
    typeSpace();
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "taskList",
      content: [{ type: "taskItem", attrs: { checked: false } }],
    });
  });

  it("turns [x] into a done task", () => {
    bullets("[x]");
    typeSpace();
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "taskList",
      content: [{ type: "taskItem", attrs: { checked: true } }],
    });
  });

  it("keeps the earlier bullets as bullets", () => {
    bullets("Plan", "[ ]");
    typeSpace();
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual([
      "bulletList",
      "taskList",
    ]);
  });
});
