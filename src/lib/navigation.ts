import {
  LayoutDashboard,
  BadgeCheck,
  Wallet,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Value Feed",
    href: "/value-bets",
    icon: LayoutDashboard,
    description: "AI-fundne value-odds",
  },
  {
    label: "Resultater",
    href: "/results",
    icon: BadgeCheck,
    description: "AI'ens track record — hver post gradueret",
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: Wallet,
    description: "P&L, ROI og spilhistorik",
  },
  {
    label: "Profil",
    href: "/profile",
    icon: UserRound,
    description: "Bankroll, bookmakere og alerts",
  },
];
