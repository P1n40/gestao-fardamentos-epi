# Homologacao Guiada

## Objetivo

Este roteiro orienta a homologacao do Sistema de Gestao de Fardamentos e EPI com cenarios reais do processo operacional, cobrindo cadastro, kits, estoque, entregas, documentos, dashboard, importacoes, planejamento e auditoria.

## Preparacao do ambiente

1. Subir staging com as variaveis corretas.
2. Executar:

```bash
npm run env:check
npm run prisma:generate
npm run prisma:deploy
npm run seed:initial
npm run homologation:check
```

3. Validar `GET /api/health`.
4. Separar responsaveis por perfil:
   - Administrador
   - RH / Almoxarifado
   - Gestor
   - Operador

## Evidencias obrigatorias

Para cada cenario, registrar:

- data e hora da execucao
- usuario utilizado
- ambiente e URL
- resultado: aprovado, reprovado ou bloqueado
- prints ou arquivos anexos
- observacoes e defeitos encontrados

Use o modelo em [HOMOLOGACAO_EVIDENCIAS.md](HOMOLOGACAO_EVIDENCIAS.md).

## Criterios gerais de aceite

- Fluxos criticos nao geram erro 500.
- Mensagens de erro sao compreensiveis.
- Permissoes bloqueiam acessos indevidos.
- Entregas baixam estoque de forma consistente.
- Fardamento gera recibo por evento.
- EPI gera ficha historica acumulativa.
- Historico do colaborador mostra documentos emitidos e atalhos de reimpressao.
- Dashboard e planejamento refletem dados operacionais.
- Importacoes exibem preview, erros e historico.
- Auditoria registra eventos criticos.

## Cenários

### HMG-01 - Acesso por perfil e bloqueio de rota restrita

Prioridade: Critica

Ator: Administrador e Operador

Objetivo: Confirmar que perfis acessam somente o que sua permissao permite.

Pre-requisitos:

- Usuarios seedados
- Aplicacao em staging acessivel

Passos:

1. Entrar como `admin@empresa.com`.
2. Abrir `/usuarios` e `/auditoria`.
3. Sair e entrar como `op@empresa.com`.
4. Tentar abrir `/usuarios` e `/auditoria`.

Resultado esperado:

- Administrador acessa usuarios e auditoria.
- Operador e redirecionado para `/unauthorized`.
- Tentativas negadas ficam registradas em auditoria quando aplicavel.

Evidencias:

- Print da tela autorizada
- Print da tela unauthorized
- Registro de auditoria

### HMG-02 - Cadastro e atualizacao de colaborador com tamanhos

Prioridade: Alta

Ator: RH / Almoxarifado

Objetivo: Validar cadastro de colaborador com cargo, secretaria e tamanhos operacionais.

Passos:

1. Criar colaborador novo com CPF valido, matricula, secretaria e cargo.
2. Preencher camiseta, calca e calcado.
3. Salvar e reabrir a ficha do colaborador.
4. Editar um tamanho e salvar novamente.

Resultado esperado:

- Colaborador e criado ativo.
- Tamanhos aparecem na ficha.
- Edicao e persistida sem duplicar colaborador.

### HMG-03 - Versionamento de kit por cargo e publicacao

Prioridade: Critica

Ator: Administrador ou RH / Almoxarifado

Passos:

1. Abrir `/cargos` e acessar o kit de um cargo operacional.
2. Criar nova versao rascunho.
3. Adicionar um fardamento e um EPI compativel com o cargo.
4. Publicar a revisao.
5. Conferir que a versao anterior ficou historica.

Resultado esperado:

- Rascunho aceita edicao de itens.
- Publicacao ativa a nova revisao.
- Versao anterior recebe fim de vigencia.

### HMG-04 - Movimentacao de estoque com bloqueio de saldo negativo

Prioridade: Critica

Ator: RH / Almoxarifado

Passos:

1. Registrar entrada de estoque.
2. Registrar saida menor que o saldo.
3. Tentar registrar saida maior que o saldo disponivel.

Resultado esperado:

- Entrada e saida validas atualizam saldo.
- Saida maior que saldo e bloqueada.
- Transacoes ficam registradas no historico de estoque.

### HMG-05 - Entrega de fardamento com recibo por evento

Prioridade: Critica

Ator: Operador ou RH / Almoxarifado

Passos:

1. Abrir entregas e selecionar colaborador.
2. Escolher tipo Fardamento.
3. Carregar itens do kit e confirmar entrega.
4. Abrir recibo gerado.

Resultado esperado:

- Entrega e registrada.
- Estoque e baixado.
- Recibo UNIFORM abre por evento.
- Historico do colaborador mostra documento emitido.

### HMG-06 - Entrega de EPI com ficha historica acumulativa

Prioridade: Critica

Ator: Operador ou RH / Almoxarifado

Passos:

1. Registrar entrega do tipo EPI.
2. Abrir ficha de EPI do colaborador.
3. Registrar uma segunda entrega de EPI.
4. Abrir versao anterior da ficha por query string de versao.

Resultado esperado:

- Ficha PPE acumula historico por colaborador.
- Versao anterior mostra apenas itens ate a data daquele documento.
- Atalho de reimpressao respeita a versao.

### HMG-07 - Importacao em massa com preview e relatorio de erros

Prioridade: Alta

Ator: Administrador ou RH / Almoxarifado

Passos:

1. Abrir importacao de colaboradores, materiais ou kits.
2. Baixar template.
3. Enviar arquivo com uma linha valida e uma linha invalida.
4. Validar preview e confirmar importacao.
5. Abrir historico da importacao.

Resultado esperado:

- Preview classifica linhas validas e invalidas.
- Linhas invalidas sao reportadas claramente.
- Historico mostra resumo e amostra do lote.

### HMG-08 - Dashboard com filtros e pendencias agregadas

Prioridade: Alta

Ator: Gestor

Passos:

1. Abrir `/dashboard`.
2. Aplicar filtro de secretaria.
3. Aplicar filtro de cargo.
4. Alternar periodo.
5. Conferir agregados por cargo e secretaria.

Resultado esperado:

- Cards refletem filtros.
- Pendencias e estoque critico mudam conforme recorte.
- Agregados permanecem coerentes.

### HMG-09 - Planejamento de compras priorizado por risco

Prioridade: Alta

Ator: Gestor ou RH / Almoxarifado

Passos:

1. Abrir `/estoque/planejamento`.
2. Conferir consumo historico por variante.
3. Conferir compra sugerida para base ativa e buffer minimo.
4. Conferir sinais de admissao, sizing pendente e retorno potencial.
5. Conferir ranking de risco de ruptura.

Resultado esperado:

- Sugestao mostra decomposicao operacional.
- Variantes por tamanho aparecem separadas.
- Ranking prioriza itens com maior risco.

### HMG-10 - Trilha de auditoria dos fluxos criticos

Prioridade: Critica

Ator: Administrador ou Gestor

Passos:

1. Abrir `/auditoria`.
2. Conferir eventos de login.
3. Conferir eventos de importacao.
4. Conferir eventos de entrega/documentos.
5. Conferir eventos de alteracao de kit ou usuario quando aplicavel.

Resultado esperado:

- Eventos criticos aparecem com usuario, acao, entidade e data.
- Auditoria contem detalhes suficientes para rastreio operacional.

## Encerramento da homologacao

1. Consolidar evidencias.
2. Registrar defeitos com severidade.
3. Reexecutar cenarios afetados apos correcoes.
4. Obter aceite formal do responsavel operacional.
5. Liberar go-live somente se todos os cenarios criticos estiverem aprovados.
