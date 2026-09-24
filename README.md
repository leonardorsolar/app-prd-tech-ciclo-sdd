# listar-usuarios

Backend somente leitura (TypeScript, Node.js, Express, SQLite sem ORM) com a rota `GET /users`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | sobe o servidor em modo watch (`PORT`, `DATABASE_PATH`) |
| `npm run seed -- 50` | insere 50 usuários de desenvolvimento em `DATABASE_PATH` |
| `npm test` | testes unitários e de integração |
| `npm run test:e2e` | testes ponta a ponta (servidor real, banco temporário) |
| `npm run build` / `npm start` | compila e executa `dist/server.js` |

Padrões: `PORT=3000`, `DATABASE_PATH=./data/app.db`.

## `GET /users`

Parâmetros (todos opcionais; qualquer outro ou repetido gera 400): `page` (padrão 1), `limit` (1–100, padrão 20), `q` (busca em nome/e-mail), `status` (`ativo`|`inativo`), `sort` (`nome`|`email`|`criadoEm`, padrão `nome`), `order` (`asc`|`desc`, padrão `asc`).

Resposta: `{ "data": [{ id, nome, email, status, criadoEm }], "meta": { page, limit, total, totalPages } }`.

Detalhes em `.aes/tasks/listar-usuarios/`.
