# CISNE Project Rules

## Session start

Antes de qualquer tarefa relevante:

1. Ler `AGENTS.md`.
2. Ler `docs/PROJECT_STATE.md`.
3. Ler as últimas entradas de `docs/DEVLOG.md`.
4. Executar `git status`.
5. Confirmar branch e HEAD.
6. Quando houver deploy ou produção envolvida, verificar local, origin e produção.
7. Não iniciar desenvolvimento sobre uma base desatualizada.

## Source of truth

- `docs/PROJECT_STATE.md` representa o estado operacional atual.
- Se o código ou servidor contradizer `PROJECT_STATE`, parar e investigar.
- Nunca inventar informação para preencher lacunas.
- Registrar `UNKNOWN` quando algo ainda não tiver sido confirmado.

## Git

- `origin/main` é a fonte oficial do código aprovado.
- Nunca editar produção manualmente.
- Não usar `reset --hard` sem autorização explícita.
- Preservar alterações locais.
- Não aplicar stash antigo automaticamente.
- Sempre revisar o diff antes de commit.

## Production

- Produção deve receber código pelo processo oficial.
- Todo deploy precisa registrar o SHA.
- Backup obrigatório antes de migrations.
- Preservar `.env` e storage persistente.
- Health checks são obrigatórios.
- Confirmar local, origin e produção ao final.

## Testing

- Não declarar teste PASS se o ambiente não reproduz a condição real.
- Diferenciar problema de código de problema de fixture, dados ou infraestrutura.
- Não usar mocks para mascarar problema quando o objetivo é validação integrada.
- Confirmar que storage, banco e arquitetura usados no teste equivalem ao cenário analisado.

## Session end

Antes de encerrar uma sessão relevante:

1. Atualizar `docs/PROJECT_STATE.md`.
2. Acrescentar nova entrada em `docs/DEVLOG.md`.
3. Registrar alterações feitas, arquivos alterados, testes, resultados, SHAs, se produção foi alterada, pendências e próximo passo recomendado.

## Security

Nunca registrar em documentação versionada:

- senhas;
- tokens;
- chaves privadas;
- secrets;
- `DATABASE_URL` com senha;
- credenciais reais de usuários.
