import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import { AssignedTaskRow } from "./assigned-task-row";

vi.mock("react-i18next", async (original) => ({
  ...(await original<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className: string;
  }) => (
    <a href="/task" className={className}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const task = (trackedSeconds: number): AssignedTask => ({
  id: "task-1",
  projectId: "project-1",
  number: 7,
  title: "Write spec",
  status: "to-do",
  statusName: "To do",
  statusIcon: null,
  priority: "medium",
  dueDate: null,
  projectName: "Alpha",
  projectSlug: "ALP",
  projectIcon: null,
  labels: [],
  trackedSeconds,
});

it("shows tracked time when asked", () => {
  render(<AssignedTaskRow task={task(5100)} workspaceId="w" showTrackedTime />);
  expect(screen.getByRole("link")).toHaveTextContent(
    "tasks:properties.timeTracked: 1h 25m",
  );
});

it("hides tracked time under a minute and by default", () => {
  const { unmount } = render(
    <AssignedTaskRow task={task(30)} workspaceId="w" showTrackedTime />,
  );
  expect(screen.queryByText(/timeTracked/)).toBeNull();
  unmount();

  render(<AssignedTaskRow task={task(5100)} workspaceId="w" />);
  expect(screen.queryByText("1h 25m")).toBeNull();
});
