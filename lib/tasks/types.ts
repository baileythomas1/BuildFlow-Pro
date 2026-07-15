export type TaskStatusValue = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskAssignee = {
  id: string;
  name: string;
  email: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatusValue;
  order: number;
  dueDate: string | null;
  assignee: TaskAssignee | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupedTasks = Record<TaskStatusValue, Task[]>;
