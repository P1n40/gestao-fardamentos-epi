import Papa from "papaparse";
import * as XLSX from "xlsx";

export type RawRow = Record<string, any>;

export interface ParseResult {
  data: RawRow[];
  errors: string[];
}

/**
 * Robust parser for CSV and Excel files.
 */
export class FileParser {
  /**
   * Parses a buffer based on the file type.
   */
  static async parse(file: File): Promise<ParseResult> {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      return this.parseCSV(file);
    } else if (["xlsx", "xls"].includes(extension || "")) {
      return this.parseExcel(file);
    } else {
      throw new Error("Formato de arquivo não suportado. Use CSV ou Excel.");
    }
  }

  private static parseCSV(file: File): Promise<ParseResult> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve({
            data: results.data as RawRow[],
            errors: results.errors.map((e) => `CSV Error: ${e.message} at row ${e.row}`),
          });
        },
        error: (error) => {
          resolve({
            data: [],
            errors: [`Erro ao ler CSV: ${error.message}`],
          });
        },
      });
    });
  }

  private static async parseExcel(file: File): Promise<ParseResult> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as RawRow[];

      return {
        data,
        errors: [],
      };
    } catch (error: any) {
      return {
        data: [],
        errors: [`Erro ao ler Excel: ${error.message}`],
      };
    }
  }
}
