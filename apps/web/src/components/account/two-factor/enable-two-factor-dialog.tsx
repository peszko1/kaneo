import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { BackupCodesList } from "./backup-codes-list";
import { TotpQrCode } from "./totp-qr-code";
import { TwoFactorPasswordField } from "./two-factor-password-field";

const CODE_LENGTH = 6;
const slots = Array.from({ length: CODE_LENGTH }, (_, index) => index);

type Step =
  | { name: "password" }
  | { name: "scan"; totpURI: string; backupCodes: string[] }
  | { name: "codes"; backupCodes: string[] };

type EnableTwoFactorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EnableTwoFactorDialog({
  open,
  onOpenChange,
}: EnableTwoFactorDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>({ name: "password" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStep({ name: "password" });
      setPassword("");
      setCode("");
      setError(null);
    }
    onOpenChange(next);
  };

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(t("settings:securityPage.twoFactor.failed"));
    } finally {
      setPending(false);
    }
  };

  const start = () =>
    run(async () => {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error || !result.data) {
        setError(t("settings:securityPage.twoFactor.wrongPassword"));
        return;
      }
      setStep({ name: "scan", ...result.data });
    });

  const confirm = (value: string) =>
    run(async () => {
      if (step.name !== "scan") return;
      const result = await authClient.twoFactor.verifyTotp({ code: value });
      if (result.error) {
        setError(t("auth:twoFactor.invalidCode"));
        setCode("");
        return;
      }
      toast.success(t("settings:securityPage.twoFactor.enabled"), {
        icon: ShieldCheck,
      });
      setStep({ name: "codes", backupCodes: step.backupCodes });
    });

  const secret =
    step.name === "scan"
      ? (new URL(step.totpURI).searchParams.get("secret") ?? "")
      : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("settings:securityPage.twoFactor.enableTitle")}
          </DialogTitle>
          <DialogDescription>
            {step.name === "password"
              ? t("settings:securityPage.twoFactor.passwordStep")
              : step.name === "scan"
                ? t("settings:securityPage.twoFactor.scanStep")
                : t("settings:securityPage.twoFactor.codesStep")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (step.name === "password") void start();
            else if (step.name === "scan") void confirm(code);
            else handleOpenChange(false);
          }}
        >
          <DialogPanel className="space-y-4">
            {step.name === "password" ? (
              <TwoFactorPasswordField
                value={password}
                onChange={setPassword}
                error={error}
                disabled={pending}
              />
            ) : null}
            {step.name === "scan" ? (
              <>
                <div className="flex flex-col items-center gap-2">
                  <TotpQrCode
                    uri={step.totpURI}
                    label={t("settings:securityPage.twoFactor.qrLabel")}
                  />
                  <p className="text-center text-muted-foreground text-xs">
                    {t("settings:securityPage.twoFactor.manualKey")}{" "}
                    <code className="break-all font-mono text-foreground">
                      {secret}
                    </code>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="two-factor-setup-code">
                    {t("auth:twoFactor.codeLabel")}
                  </Label>
                  <InputOTP
                    id="two-factor-setup-code"
                    maxLength={CODE_LENGTH}
                    value={code}
                    onChange={(value) => {
                      setCode(value);
                      setError(null);
                      if (value.length === CODE_LENGTH && !pending)
                        void confirm(value);
                    }}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={pending}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      error ? "two-factor-setup-error" : undefined
                    }
                  >
                    <InputOTPGroup className="grid w-full grid-cols-6 gap-1.5">
                      {slots.map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-10 w-full"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {error ? (
                    <p
                      id="two-factor-setup-error"
                      role="alert"
                      className="text-destructive text-xs"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
            {step.name === "codes" ? (
              <BackupCodesList codes={step.backupCodes} />
            ) : null}
          </DialogPanel>
          <DialogFooter>
            {step.name !== "codes" ? (
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={pending} />
                }
              >
                {t("common:actions.cancel")}
              </DialogClose>
            ) : null}
            <Button
              type="submit"
              loading={pending}
              disabled={
                (step.name === "password" && !password) ||
                (step.name === "scan" && code.length !== CODE_LENGTH)
              }
            >
              {step.name === "password"
                ? t("settings:securityPage.twoFactor.continue")
                : step.name === "scan"
                  ? t("settings:securityPage.twoFactor.confirm")
                  : t("settings:securityPage.twoFactor.done")}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
