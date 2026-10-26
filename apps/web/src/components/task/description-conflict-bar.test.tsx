import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import {
  clearDescriptionConflicts,
  descriptionConflict,
  keepDescriptionConflict,
} from "@/lib/offline/description-conflicts";
import DescriptionConflictBar from "./description-conflict-bar";

const { updateDescription } = vi.hoisted(() => ({
  updateDescription: vi.fn(),
}));
vi.mock("@/lib/offline/saved-session", () => ({
  savedSessionUserId: () => "user-1",
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/queries/task/use-get-task", () => ({
  default: () => ({
    data: { id: "t1", projectId: "p1", description: "Theirs" },
  }),
}));
vi.mock("@/hooks/mutations/task/use-update-task-description", () => ({
  useUpdateTaskDescription: () => ({
    mutateAsync: updateDescription,
    isPending: false,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearDescriptionConflicts();
  keepDescriptionConflict({
    taskId: "t1",
    projectId: "p1",
    mine: "Mine",
    at: 1,
  });
});

afterEach(cleanup);

describe("DescriptionConflictBar", () => {
  it("shows my version on request", () => {
    render(<DescriptionConflictBar taskId="t1" />);
    expect(screen.queryByText("Mine")).toBeNull();

    fireEvent.click(screen.getByText("tasks:detail.conflict.showMine"));

    expect(screen.getByText("Mine")).toBeTruthy();
  });

  it("saves my version over theirs when I keep mine", async () => {
    updateDescription.mockResolvedValue({});
    render(<DescriptionConflictBar taskId="t1" />);

    fireEvent.click(screen.getByText("tasks:detail.conflict.keepMine"));

    await vi.waitFor(() => expect(descriptionConflict("t1")).toBeUndefined());
    expect(updateDescription).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", description: "Mine" }),
    );
  });

  it("drops my version when I use theirs", () => {
    render(<DescriptionConflictBar taskId="t1" />);

    fireEvent.click(screen.getByText("tasks:detail.conflict.useTheirs"));

    expect(updateDescription).not.toHaveBeenCalled();
    expect(descriptionConflict("t1")).toBeUndefined();
    expect(screen.queryByText("tasks:detail.conflict.title")).toBeNull();
  });
});
