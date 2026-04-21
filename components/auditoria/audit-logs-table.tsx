import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AuditLogItem {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  } | null;
}

export function AuditLogsTable({ logs }: { logs: AuditLogItem[] }) {
  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-700 border-green-200";
      case "UPDATE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "DELETE":
        return "bg-red-100 text-red-700 border-red-200";
      case "LOGIN":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "IMPORT":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "STOCK_MOVEMENT":
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead>Ação</TableHead>
          <TableHead>Entidade</TableHead>
          <TableHead>Detalhes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
              {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{log.user?.name || "Sistema"}</span>
                <span className="text-muted-foreground text-[10px]">{log.user?.email}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={getActionColor(log.action)}>
                {log.action}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-sm text-zinc-600">
              {log.entity || "-"}
              {log.entityId && (
                <span className="block text-[9px] opacity-50">ID: {log.entityId}</span>
              )}
            </TableCell>
            <TableCell className="max-w-md truncate text-sm">{log.details || "-"}</TableCell>
          </TableRow>
        ))}
        {logs.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
              Nenhuma atividade registrada.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
