import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Home,
  Settings2,
  ShieldCheck,
  UsersRound,
  Wrench,
} from 'lucide-react';

export type View =
  | 'dashboard'
  | 'orders'
  | 'planning'
  | 'detail'
  | 'create'
  | 'technician'
  | 'technicians'
  | 'clients'
  | 'assets'
  | 'reports'
  | 'audit'
  | 'configuration';

export type NavItem = {
  id: View;
  label: string;
  icon: LucideIcon;
};

export const mainNavigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'orders', label: 'Órdenes', icon: ClipboardList },
  { id: 'planning', label: 'Planificación', icon: CalendarDays },
  { id: 'technician', label: 'Técnico', icon: Wrench },
];

export const secondaryNavigation: NavItem[] = [
  { id: 'technicians', label: 'Técnicos', icon: UsersRound },
  { id: 'clients', label: 'Clientes / instalaciones', icon: Building2 },
  { id: 'reports', label: 'Informes', icon: BarChart3 },
  { id: 'audit', label: 'Auditoría', icon: ShieldCheck },
  { id: 'configuration', label: 'Configuración', icon: Settings2 },
];
