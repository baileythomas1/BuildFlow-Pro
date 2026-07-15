export type DashboardData = {
  activeProjectCount: number;
  healthCounts: { ON_TRACK: number; AT_RISK: number; DELAYED: number };
  overdueTaskCount: number;
  outstandingInvoiceTotal: string;
  upcomingMilestones: {
    id: string;
    description: string;
    amount: string;
    dueDate: string | null;
    status: "PENDING" | "PAID" | "OVERDUE";
    project: { id: string; name: string };
  }[];
};
