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
)
from .engine import engine

load_dotenv()

app = FastAPI(
    title="DecisionGuard AI API",
    description="Self-Challenging Stock Reorder Assistant Backend",
    version="0.1.0",
)

cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "inventory.json"
decision_audit_log = []


def load_inventory_data() -> list[dict]:
    if not DATA_PATH.exists():
        raise HTTPException(status_code=500, detail=f"Inventory data file not found at {DATA_PATH}")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/inventory", response_model=list[InventoryItem])
def get_inventory():
    """Returns all synthetic inventory SKU records."""
    data = load_inventory_data()
    return data


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
    Executes the full DecisionGuard multi-pass self-challenging evaluation loop:
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


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
