# Arquitetura de mídia — Fase 1

Esta fase adiciona a fundação de mídia sem alterar os uploads existentes de associados ou espaços.

## Componentes

- `MediaAsset`: metadados e referência lógica da mídia no banco.
- `MediaStorage`: contrato independente do provedor físico.
- `LocalMediaStorage`: implementação local configurada por `MEDIA_STORAGE_ROOT`.
- `MediaService`: geração de storage keys, checksum SHA-256, metadados de imagem e persistência do ativo.

## Storage root

`MEDIA_STORAGE_ROOT` é opcional nesta fase e não é lido durante o bootstrap da API. Nenhum módulo deve construir `LocalMediaStorage` sem uma raiz explícita. Quando o storage for usado no futuro sem essa variável, a criação do adaptador deverá falhar explicitamente; não há fallback para `process.cwd()`. Em produção, a configuração deverá apontar para um diretório persistente fora das releases, como:

```text
/opt/apps/cisne/shared/media
```

Nenhuma rota existente usa essa infraestrutura ainda.

## Storage keys

Storage keys são relativas, usam `/` e nunca contêm URL, caminho absoluto, drive letter, barra invertida ou segmentos `.`/`..`.

O formato preparado é:

```text
public/spaces/<ownerId>/<uuid>.jpg
private/members/<ownerId>/<uuid>.jpg
```

O prefixo auxilia organização operacional, mas `MediaAsset.visibility` é a única autoridade de segurança para PUBLIC/PRIVATE. Nenhum código pode inferir autorização apenas de `public/` ou `private/`.

## Atomicidade

`LocalMediaStorage` grava primeiro um arquivo temporário dentro do mesmo filesystem da raiz configurada e publica-o com `link(2)`, que cria o destino atomicamente e falha com `EEXIST` sem substituir um arquivo existente; em seguida remove o temporário. Falhas removem o temporário. O caminho resolvido é verificado lexicalmente e por `realpath` para permanecer dentro da raiz.

## Público e privado

`PUBLIC` e `PRIVATE` já existem no modelo para preparar entrega pública/cacheável e entrega autenticada. Esta fase não cria endpoints de entrega nem altera as rotas legadas `/uploads/...`.

## Checksums e imagens

`MediaAsset.sizeBytes` usa `Int` por escolha pragmática para o CISNE; no PostgreSQL isso limita um objeto a 2.147.483.647 bytes. `checksumSha256` é indexado, mas não é unique: o mesmo conteúdo pode ter múltiplos ativos e storage keys. `deletedAt` é indexado para o futuro garbage collector. O `MediaService` calcula SHA-256 dos bytes persistidos. Para JPG, PNG e WEBP, valida o conteúdo real com `image-size` e registra largura/altura. Duplicatas por checksum continuam permitidas. PDFs, enquanto não houver fluxo de attachments, têm apenas identificação básica pela assinatura `%PDF-`; isso não é inspeção de segurança nem antimalware e não torna o arquivo confiável.

`sharp` fica para a fase de migração/upload centralizado, quando haverá necessidade real de transformação, normalização EXIF e geração de variantes.

## Migração futura

Os campos legados continuam sendo a fonte usada pelos módulos atuais. A migração deverá ser gradual: inventário, backup, criação de ativos, leitura dual, novos uploads via `MediaService`, verificação e somente depois descontinuação dos campos antigos.

A interface `MediaStorage` permite trocar a implementação local por um storage S3-compatible sem reescrever os módulos de domínio.
