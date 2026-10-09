import os
import json
from pathlib import Path
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .schemas import (
    InventoryItem,
    EvaluationResponse,
    DecisionActionRequest,
    DecisionActionResponse,
    ChatRequest,
    ChatResponse,
    ConversationSummary,
    ConversationDetail,
    ConversationCreate,
    ConversationUpdate,
)
from .engine import engine
from .chat import chat_service
from .llm_client import llm_client
from . import db



load_dotenv()

app = FastAPI(
    title="DecisionGuard AI API",
    description="Self-Challenging Stock Reorder Assistant Backend",
    version="0.1.0",
)

cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .seed import SYNTHETIC_SEED_CATALOG

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "inventory.json"
decision_audit_log = []
custom_inventory_items: list[dict] = []
synthetic_seed_items: list[dict] = []


def load_inventory_data() -> list[dict]:
    if not DATA_PATH.exists():
        raise HTTPException(status_code=500, detail=f"Inventory data file not found at {DATA_PATH}")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        base_items = json.load(f)
    
    # Merge custom in-memory items and synthetic seeds (if not already present by SKU)
    existing_skus = {item.get("sku", "").upper() for item in base_items}
    merged = list(base_items)
    for custom in custom_inventory_items:
        if custom.get("sku", "").upper() not in existing_skus:
            merged.append(custom)
            existing_skus.add(custom.get("sku", "").upper())
    for seed in synthetic_seed_items:
        if seed.get("sku", "").upper() not in existing_skus:
            merged.append(seed)
            existing_skus.add(seed.get("sku", "").upper())
    return merged


@app.get("/health")
@app.get("/api/health")
def health_check():
    """Reports application health, database readiness, and LLM configuration status."""
    is_llm_ready = llm_client.is_configured()
    provider, _, model, _ = llm_client.get_config()
    inventory_items = load_inventory_data()
    return {
        "status": "ok",
        "version": "0.1.0",
        "llm_provider": provider,
        "llm_model": model,
        "llm_configured": is_llm_ready,
        "mode": "live_inference" if is_llm_ready else "deterministic_self_challenge",
        "catalog_items_count": len(inventory_items),
    }


@app.get("/api/inventory", response_model=list[InventoryItem])
def get_inventory():
    """Returns all benchmark, synthetic, and custom inventory SKU records."""
    data = load_inventory_data()
    return data


@app.post("/api/inventory/seed", response_model=list[InventoryItem])
def load_synthetic_seeds():
    """Loads 7 realistic multi-industry synthetic benchmark SKUs into the catalog."""
    global synthetic_seed_items
    synthetic_seed_items = list(SYNTHETIC_SEED_CATALOG)
    return load_inventory_data()


@app.delete("/api/inventory/seed", response_model=list[InventoryItem])
def clear_synthetic_seeds():
    """Resets inventory back to core benchmark dataset and custom items."""
    global synthetic_seed_items
    synthetic_seed_items = []
    return load_inventory_data()


@app.post("/api/inventory/custom", response_model=InventoryItem)
def create_custom_scenario(item: InventoryItem):
    """Adds or updates a custom inventory decision scenario."""
    # Update in custom list
    item_dict = item.model_dump()
    for idx, existing in enumerate(custom_inventory_items):
        if existing.get("sku", "").upper() == item.sku.upper():
            custom_inventory_items[idx] = item_dict
            return item

    custom_inventory_items.insert(0, item_dict)
    return item


@app.get("/api/inventory/{sku}", response_model=InventoryItem)
def get_inventory_item(sku: str):
    """Returns single inventory SKU record by SKU identifier."""
    data = load_inventory_data()
    for item in data:
        if item.get("sku", "").lower() == sku.lower():
            return item
    raise HTTPException(status_code=404, detail=f"SKU '{sku}' not found")


@app.post("/api/evaluate", response_model=EvaluationResponse)
async def evaluate_item(item: InventoryItem):
    """
    Executes the full DecisionGuard multi-pass self-challenging evaluation loop dynamically:
    1. Single-Pass Recommendation
    2. Self-Challenge (Arguments Against, Missing Facts, Alternatives)
    3. Re-evaluation & Final Recommendation
    4. Confidence Before -> After & Outcome (AGREES / CHANGED / UNCERTAIN)
    """
    evaluation = await engine.evaluate_inventory_item(item)
    return evaluation


@app.post("/api/evaluate/by-sku/{sku}", response_model=EvaluationResponse)
async def evaluate_by_sku(sku: str):
    """Evaluates an inventory item looked up directly by SKU."""
    item_dict = get_inventory_item(sku)
    item = InventoryItem(**item_dict)
    return await engine.evaluate_inventory_item(item)


@app.post("/api/decision/action", response_model=DecisionActionResponse)
def record_decision_action(action_req: DecisionActionRequest):
    """
    Records human decision action (APPROVE, ADJUST, REJECT, DEFER) in the audit log.
    """
    record = {
        "sku": action_req.sku,
        "action": action_req.action,
        "final_approved_quantity": action_req.final_approved_quantity,
        "notes": action_req.notes,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    decision_audit_log.append(record)

    action_messages = {
        "APPROVE": f"Reorder of {action_req.final_approved_quantity} units approved and sent to ERP.",
        "ADJUST": f"Reorder quantity adjusted to {action_req.final_approved_quantity} units and dispatched.",
        "REJECT": f"Reorder proposal rejected. No purchase order created.",
        "DEFER": f"Reorder deferred for next procurement review cycle.",
    }

    return DecisionActionResponse(
        success=True,
        sku=action_req.sku,
        action=action_req.action,
        final_approved_quantity=action_req.final_approved_quantity,
        message=action_messages.get(action_req.action, "Action processed successfully."),
        recorded_at=record["recorded_at"],
    )


@app.get("/api/decision/audit-log")
def get_audit_log():
    """Returns the decision audit log for the session."""
    return decision_audit_log


@app.post("/api/chat", response_model=ChatResponse)
async def chat_interaction(chat_req: ChatRequest):
    """
    Conversational AI Decision Assistant endpoint:
    - Analyzes natural language supply chain questions
    - Grounds queries on live inventory data and real formulas
    - Executes autonomous self-challenge evaluations on demand
    - Runs Gemini/OpenAI live LLM inference when configured, with safe deterministic fallback
    """
    inventory_data = load_inventory_data()
    return await chat_service.process_chat_message(chat_req, inventory_data)


# --- Persistent Conversation Management Endpoints ---

@app.get("/api/conversations", response_model=list[ConversationSummary])
def get_conversations(search: str = None):
    """Returns persistent list of conversations ordered by most recent."""
    return db.list_conversations(search=search)


@app.post("/api/conversations", response_model=ConversationSummary)
def new_conversation(req: ConversationCreate = None):
    """Creates a new persistent conversation."""
    title = req.title if req and req.title else "New Conversation"
    ref_sku = req.referenced_sku if req else None
    return db.create_conversation(title=title, referenced_sku=ref_sku)


@app.get("/api/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation_transcript(conversation_id: str):
    """Fetches a full conversation transcript with all its messages."""
    conv = db.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@app.patch("/api/conversations/{conversation_id}", response_model=dict)
def rename_conversation(conversation_id: str, req: ConversationUpdate):
    """Renames an existing conversation."""
    success = db.update_conversation_title(conversation_id, req.title)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True, "title": req.title}


@app.delete("/api/conversations/{conversation_id}", response_model=dict)
def delete_conversation_route(conversation_id: str):
    """Permanently deletes a conversation and all its associated messages."""
    success = db.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True, "message": "Conversation deleted successfully"}


@app.post("/api/conversations/{conversation_id}/messages", response_model=ChatResponse)
async def send_message_in_conversation(conversation_id: str, chat_req: ChatRequest):
    """Sends a message within a specific persistent conversation."""
    chat_req.conversation_id = conversation_id
    inventory_data = load_inventory_data()
# --- Reproducible Benchmark & Baseline Comparison Endpoints ---
from .evaluator import evaluator, BenchmarkReport

cached_benchmark_report = None


@app.get("/api/evaluation/cases")
def list_benchmark_cases():
    """Returns the list of 100 reproducible synthetic inventory stock-reorder test cases."""
    return evaluator.get_all_cases()


@app.get("/api/evaluation/cases/{case_id}")
def get_benchmark_case(case_id: str):
    """Returns single synthetic case with ground truth criteria and required evidence."""
    c = evaluator.get_case(case_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return c


@app.post("/api/evaluation/run-benchmark", response_model=BenchmarkReport)
def run_benchmark_evaluation():
    """
    Executes full double-blind batch evaluation across all 100 synthetic cases:
    - Single-Pass Baseline vs DecisionGuard Mode
    - Computes accuracy, MACE, inappropriate claims, and decision correction rates.
    """
    global cached_benchmark_report
    cached_benchmark_report = evaluator.evaluate_all()
    return cached_benchmark_report


@app.get("/api/evaluation/benchmark-results", response_model=BenchmarkReport)
def get_benchmark_results():
    """Returns the latest benchmark evaluation report (computes if not yet run)."""
    global cached_benchmark_report
    if cached_benchmark_report is None:
        cached_benchmark_report = evaluator.evaluate_all()
    return cached_benchmark_report


@app.post("/api/evaluation/compare-case/{case_id}")
def compare_single_case(case_id: str):
    """Runs direct side-by-side Single-Pass vs DecisionGuard comparison on a specific case."""
    c = evaluator.get_case(case_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    
    baseline_res = evaluator.run_single_pass_baseline(c)
    dg_res = evaluator.run_decision_guard_mode(c)

    return {
        "case": c,
        "baseline": baseline_res,
        "decision_guard": dg_res,
        "ground_truth_outcome": c["ground_truth_outcome"],
        "ground_truth_decision": c["ground_truth_decision"],
    }


if __name__ == "__main__":


    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
