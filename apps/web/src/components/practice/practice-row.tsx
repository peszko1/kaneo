import { useTranslation } from "react-i18next";
import { PreferenceSwitchRow } from "@/components/settings/preferences/preference-switch-row";
import useSetPracticeEnabled from "@/hooks/mutations/practice/use-set-practice-enabled";
import useGetPractice from "@/hooks/queries/practice/use-get-practice";
import { toast } from "@/lib/toast";

export function PracticeRow() {
  const { t } = useTranslation();
  const { data } = useGetPractice();
  const setEnabled = useSetPracticeEnabled();

  return (
    <PreferenceSwitchRow
      title={t("settings:preferencesPage.practiceTitle")}
      description={t("settings:preferencesPage.practiceDescription")}
      checked={data?.enabled ?? false}
      onCheckedChange={(enabled) =>
        setEnabled
          .mutateAsync({ enabled, version: data?.version ?? 0 })
          .catch(() => toast.error(t("settings:preferencesPage.practiceError")))
      }
    />
  );
}
