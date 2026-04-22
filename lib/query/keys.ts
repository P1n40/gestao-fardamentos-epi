export const queryKeys = {
  employees: (params: {
    search?: string;
    positionId?: string;
    status?: "active" | "inactive" | "all";
    page?: number;
    pageSize?: number;
  }) => ["employees", params] as const,
  materials: (params: { onlyActive?: boolean } = {}) => ["materials", params] as const,
  stockOverview: () => ["stock-overview"] as const,
  deliveries: (params: { limit?: number; type?: "UNIFORM" | "PPE" } = {}) =>
    ["deliveries", params] as const,
};
