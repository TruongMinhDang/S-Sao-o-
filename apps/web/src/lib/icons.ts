import {
  LayoutDashboard,
  Users,
  Star,
  Trophy,
  BookOpen,
  Bell,
  Shield,
  UserRound,
} from "lucide-react";

export const Icons = {
  dashboard: LayoutDashboard,
  users: Users,
  star: Star,
  trophy: Trophy,
  rules: BookOpen,
  bell: Bell,
  admin: Shield,
  profile: UserRound,
} as const;

export type IconKey = keyof typeof Icons;
