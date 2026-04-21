import { EmployeeImportSchema } from "./schemas";
import { z } from "zod";

export interface RowValidationError {
  row: number;
  errors: string[];
}

export class ImportValidator {
  /**
   * Valida uma linha bruta conforme o mapeamento fornecido.
   */
  static validateRow(
    row: Record<string, unknown>,
    idx: number,
    mappings: Record<string, string>
  ): { success: true; data: any } | { success: false; errors: string[] } {
    const mappedData: Record<string, unknown> = {};
    
    // Transpõe os dados do arquivo para o schema do sistema
    Object.entries(mappings).forEach(([targetKey, sourceKey]) => {
      if (sourceKey !== "SKIP") {
        mappedData[targetKey] = row[sourceKey];
      }
    });

    const result = EmployeeImportSchema.safeParse(mappedData);

    if (!result.success) {
      const errorMap = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(errorMap).map(
        ([field, messages]) => `${field}: ${messages?.join(", ")}`
      );
      return { success: false, errors: errorMessages };
    }

    return { success: true, data: result.data };
  }

  /**
   * Validação em massa (Client-side use-case)
   */
  static validateAll(
    rows: Record<string, unknown>[],
    mappings: Record<string, string>
  ): { total: number; validCount: number; errors: RowValidationError[] } {
    const errors: RowValidationError[] = [];
    let validCount = 0;

    rows.forEach((row, i) => {
      const validation = this.validateRow(row, i + 1, mappings);
      if (validation.success) {
        validCount++;
      } else {
        errors.push({ row: i + 1, errors: validation.errors });
      }
    });

    return {
      total: rows.length,
      validCount,
      errors
    };
  }
}
