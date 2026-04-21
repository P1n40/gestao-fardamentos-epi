import { Category, UserRole } from "@prisma/client";

export type { Category, UserRole };

export interface EmployeeWithPosition {
  id: string;
  name: string;
  documentId: string;
  position: {
    name: string;
  };
}

export interface MaterialWithStats {
  id: string;
  name: string;
  category: Category;
  stock: number;
  caNumber?: string;
}
