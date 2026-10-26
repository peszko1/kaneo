import { ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import useListAccounts from "@/hooks/queries/use-list-accounts";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { EnableTwoFactorDialog } from "./enable-two-factor-dialog";
import { TwoFactorPasswordDialog } from "./two-factor-password-dialog";

type OpenDialog = "enable" | "disable" | "codes" | null;

export function TwoFactorSettings() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  const { data: accounts } = useListAccounts();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const enabled = session?.user.twoFactorEnabled === true;
  // Turning it on or off asks for the password, so it needs one.
  const hasPassword =
    accounts?.some((account) => account.providerId === "credential") ?? false;
  if (!hasPassword && !enabled) return null;

  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <SettingsSection title={t("settings:securityPage.twoFactor.sectionTitle")}>
      <SettingsCard>
        <SettingsRow
          icon={enabled ? <ShieldCheck /> : <ShieldOff />}
          title={t("settings:securityPage.twoFactor.title")}
          description={
            enabled
              ? t("settings:securityPage.twoFactor.onHint")
              : t("settings:securityPage.twoFactor.offHint")
          }
        >
          {enabled ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialog("codes")}
              >
                {t("settings:securityPage.twoFactor.newCodes")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialog("disable")}
              >
                {t("settings:securityPage.twoFactor.disable")}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialog("enable")}
            >
              {t("settings:securityPage.twoFactor.enable")}
            </Button>
          )}
        </SettingsRow>
      </SettingsCard>
      <EnableTwoFactorDialog open={dialog === "enable"} onOpenChange={close} />
      <TwoFactorPasswordDialog
        open={dialog === "disable"}
        onOpenChange={close}
        title={t("settings:securityPage.twoFactor.disableTitle")}
        description={t("settings:securityPage.twoFactor.disableDescription")}
        submitLabel={t("settings:securityPage.twoFactor.disable")}
        destructive
        onConfirm={async (password) => {
          const result = await authClient.twoFactor.disable({ password });
          if (result.error) throw result.error;
          toast.success(t("settings:securityPage.twoFactor.disabled"));
          return undefined;
        }}
      />
      <TwoFactorPasswordDialog
        open={dialog === "codes"}
        onOpenChange={close}
        title={t("settings:securityPage.twoFactor.newCodesTitle")}
        description={t("settings:securityPage.twoFactor.newCodesDescription")}
        submitLabel={t("settings:securityPage.twoFactor.newCodes")}
        onConfirm={async (password) => {
          const result = await authClient.twoFactor.generateBackupCodes({
            password,
          });
          if (result.error || !result.data) throw result.error;
          return result.data.backupCodes;
        }}
      />
    </SettingsSection>
  );
}
