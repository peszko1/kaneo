import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vite-plus/test";
import { TwoFactorCodeForm } from "./two-factor-code-form";

// The OTP input measures itself on mount, which jsdom cannot do.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
document.elementFromPoint = () => null;

const { verifyTotp, verifyBackupCode } = vi.hoisted(() => ({
  verifyTotp: vi.fn(),
  verifyBackupCode: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { twoFactor: { verifyTotp, verifyBackupCode } },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(async () => {
  // Drain input-otp's focus timers before jsdom goes away.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  cleanup();
  verifyTotp.mockReset();
  verifyBackupCode.mockReset();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("TwoFactorCodeForm", () => {
  it("remembers the device when asked and signs in", async () => {
    verifyTotp.mockResolvedValue({ data: {}, error: null });
    const onSuccess = vi.fn();
    render(<TwoFactorCodeForm onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "123456" },
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(verifyTotp).toHaveBeenCalledWith({
      code: "123456",
      trustDevice: true,
    });
  });

  it("shows an error for a wrong code", async () => {
    verifyTotp.mockResolvedValue({
      data: null,
      error: { code: "INVALID_CODE", message: "Invalid code" },
    });
    const onSuccess = vi.fn();
    render(<TwoFactorCodeForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "000000" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "auth:twoFactor.invalidCode",
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("signs in with a backup code", async () => {
    verifyBackupCode.mockResolvedValue({ data: {}, error: null });
    const onSuccess = vi.fn();
    render(<TwoFactorCodeForm onSuccess={onSuccess} />);

    fireEvent.click(
      screen.getByRole("button", { name: "auth:twoFactor.useBackupCode" }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "abcde-12345" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "auth:twoFactor.submit" }),
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(verifyBackupCode).toHaveBeenCalledWith({
      code: "abcde-12345",
      trustDevice: false,
    });
  });
});
