from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_conversation_lifecycle():
    # 1. Create a conversation
    create_res = client.post("/api/conversations", json={"title": "Test Matcha Review"})
    assert create_res.status_code == 200
    conv = create_res.json()
    assert conv["id"] is not None
    assert conv["title"] == "Test Matcha Review"
    conv_id = conv["id"]

    # 2. List conversations and verify it is present
    list_res = client.get("/api/conversations")
    assert list_res.status_code == 200
    conversations = list_res.json()
    assert any(c["id"] == conv_id for c in conversations)

    # 3. Retrieve empty transcript
    get_res = client.get(f"/api/conversations/{conv_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["id"] == conv_id
    assert detail["title"] == "Test Matcha Review"
    assert len(detail["messages"]) == 0

    # 4. Post a message to this conversation via /api/chat
    chat_res = client.post(
        "/api/chat",
        json={
            "conversation_id": conv_id,
            "message": "Should I reorder organic matcha today?",
            "history": [],
        },
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["conversation_id"] == conv_id

    # 5. Retrieve transcript and verify user & assistant messages are saved
    transcript_res = client.get(f"/api/conversations/{conv_id}")
    assert transcript_res.status_code == 200
    updated_detail = transcript_res.json()
    assert len(updated_detail["messages"]) >= 2
    assert updated_detail["messages"][0]["role"] == "user"
    assert "reorder organic matcha" in updated_detail["messages"][0]["content"].lower()
    assert updated_detail["messages"][1]["role"] == "assistant"

    # 6. Rename conversation
    rename_res = client.patch(
        f"/api/conversations/{conv_id}",
        json={"title": "Matcha Reorder Challenge v2"},
    )
    assert rename_res.status_code == 200
    renamed = rename_res.json()
    assert renamed["title"] == "Matcha Reorder Challenge v2"

    # 7. Search filter
    search_res = client.get("/api/conversations?search=Matcha")
    assert search_res.status_code == 200
    results = search_res.json()
    assert any(c["id"] == conv_id for c in results)

    # 8. Delete conversation
    delete_res = client.delete(f"/api/conversations/{conv_id}")
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True

    # 9. Verify deletion
    verify_get = client.get(f"/api/conversations/{conv_id}")
    assert verify_get.status_code == 404


def test_conversation_isolation():
    """Verify that messages in Conversation A do NOT leak into Conversation B."""
    # Create Conv A
    conv_a = client.post("/api/conversations", json={"title": "Conversation Alpha"}).json()
    # Create Conv B
    conv_b = client.post("/api/conversations", json={"title": "Conversation Beta"}).json()

    # Send message to A
    client.post(
        "/api/chat",
        json={
            "conversation_id": conv_a["id"],
            "message": "What is the stockout risk for GaN charger?",
            "history": [],
        },
    )

    # Send message to B
    client.post(
        "/api/chat",
        json={
            "conversation_id": conv_b["id"],
            "message": "Which product has the highest stockout risk right now?",
            "history": [],
        },
    )

    # Check A transcript
    transcript_a = client.get(f"/api/conversations/{conv_a['id']}").json()
    assert any("GaN charger" in m["content"] for m in transcript_a["messages"] if m["role"] == "user")
    assert not any("highest stockout risk" in m["content"] for m in transcript_a["messages"] if m["role"] == "user")

    # Check B transcript
    transcript_b = client.get(f"/api/conversations/{conv_b['id']}").json()
    assert any("highest stockout risk" in m["content"] for m in transcript_b["messages"] if m["role"] == "user")
    assert not any("GaN charger" in m["content"] for m in transcript_b["messages"] if m["role"] == "user")

    # Cleanup
    client.delete(f"/api/conversations/{conv_a['id']}")
    client.delete(f"/api/conversations/{conv_b['id']}")
