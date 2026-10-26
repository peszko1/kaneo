import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TwoFactorPasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  disabled?: boolean;
};

export function TwoFactorPasswordField({
  value,
  onChange,
  error,
  disabled,
}: TwoFactorPasswordFieldProps) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("settings:securityPage.currentPassword")}</Label>
      <Input
        id={id}
        type="password"
        autoComplete="current-password"
        placeholder={t("settings:securityPage.currentPasswordPlaceholder")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoFocus
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
