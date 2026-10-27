import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import useCreateTask from "@/hooks/mutations/task/use-create-task";
import { toast } from "@/lib/toast";

// One line to dump an idea: Enter saves it to the inbox backlog.
export function IdeaCapture({ inboxId }: { inboxId: string }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const { mutate: createTask } = useCreateTask();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const idea = title.trim();
        if (!idea) return;
        setTitle("");
        createTask(
          {
            title: idea,
            description: "",
            projectId: inboxId,
            userId: null,
            status: "planned",
            priority: "no-priority",
          },
          {
            onError: (error) => {
              setTitle((current) => current || idea);
              toast.error(
                error instanceof Error
                  ? error.message
                  : t("tasks:ideas.addError"),
              );
            },
          },
        );
      }}
    >
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t("tasks:ideas.placeholder")}
        aria-label={t("tasks:ideas.placeholder")}
        autoFocus
      />
    </form>
  );
}
