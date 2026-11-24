CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash BLOB NOT NULL,
  senha_sal BLOB NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS sessoes_por_expiracao ON sessoes (expira_em);

CREATE TABLE IF NOT EXISTS racoes (
  id TEXT PRIMARY KEY,
  posicao INTEGER NOT NULL,
  dados TEXT NOT NULL CHECK (json_valid(dados))
) STRICT;

CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  racao_id TEXT NOT NULL REFERENCES racoes(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, racao_id)
) STRICT;

CREATE TABLE IF NOT EXISTS perfis_gato (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  respostas TEXT NOT NULL CHECK (json_valid(respostas))
) STRICT;
