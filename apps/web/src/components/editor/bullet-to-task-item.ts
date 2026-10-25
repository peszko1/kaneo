import { Extension, InputRule } from "@tiptap/core";

// Typing "- [ ] " makes a bullet first, so "[ ] " then arrives inside a
// bullet item, where the task item's own rule does not apply.
export const BulletToTaskItem = Extension.create({
  name: "bulletToTaskItem",
  priority: 110,

  addInputRules() {
    return [
      new InputRule({
        find: /^\s*\[([ xX])?\]\s$/,
        handler: ({ state, range, match, chain }) => {
          const { $from } = state.selection;
          if ($from.depth < 3) return null;
          const item = $from.node($from.depth - 1);
          const list = $from.node($from.depth - 2);
          if (
            item.type.name !== "listItem" ||
            list.type.name !== "bulletList" ||
            $from.index($from.depth - 1) !== 0
          ) {
            return null;
          }
          chain()
            .deleteRange(range)
            .liftListItem("listItem")
            .toggleTaskList()
            .updateAttributes("taskItem", {
              checked: match[1]?.toLowerCase() === "x",
            })
            .run();
        },
      }),
    ];
  },
});
