-- Applied automatically on startup (CREATE ... IF NOT EXISTS is idempotent).
CREATE TABLE IF NOT EXISTS books (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    author      TEXT NOT NULL,
    price       NUMERIC(10, 2) NOT NULL,
    description TEXT,
    genres      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id         UUID PRIMARY KEY,
    book_id    INTEGER NOT NULL REFERENCES books (id),
    quantity   INTEGER NOT NULL,
    amount     NUMERIC(10, 2) NOT NULL,
    customer   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
