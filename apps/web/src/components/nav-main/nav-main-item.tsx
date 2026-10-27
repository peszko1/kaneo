import type { LucideIcon } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { ItemCount } from "./item-count";

export type NavItem = {
  title: string;
  icon: LucideIcon;
  url: string;
  count?: number;
  emphasizeCount?: boolean;
};

export function NavMainItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isActive}
        size="default"
        className="h-8 text-sm"
        onClick={onClick}
      >
        <item.icon aria-hidden="true" />
        <span>{item.title}</span>
        {item.count ? (
          <ItemCount count={item.count} emphasize={item.emphasizeCount} />
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
