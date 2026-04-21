# Sistema de Gestao de Fardamentos e EPI

Aplicacao interna para controle de colaboradores, cargos, materiais, kits por cargo, entregas, documentos, historico, auditoria e planejamento de compras.

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma 7
- PostgreSQL
- NextAuth

## Ambiente local

1. Instale dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` a partir de `.env.example`.

3. Valide a configuracao:

```bash
npm run env:check
```

4. Gere o client do Prisma:

```bash
npm run prisma:generate
```

5. Aplique o banco:

```bash
npm run prisma:push
```

6. Execute o seed inicial:

```bash
npm run seed:initial
```

7. Suba o projeto:

```bash
npm run dev
```

## Credenciais iniciais

O seed cria os usuarios:

- `admin@empresa.com`
- `rh@empresa.com`
- `gestor@empresa.com`
- `op@empresa.com`

A senha inicial vem de `SEED_DEFAULT_PASSWORD`. Se a variavel nao estiver definida, o fallback atual e `admin123`.

## Scripts principais

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`
- `npm run env:check`
- `npm run homologation:check`
- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run prisma:push`
- `npm run seed:initial`
- `npm run setup:staging`
- `npm run setup:production`

## Saude da aplicacao

Use o endpoint:

- `GET /api/health`

Resposta esperada:

- `status: ok`
- `database: up`

## Implantacao

O guia operacional completo esta em:

- [doc/IMPLANTACAO_STAGING_PRODUCAO.md](doc/IMPLANTACAO_STAGING_PRODUCAO.md)

## Homologacao

Antes do go-live, execute o pre-check e siga o roteiro guiado:

```bash
npm run homologation:check
```

- [doc/HOMOLOGACAO_GUIADA.md](doc/HOMOLOGACAO_GUIADA.md)
- [doc/HOMOLOGACAO_EVIDENCIAS.md](doc/HOMOLOGACAO_EVIDENCIAS.md)
