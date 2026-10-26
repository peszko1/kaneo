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
import { BackupCodesList } from "./backup-codes-list";
import { TwoFactorPasswordField } from "./two-factor-password-field";

type TwoFactorPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  destructive?: boolean;
  // Resolves to new backup codes to show, or nothing to close the dialog.
  // Rejects when the password is wrong.
  onConfirm: (password: string) => Promise<string[] | undefined>;
};

export function TwoFactorPasswordDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  destructive,
  onConfirm,
}: TwoFactorPasswordDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword("");
      setCodes(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (codes) return handleOpenChange(false);
    setPending(true);
    setError(null);
    try {
      const result = await onConfirm(password);
      if (result) setCodes(result);
      else handleOpenChange(false);
    } catch {
      setError(t("settings:securityPage.twoFactor.wrongPassword"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {codes
              ? t("settings:securityPage.twoFactor.codesStep")
              : description}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogPanel>
            {codes ? (
              <BackupCodesList codes={codes} />
            ) : (
              <TwoFactorPasswordField
                value={password}
                onChange={setPassword}
                error={error}
                disabled={pending}
              />
            )}
          </DialogPanel>
          <DialogFooter>
            {codes ? null : (
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={pending} />
                }
              >
                {t("common:actions.cancel")}
              </DialogClose>
            )}
            <Button
              type="submit"
              variant={destructive && !codes ? "destructive" : "default"}
              loading={pending}
              disabled={!codes && !password}
            >
              {codes ? t("settings:securityPage.twoFactor.done") : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
