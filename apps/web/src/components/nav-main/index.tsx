import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  CircleCheck,
  Ellipsis,
  House,
  Inbox,
  ListChecks,
  Mail,
  SquareKanban,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePendingInvitations } from "@/hooks/queries/invitation/use-pending-invitations";
import useGetNotifications from "@/hooks/queries/notification/use-get-notifications";
import useGetAssignedTasks from "@/hooks/queries/task/use-get-assigned-tasks";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { cn } from "@/lib/cn";
import { ItemCount } from "./item-count";
import { type NavItem, NavMainItem } from "./nav-main-item";

export function NavMain() {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();
  const navigate = useNavigate();
  const pathname = useLocation({
    select: (location) => location.pathname.replace(/\/+$/, ""),
  });
  const { data: invitations = [] } = usePendingInvitations();
  const { data: notifications = [] } = useGetNotifications(workspace?.id);
  const { data: assignedTasks } = useGetAssignedTasks(workspace?.id, true);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!workspace) return null;

  const homeUrl = `/dashboard/workspace/${workspace.id}`;
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const navItems: NavItem[] = [
    { title: t("navigation:sidebar.home"), icon: House, url: homeUrl },
    {
      title: t("navigation:sidebar.habits"),
      icon: ListChecks,
      url: "/dashboard/habits",
    },
    {
      title: t("navigation:sidebar.globalBoard"),
      icon: SquareKanban,
      url: "/dashboard/global-board",
    },
  ];
  const moreItems: NavItem[] = [
    {
      title: t("navigation:sidebar.inbox"),
      icon: Inbox,
      url: `${homeUrl}/inbox`,
      count: unreadCount,
      emphasizeCount: true,
    },
    {
      title: t("navigation:sidebar.myTasks"),
      icon: CircleCheck,
      url: `${homeUrl}/my-tasks`,
      count: assignedTasks?.total,
    },
    {
      title: t("navigation:sidebar.members"),
      icon: Users,
      url: `${homeUrl}/members`,
    },
  ];

  // Invitations to other workspaces only matter while one is waiting.
  if (invitations.length > 0) {
    moreItems.push({
      title: t("navigation:sidebar.invitations"),
      icon: Mail,
      url: "/dashboard/invitations",
      count: invitations.length,
      emphasizeCount: true,
    });
  }

  // The page you are on stays visible, and so does anything waiting for you.
  const showMore = moreOpen || moreItems.some((item) => item.url === pathname);
  const waiting = moreItems
    .filter((item) => item.emphasizeCount)
    .reduce((sum, item) => sum + (item.count ?? 0), 0);

  return (
    <SidebarGroup className="gap-1 p-2">
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {navItems.map((item) => (
            <NavMainItem
              key={item.url}
              item={item}
              isActive={pathname === item.url}
              onClick={() => navigate({ to: item.url })}
            />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("navigation:sidebar.more")}
              aria-expanded={showMore}
              size="default"
              className="h-8 text-sm text-muted-foreground"
              onClick={() => setMoreOpen(!showMore)}
            >
              <Ellipsis aria-hidden="true" />
              <span>{t("navigation:sidebar.more")}</span>
              {!showMore && waiting > 0 ? (
                <ItemCount count={waiting} emphasize />
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "ml-auto transition-transform motion-reduce:transition-none",
                  showMore && "rotate-180",
                  !showMore && waiting > 0 && "ml-0",
                )}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showMore &&
            moreItems.map((item) => (
              <NavMainItem
                key={item.url}
                item={item}
                isActive={pathname === item.url}
                onClick={() => navigate({ to: item.url })}
              />
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
