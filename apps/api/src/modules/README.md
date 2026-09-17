# Módulos da API

`core` contém apenas recursos transversais essenciais, como o health check.

Os módulos de negócio previstos são `socios`, `financeiro`, `reservas`,
`comunicacao`, `tenis`, `eventos` e `governanca`. Cada um deve concentrar suas
rotas, serviços e regras próprias nesta pasta, compartilhando esta API Fastify e
o mesmo banco PostgreSQL. Eles serão criados somente quando houver requisitos
reais para implementá-los.
