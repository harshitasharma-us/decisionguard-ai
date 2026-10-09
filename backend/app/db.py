import sqlite3
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DATA_DIR / "decisionguard.db"


def get_db_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db():
    conn = get_db_connection()
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                referenced_sku TEXT
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                evaluation_json TEXT,
                referenced_sku TEXT,
                is_live_llm INTEGER NOT NULL DEFAULT 0,
                engine_type TEXT,
                suggested_followups_json TEXT,
                created_at TEXT NOT NULL,
                comparison_json TEXT,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );
            """
        )
        # Migrate existing messages table if comparison_json is missing
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(messages);")
        columns = [row["name"] for row in cursor.fetchall()]
        if "comparison_json" not in columns:
            conn.execute("ALTER TABLE messages ADD COLUMN comparison_json TEXT;")

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at DESC);"
        )
    conn.close()


def list_conversations(search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if search and search.strip():
            query_str = f"%{search.strip()}%"
            cursor.execute(
                """
                SELECT id, title, created_at, updated_at, referenced_sku,
                       (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) as message_count,
                       (SELECT content FROM messages WHERE conversation_id = conversations.id ORDER BY created_at DESC LIMIT 1) as last_message
                FROM conversations
                WHERE title LIKE ? OR id LIKE ?
                ORDER BY updated_at DESC;
                """,
                (query_str, query_str),
            )
        else:
            cursor.execute(
                """
                SELECT id, title, created_at, updated_at, referenced_sku,
                       (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) as message_count,
                       (SELECT content FROM messages WHERE conversation_id = conversations.id ORDER BY created_at DESC LIMIT 1) as last_message
                FROM conversations
                ORDER BY updated_at DESC;
                """
            )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def create_conversation(
    title: str = "New Conversation",
    referenced_sku: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> Dict[str, Any]:
    conn = get_db_connection()
    conv_id = conversation_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO conversations (id, title, created_at, updated_at, referenced_sku)
                VALUES (?, ?, ?, ?, ?);
                """,
                (conv_id, title, now, now, referenced_sku),
            )
        return {
            "id": conv_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "referenced_sku": referenced_sku,
            "message_count": 0,
            "last_message": None,
        }
    finally:
        conn.close()


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, created_at, updated_at, referenced_sku
            FROM conversations
            WHERE id = ?;
            """,
            (conversation_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        conv_dict = dict(row)

        cursor.execute(
            """
            SELECT id, role, content, evaluation_json, referenced_sku,
                   is_live_llm, engine_type, suggested_followups_json, created_at, comparison_json
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC;
            """,
            (conversation_id,),
        )
        msg_rows = cursor.fetchall()

        messages = []
        for mr in msg_rows:
            eval_data = None
            if mr["evaluation_json"]:
                try:
                    eval_data = json.loads(mr["evaluation_json"])
                except Exception:
                    eval_data = None

            followups = []
            if mr["suggested_followups_json"]:
                try:
                    followups = json.loads(mr["suggested_followups_json"])
                except Exception:
                    followups = []

            comp_data = None
            if "comparison_json" in mr.keys() and mr["comparison_json"]:
                try:
                    comp_data = json.loads(mr["comparison_json"])
                except Exception:
                    comp_data = None

            messages.append(
                {
                    "id": mr["id"],
                    "role": mr["role"],
                    "content": mr["content"],
                    "evaluation": eval_data,
                    "referenced_sku": mr["referenced_sku"],
                    "is_live_llm": bool(mr["is_live_llm"]),
                    "engine_type": mr["engine_type"],
                    "suggested_followups": followups,
                    "timestamp": mr["created_at"],
                    "comparison": comp_data,
                }
            )

        conv_dict["messages"] = messages
        return conv_dict
    finally:
        conn.close()


def update_conversation_title(conversation_id: str, title: str) -> bool:
    conn = get_db_connection()
    now = datetime.now(timezone.utc).isoformat()
    try:
        with conn:
            cursor = conn.execute(
                """
                UPDATE conversations
                SET title = ?, updated_at = ?
                WHERE id = ?;
                """,
                (title.strip(), now, conversation_id),
            )
            return cursor.rowcount > 0
    finally:
        conn.close()


def delete_conversation(conversation_id: str) -> bool:
    conn = get_db_connection()
    try:
        with conn:
            cursor = conn.execute(
                """
                DELETE FROM conversations
                WHERE id = ?;
                """,
                (conversation_id,),
            )
            return cursor.rowcount > 0
    finally:
        conn.close()


def add_message_to_conversation(
    conversation_id: str,
    role: str,
    content: str,
    evaluation: Optional[Dict[str, Any]] = None,
    referenced_sku: Optional[str] = None,
    is_live_llm: bool = False,
    engine_type: Optional[str] = None,
    suggested_followups: Optional[List[str]] = None,
    message_id: Optional[str] = None,
    comparison: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    conn = get_db_connection()
    msg_id = message_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    if isinstance(content, tuple):
        content_text = content[0] if len(content) > 0 else ""
    elif not isinstance(content, str):
        content_text = str(content)
    else:
        content_text = content
    eval_json = json.dumps(evaluation) if evaluation else None
    followups_json = json.dumps(suggested_followups) if suggested_followups else None
    comp_json = json.dumps(comparison) if comparison else None

    try:
        with conn:
            # Check if conversation exists; if not, create it
            cursor = conn.execute(
                "SELECT id, title FROM conversations WHERE id = ?;",
                (conversation_id,),
            )
            conv_row = cursor.fetchone()
            if not conv_row:
                # Auto title from content
                auto_title = content_text[:40] + "..." if len(content_text) > 40 else content_text
                conn.execute(
                    """
                    INSERT INTO conversations (id, title, created_at, updated_at, referenced_sku)
                    VALUES (?, ?, ?, ?, ?);
                    """,
                    (conversation_id, auto_title or "New Conversation", now, now, referenced_sku),
                )
            else:
                # Update conversation updated_at and title if default
                if conv_row["title"] in ["New Conversation", "New Chat"] and role == "user":
                    clean_title = content_text[:38] + "..." if len(content_text) > 38 else content_text
                    conn.execute(
                        """
                        UPDATE conversations
                        SET title = ?, updated_at = ?, referenced_sku = COALESCE(referenced_sku, ?)
                        WHERE id = ?;
                        """,
                        (clean_title, now, referenced_sku, conversation_id),
                    )
                else:
                    conn.execute(
                        """
                        UPDATE conversations
                        SET updated_at = ?, referenced_sku = COALESCE(referenced_sku, ?)
                        WHERE id = ?;
                        """,
                        (now, referenced_sku, conversation_id),
                    )

            # Insert message
            conn.execute(
                """
                INSERT INTO messages (
                    id, conversation_id, role, content, evaluation_json,
                    referenced_sku, is_live_llm, engine_type, suggested_followups_json, created_at, comparison_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    msg_id,
                    conversation_id,
                    role,
                    content_text,
                    eval_json,
                    referenced_sku,
                    1 if is_live_llm else 0,
                    engine_type,
                    followups_json,
                    now,
                    comp_json,
                ),
            )

        return {
            "id": msg_id,
            "role": role,
            "content": content,
            "evaluation": evaluation,
            "referenced_sku": referenced_sku,
            "is_live_llm": is_live_llm,
            "engine_type": engine_type,
            "suggested_followups": suggested_followups or [],
            "timestamp": now,
            "comparison": comparison,
        }
    finally:
        conn.close()


# Auto-initialize DB tables on module load
init_db()

