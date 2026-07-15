export type NotificationItem = {
  id: string;
  type: string;
  readAt: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};
