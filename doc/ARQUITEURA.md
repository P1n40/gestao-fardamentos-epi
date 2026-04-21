/\*\*

- Estrutura Modular (Monólito Modular)
-
- /modules
- /[domain]
-     /actions.ts    - Server Actions exclusivas do domínio
-     /services.ts   - Logica de acesso a dados (Prisma) e regras de negócio puras
-     /components/   - Componentes UI específicos do domínio
-     /types.ts      - Tipagens específicas do domínio
-
- /components
- /ui/ - Componentes base (shadcn)
- /shared/ - Componentes compartilhados entre domínios
-
- /lib
- /prisma.ts - Singleton do banco
- /audit.ts - Utilitário transversal de auditoria
- /env.ts - Validação de variáveis de ambiente
-
- /types
- /schemas.ts - Schemas de validação Zod globais
  \*/
  export const ARCHITECTURE_READY = true;
