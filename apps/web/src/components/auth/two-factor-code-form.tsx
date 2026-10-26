import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { authMessageClassName } from "@/components/auth/auth-form-styles";
import { authLinkClassName } from "@/components/auth/auth-link-class";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const CODE_LENGTH = 6;
const slots = Array.from({ length: CODE_LENGTH }, (_, index) => ({
  id: `slot-${index}`,
  index,
}));

type TwoFactorCodeFormProps = {
  onSuccess: () => void;
};

export function TwoFactorCodeForm({ onSuccess }: TwoFactorCodeFormProps) {
  const { t } = useTranslation();
  const id = useId();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async (value: string) => {
    const trimmed = value.trim();
    if (!useBackupCode && trimmed.length !== CODE_LENGTH) {
      setError(t("auth:twoFactor.codeLength"));
      return;
    }
    if (!trimmed) return;
    setIsVerifying(true);
    setError(null);
    const body = { code: trimmed, trustDevice };
    let result: Awaited<ReturnType<typeof authClient.twoFactor.verifyTotp>>;
    try {
      result = useBackupCode
        ? await authClient.twoFactor.verifyBackupCode(body)
        : await authClient.twoFactor.verifyTotp(body);
    } catch {
      setError(t("auth:twoFactor.failed"));
      setIsVerifying(false);
      return;
    }
    if (result.error) {
      const messages: Record<string, string> = {
        INVALID_CODE: t("auth:twoFactor.invalidCode"),
        INVALID_BACKUP_CODE: t("auth:twoFactor.invalidCode"),
        INVALID_TWO_FACTOR_COOKIE: t("auth:twoFactor.expired"),
        ACCOUNT_TEMPORARILY_LOCKED: t("auth:twoFactor.locked"),
      };
      setError(
        messages[result.error.code ?? ""] ??
          (result.error.message || t("auth:twoFactor.invalidCode")),
      );
      setIsVerifying(false);
      return;
    }
    onSuccess();
  };

  const switchMethod = () => {
    setUseBackupCode((value) => !value);
    setCode("");
    setError(null);
  };

  const codeId = `${id}-code`;
  const errorId = `${id}-error`;
  const invalid = error ? true : undefined;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void verify(code);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={codeId}>
          {useBackupCode
            ? t("auth:twoFactor.backupCodeLabel")
            : t("auth:twoFactor.codeLabel")}
        </Label>
        {useBackupCode ? (
          <Input
            id={codeId}
            size="lg"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            autoComplete="off"
            autoFocus
            disabled={isVerifying}
            aria-invalid={invalid}
            aria-describedby={error ? errorId : undefined}
          />
        ) : (
          <InputOTP
            id={codeId}
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(value) => {
              setCode(value);
              setError(null);
              if (value.length === CODE_LENGTH && !isVerifying)
                void verify(value);
            }}
            pattern={REGEXP_ONLY_DIGITS}
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            disabled={isVerifying}
            aria-invalid={invalid}
            aria-describedby={error ? errorId : undefined}
          >
            <InputOTPGroup className="grid w-full grid-cols-6 gap-1.5">
              {slots.map((slot) => (
                <InputOTPSlot
                  key={slot.id}
                  index={slot.index}
                  className="h-11 w-full text-base dark:bg-input/32"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        )}
        {error ? (
          <p id={errorId} role="alert" className={authMessageClassName}>
            {error}
          </p>
        ) : null}
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox
          checked={trustDevice}
          onCheckedChange={(checked) => setTrustDevice(checked === true)}
          disabled={isVerifying}
        />
        {t("auth:twoFactor.trustDevice")}
      </Label>
      <Button type="submit" size="lg" className="w-full" loading={isVerifying}>
        {t("auth:twoFactor.submit")}
      </Button>
      <button
        type="button"
        className={`${authLinkClassName} self-start text-sm`}
        disabled={isVerifying}
        onClick={switchMethod}
      >
        {useBackupCode
          ? t("auth:twoFactor.useAuthenticator")
          : t("auth:twoFactor.useBackupCode")}
      </button>
    </form>
  );
}
