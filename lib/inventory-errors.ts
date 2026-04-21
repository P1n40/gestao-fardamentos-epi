/**
 * Custom error class for inventory-related operations.
 * Helps in identifying business logic failures vs system failures.
 */
export class InventoryError extends Error {
  constructor(
    message: string,
    public code: string = "INVENTORY_ERROR",
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export class InsufficientStockError extends InventoryError {
  constructor(materialName: string, available: number, requested: number) {
    super(
      `Saldo insuficiente para o material "${materialName}". Disponível: ${available}, Solicitado: ${requested}.`,
      "INSUFFICIENT_STOCK",
    );
    this.name = "InsufficientStockError";
  }
}
