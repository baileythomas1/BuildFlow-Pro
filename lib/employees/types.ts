export type EmployeeRoleValue = "OWNER" | "ADMIN" | "PM" | "EMPLOYEE" | "CLIENT";

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRoleValue;
  hourlyRate: string | null;
  assignedProjects: { id: string; name: string }[];
};
