export type EstimateStatusValue = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

export type EstimateLineItem = {
  id: string;
  description: string;
  quantity: string;
  unitCost: string;
  markup: string;
  createdAt: string;
};

export type ChangeOrder = {
  id: string;
  description: string;
  total: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  lineItems: EstimateLineItem[];
};

export type EstimateSummary = {
  id: string;
  title: string | null;
  status: EstimateStatusValue;
  total: string;
  approvedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type EstimateDetail = EstimateSummary & {
  updatedAt: string;
  lineItems: EstimateLineItem[];
  changeOrders: ChangeOrder[];
  project: { id: string; name: string; address: string };
};
