import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

type BackupCodesListProps = { codes: string[] };

export function BackupCodesList({ codes }: BackupCodesListProps) {
  const { t } = useTranslation();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(t("settings:securityPage.twoFactor.codesCopied"));
    } catch {
      toast.error(t("settings:securityPage.twoFactor.copyFailed"));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {t("settings:securityPage.twoFactor.codesHint")}
      </p>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border bg-muted/40 p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Copy aria-hidden="true" />
        {t("settings:securityPage.twoFactor.copyCodes")}
      </Button>
    </div>
  );
}
