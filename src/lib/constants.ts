import { LayoutDashboard, FileUp, FileText } from 'lucide-react';
export const NAV_ITEMS = [
  {
    name: 'Data Ingest',
    icon: FileUp,
  },
  {
    name: 'Statement Visualizer',
    icon: LayoutDashboard,
  },
  {
    name: 'Analyst Report',
    icon: FileText,
  },
] as const;
export type ViewName = (typeof NAV_ITEMS)[number]['name'];