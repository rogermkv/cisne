# Arquitetura de mídia — Fase 2

Esta fase centraliza somente as fotos de espaços. Nenhuma foto de associado é migrada ou conectada ao `MediaStorage`.

## Uploads novos

O upload de espaço passa por `sharp` e `MediaService`. JPEG, PNG e WEBP são decodificados, orientados conforme EXIF, redimensionados para no máximo 2560 px sem upscale, têm metadados removidos e são reencodados. JPEG usa qualidade 85/progressive/mozjpeg; PNG usa compressão máxima; WEBP usa qualidade 85. O checksum é calculado nos bytes finais persistidos.

O arquivo moderno usa `public/spaces/<spaceId>/<uuid>.<ext>` e requer `MEDIA_STORAGE_ROOT`. Não há fallback para `process.cwd()` na infraestrutura nova. O `SpacePhoto.path` continua sendo preenchido com um nome técnico UUID para compatibilidade; a cópia física legada só é escrita quando `SPACE_PHOTOS_DIR` está explicitamente configurado. `MediaAsset` é a fonte moderna de verdade.

## Leitura e compatibilidade

As respostas incluem `media` e `primaryMedia` sem expor `storageKey`. Quando existe um ativo válido, a serialização usa `/api/media/:id`; sem ativo, o `path` legado permanece disponível. A rota `/uploads/space-photos/:file` primeiro tenta o diretório legado e depois resolve o path no banco para servir o ativo moderno. Não há varredura arbitrária do filesystem.

`SpacePhoto.isPrimary` continua sendo a única fonte de verdade. `ReservableSpace.imagePath` é mantido apenas para compatibilidade durante a transição. Não foi criado `primaryMediaAssetId` nem índice parcial.

## Delete

Fotos modernas removidas e ativos relacionados a espaços excluídos recebem `deletedAt`; seus arquivos não são apagados. Fotos puramente legadas conservam o comportamento de remoção física existente. O garbage collector será uma fase futura.

## Migração histórica

`npm run media:migrate-spaces --workspace @cisne/api -- --dry-run --source-root <origem> --report <arquivo.json>` executa o preflight sem gravar banco ou storage. A execução real exige a remoção de `--dry-run`. O script copia bytes históricos sem reencode, valida com `sharp`, preserva SHA-256, cria um `MediaAsset` por `SpacePhoto`, trata missing/ambiguous e é idempotente quando o asset existente e seu arquivo estão íntegros. Relatórios podem ser JSON ou TSV.

O script deve ser executado posteriormente no ambiente Linux do servidor, após um dry-run de produção. Esta implementação foi desenvolvida e validada somente no Windows; nenhuma origem de produção foi acessada nesta fase.
