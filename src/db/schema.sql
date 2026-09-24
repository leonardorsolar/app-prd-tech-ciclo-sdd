CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('ativo','inativo')),
  criado_em  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_status    ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_nome      ON users (nome COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_users_criado_em ON users (criado_em, id);
