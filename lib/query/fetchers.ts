type QueryValue = string | number | boolean | null | undefined;

function buildQueryString(params: Record<string, QueryValue>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar dados (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function fetchEmployeesQuery(params: {
  search?: string;
  positionId?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  pageSize?: number;
}) {
  return fetchJson<{
    items: unknown[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(
    `/api/colaboradores${buildQueryString({
      search: params.search,
      position: params.positionId,
      status: params.status,
      page: params.page,
      pageSize: params.pageSize,
    })}`,
  );
}

export async function fetchMaterialsQuery(params: { onlyActive?: boolean } = {}) {
  return fetchJson<unknown[]>(
    `/api/materiais${buildQueryString({ onlyActive: params.onlyActive })}`,
  );
}

export async function fetchStockOverviewQuery() {
  return fetchJson<{
    materials: unknown[];
    recentTransactions: unknown[];
  }>("/api/estoque");
}

export async function fetchDeliveriesQuery(params: { limit?: number; type?: "UNIFORM" | "PPE" }) {
  return fetchJson<unknown[]>(
    `/api/entregas${buildQueryString({ limit: params.limit, type: params.type })}`,
  );
}
