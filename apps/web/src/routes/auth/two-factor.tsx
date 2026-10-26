import {
  createFileRoute,
  Link,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { authLinkClassName } from "@/components/auth/auth-link-class";
import { getSafeRedirectPath } from "@/components/auth/auth-methods";
import { AuthPage } from "@/components/auth/auth-page";
import { TwoFactorCodeForm } from "@/components/auth/two-factor-code-form";
import PageTitle from "@/components/page-title";

export const Route = createFileRoute("/auth/two-factor")({
  component: TwoFactor,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect as string | undefined,
  }),
});

function TwoFactor() {
  const { t } = useTranslation();
  const { history } = useRouter();
  const { redirect } = useSearch({ from: "/auth/two-factor" });
  const destination = getSafeRedirectPath(redirect) ?? "/dashboard";

  return (
    <>
      <PageTitle title={t("auth:twoFactor.pageTitle")} />
      <AuthPage
        title={t("auth:twoFactor.heading")}
        description={t("auth:twoFactor.description")}
      >
        <TwoFactorCodeForm onSuccess={() => history.push(destination)} />
        <p className="pt-8 text-muted-foreground text-sm">
          <Link to="/auth/sign-in" className={authLinkClassName}>
            {t("auth:twoFactor.backToSignIn")}
          </Link>
        </p>
      </AuthPage>
    </>
  );
}
