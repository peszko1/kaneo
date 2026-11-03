import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Layout from "@/components/common/layout";
import { WarmupView } from "@/components/warmup/warmup-view";
import PageTitle from "@/components/page-title";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/warmup",
)({ component: WarmupPage });

function WarmupPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageTitle title={t("navigation:warmup.title")} />
      <Layout>
        <Layout.Header>
          <div className="flex w-full items-center gap-1">
            <SidebarTrigger className="-ml-1 h-6 w-6" />
            <Separator
              orientation="vertical"
              className="mx-1.5 data-[orientation=vertical]:h-2.5"
            />
            <h1 className="text-card-foreground text-xs">
              {t("navigation:warmup.title")}
            </h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <WarmupView />
        </Layout.Content>
      </Layout>
    </>
  );
}
