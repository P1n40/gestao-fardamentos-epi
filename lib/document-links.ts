interface DocumentLinkParams {
  type: "UNIFORM" | "PPE";
  employeeId: string;
  deliveryId?: string | null;
  version?: number | null;
}

export function getDocumentHref({
  type,
  employeeId,
  deliveryId,
  version,
}: DocumentLinkParams): string | null {
  if (type === "PPE") {
    return version ? `/colaboradores/${employeeId}/ficha-epi?version=${version}` : null;
  }

  return deliveryId ? `/entregas/${deliveryId}/recibo` : null;
}

export function getDocumentTypeLabel(type: "UNIFORM" | "PPE") {
  return type === "PPE" ? "Ficha Histórica de EPI" : "Recibo de Entrega";
}

export function getDocumentActionLabel(type: "UNIFORM" | "PPE", version?: number | null) {
  if (type === "PPE") {
    return version ? `Reimprimir Ficha EPI v${version}` : "Abrir Ficha EPI";
  }

  return "Reimprimir Recibo";
}
