import {
  LayoutDashboard,
  Users,
  Star,
  Trophy,
  BookOpen,
  Bell,
  Shield,
  UserRound,
  School,
  LogIn,
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
  class: School,
  login: LogIn,
} as const;

export type IconKey = keyof typeof Icons;
