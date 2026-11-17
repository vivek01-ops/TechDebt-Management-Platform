from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine
from app import models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # lightweight dev migrations for new columns / constraints
    stmts = [
        "ALTER TABLE aws_accounts ADD COLUMN IF NOT EXISTS access_key_id VARCHAR(128)",
        "ALTER TABLE aws_accounts ADD COLUMN IF NOT EXISTS secret_access_key VARCHAR(128)",
        "ALTER TABLE aws_accounts ADD COLUMN IF NOT EXISTS session_token TEXT",
        "ALTER TABLE aws_accounts ALTER COLUMN account_id DROP NOT NULL",
    ]
    with engine.begin() as conn:
        for s in stmts:
            try:
                conn.execute(text(s))
            except Exception:
                pass
    # ensure default auth_type aligns if column exists
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE aws_accounts SET auth_type='keys' WHERE auth_type IS NULL OR auth_type=''"))
    except Exception:
        pass


if __name__ == "__main__":
    init_db()
    print("Database tables created/updated")
