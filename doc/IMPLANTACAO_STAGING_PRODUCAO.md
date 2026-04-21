# Implantacao de Staging e Producao

## Objetivo

Este documento descreve o fluxo recomendado para preparar o ambiente, aplicar o banco, executar o seed inicial e validar o go-live do sistema de Gestao de Fardamentos e EPI.

## Variaveis obrigatorias

Use `.env.local` em desenvolvimento e configure as mesmas chaves no provedor de staging/producao:

- `APP_ENV`: `development`, `staging` ou `production`
- `DATABASE_URL`: conexao PostgreSQL do ambiente
- `NEXTAUTH_URL`: URL publica da aplicacao
- `NEXTAUTH_SECRET`: segredo forte para sessao/autenticacao

Variaveis opcionais:

- `APP_URL`: fallback para links absolutos
- `NEXT_PUBLIC_GEMINI_API_KEY`: somente se houver uso ativo da integracao
- `SEED_DEFAULT_PASSWORD`: senha inicial do seed
- `SEED_INCLUDE_SAMPLE_DATA`: `true` ou `false`
- `SEED_ALLOW_PRODUCTION`: obrigatoria como `true` para seed em producao

## Scripts operacionais

- `npm run env:check`
- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run seed:initial`
- `npm run build`
- `npm run start`
- `npm run setup:staging`
- `npm run setup:production`

## Fluxo de staging

1. Configurar variaveis de ambiente do staging.
2. Rodar `npm ci`.
3. Rodar `npm run env:check`.
4. Rodar `npm run prisma:generate`.
5. Rodar `npm run prisma:deploy`.
6. Rodar `npm run seed:initial`.
7. Rodar `npm run build`.
8. Subir a aplicacao com `npm run start`.
9. Validar `GET /api/health`.
10. Rodar `npm run homologation:check`.
11. Validar login com o usuario administrativo inicial.

## Fluxo de producao

1. Configurar variaveis de ambiente da producao.
2. Garantir backup recente do banco antes do deploy.
3. Rodar `npm ci`.
4. Rodar `npm run env:check`.
5. Rodar `npm run prisma:generate`.
6. Rodar `npm run prisma:deploy`.
7. Se for primeiro provisionamento, definir:
   - `SEED_ALLOW_PRODUCTION=true`
   - `SEED_INCLUDE_SAMPLE_DATA=false`
8. Rodar `npm run seed:initial`.
9. Rodar `npm run build`.
10. Subir a aplicacao com `npm run start`.
11. Validar `GET /api/health`.
12. Rodar `npm run homologation:check`.
13. Trocar imediatamente a senha inicial dos usuarios seeded.

## Seed inicial

O seed atual e idempotente e prepara:

- usuarios iniciais por perfil
- cargos base
- materiais base
- uma revisao ativa de kit operacional
- colaborador de exemplo apenas quando `SEED_INCLUDE_SAMPLE_DATA=true`

Comportamento de seguranca:

- seed em producao e bloqueado por padrao
- para liberar, defina `SEED_ALLOW_PRODUCTION=true`

## Checklist de implantacao

### Antes do deploy

- Banco PostgreSQL acessivel a partir da aplicacao
- `DATABASE_URL` validada
- `NEXTAUTH_URL` aponta para a URL publica correta
- `NEXTAUTH_SECRET` possui pelo menos 16 caracteres e foi gerado de forma aleatoria
- Backup do banco realizado
- Build e testes passando no pipeline

### Durante o deploy

- `npm run env:check`
- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run seed:initial` apenas quando aplicavel
- `npm run homologation:check`
- `npm run build`
- `npm run start`

### Validacao funcional minima

- `GET /api/health` retorna `status: ok`
- tela `/auth/login` abre com layout correto
- login administrativo funciona
- dashboard abre
- listagem de colaboradores abre
- listagem de materiais abre
- pagina de kits por cargo abre
- importacoes em massa principais abrem sem erro

### Pos-deploy

- Trocar senha inicial de primeiro acesso
- Desabilitar `SEED_ALLOW_PRODUCTION`
- Confirmar trilha de auditoria de login
- Confirmar acesso por perfil
- Registrar versao implantada e horario do deploy
- Executar roteiro em [HOMOLOGACAO_GUIADA.md](HOMOLOGACAO_GUIADA.md)
- Registrar aceite em [HOMOLOGACAO_EVIDENCIAS.md](HOMOLOGACAO_EVIDENCIAS.md)

## Rollback

1. Interromper novas operacoes se houver erro critico.
2. Reverter a aplicacao para a ultima versao estavel.
3. Se houve migration com impacto funcional, restaurar backup ou seguir plano de rollback do banco.
4. Validar novamente `GET /api/health`.
5. Revalidar login e rotas criticas.
