export type PortalOverview = {
  project: {
    id: string;
    name: string;
    address: string;
    status: "PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETE";
    health: "ON_TRACK" | "AT_RISK" | "DELAYED";
    startDate: string | null;
    targetDate: string | null;
  };
  budgetSummary: { approved: string; spent: string };
  upcomingMilestones: {
    id: string;
    description: string;
    amount: string;
    dueDate: string | null;
    status: "PENDING" | "PAID" | "OVERDUE";
  }[];
};

export type PortalFile = {
  id: string;
  type: string;
  createdAt: string;
  uploader: { id: string; name: string };
};

export type PortalInvoice = {
  id: string;
  description: string;
  amount: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate: string | null;
};

export type PortalComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
};

export type PortalEstimate = {
  id: string;
  title: string | null;
  status: "SENT" | "APPROVED" | "REJECTED";
  total: string;
  createdAt: string;
};

export type PortalEstimateLineItem = {
  id: string;
  description: string;
  quantity: string;
  unitCost: string;
  markup: string;
};

export type PortalEstimateDetail = PortalEstimate & {
  lineItems: PortalEstimateLineItem[];
};
