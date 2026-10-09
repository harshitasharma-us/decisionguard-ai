"""
DecisionGuard AI — Unified Multi-Provider LLM Client
Supports Google Gemini, OpenAI, Groq, and custom OpenAI-compatible endpoints with
robust error categorization, timeout management, and context-aware prompt crafting.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import httpx

logger = logging.getLogger("decisionguard.llm")


@dataclass
class LLMExecutionResult:
    text: Optional[str]
    is_live_llm: bool
    provider: str
    model: str
    status: str  # "SUCCESS", "NO_API_KEY", "AUTH_ERROR", "RATE_LIMIT", "TIMEOUT", "API_ERROR", "INVALID_MODEL"
    error_message: Optional[str] = None
    latency_ms: int = 0


class UnifiedLLMClient:
    def __init__(self):
        pass

    def get_config(self) -> Tuple[str, str, str, str]:
        """Resolves active provider, api_key, model, and base_url from environment variables."""
        provider = os.getenv("LLM_PROVIDER", "").strip().lower()
        
        # Resolve API Key from multiple common environment variables
        api_key = (
            os.getenv("LLM_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("OPENAI_API_KEY")
            or os.getenv("GROQ_API_KEY")
            or ""
        ).strip()

        # If provider not explicitly set, auto-detect from available keys
        if not provider:
            if os.getenv("GEMINI_API_KEY"):
                provider = "gemini"
            elif os.getenv("GROQ_API_KEY"):
                provider = "groq"
            elif os.getenv("OPENAI_API_KEY"):
                provider = "openai"
            elif api_key.startswith("AIza"):
                provider = "gemini"
            elif api_key.startswith("gsk_"):
                provider = "groq"
            elif api_key.startswith("sk-"):
                provider = "openai"
            else:
                provider = "gemini"

        # Model resolution
        model = os.getenv("LLM_MODEL", "").strip()
        if not model:
            if provider == "gemini":
                model = "gemini-1.5-flash"
            elif provider == "groq":
                model = "llama-3.3-70b-versatile"
            elif provider == "openai":
                model = "gpt-4o-mini"
            else:
                model = "gpt-4o-mini"

        base_url = os.getenv("LLM_BASE_URL", "").strip()
        if not base_url:
            if provider == "groq":
                base_url = "https://api.groq.com/openai/v1"
            elif provider == "openai":
                base_url = "https://api.openai.com/v1"

        return provider, api_key, model, base_url

    def is_configured(self) -> bool:
        """Returns True if a valid non-placeholder API key is configured."""
        _, api_key, _, _ = self.get_config()
        return bool(api_key and not api_key.startswith("your_") and api_key != "mock_key")

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.35,
        max_tokens: int = 2000,
    ) -> LLMExecutionResult:
        """Executes a real LLM chat completion across Gemini, OpenAI, Groq, or OpenAI-compatible APIs."""
        import time

        provider, api_key, model, base_url = self.get_config()
        start_time = time.time()

        if not api_key or api_key.startswith("your_") or api_key == "mock_key":
            return LLMExecutionResult(
                text=None,
                is_live_llm=False,
                provider=provider,
                model=model,
                status="NO_API_KEY",
                error_message=(
                    f"No valid API key configured for provider '{provider}'. "
                    "Please configure LLM_API_KEY (or GEMINI_API_KEY / OPENAI_API_KEY / GROQ_API_KEY) in backend/.env."
                ),
            )

        try:
            if provider == "gemini":
                result_text = await self._call_gemini(
                    api_key=api_key,
                    model=model,
                    system_prompt=system_prompt,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            else:
                result_text = await self._call_openai_compatible(
                    api_key=api_key,
                    model=model,
                    base_url=base_url or "https://api.openai.com/v1",
                    system_prompt=system_prompt,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

            latency_ms = int((time.time() - start_time) * 1000)
            return LLMExecutionResult(
                text=result_text,
                is_live_llm=True,
                provider=provider,
                model=model,
                status="SUCCESS",
                latency_ms=latency_ms,
            )

        except httpx.HTTPStatusError as err:
            latency_ms = int((time.time() - start_time) * 1000)
            status_code = err.response.status_code
            resp_body = err.response.text[:300]
            
            if status_code in [401, 403]:
                err_status = "AUTH_ERROR"
                msg = f"Authentication failed with {provider.upper()} API (HTTP {status_code}). Please verify your LLM_API_KEY."
            elif status_code == 429:
                err_status = "RATE_LIMIT"
                msg = f"{provider.upper()} API rate limit or quota exceeded. Please retry in a moment."
            elif status_code == 404 or "model" in resp_body.lower():
                err_status = "INVALID_MODEL"
                msg = f"{provider.upper()} model '{model}' was not found or is unavailable: {resp_body}"
            else:
                err_status = "API_ERROR"
                msg = f"{provider.upper()} API returned error HTTP {status_code}: {resp_body}"

            logger.warning(f"LLM Call Error [{err_status}]: {msg}")
            return LLMExecutionResult(
                text=None,
                is_live_llm=False,
                provider=provider,
                model=model,
                status=err_status,
                error_message=msg,
                latency_ms=latency_ms,
            )

        except httpx.TimeoutException:
            latency_ms = int((time.time() - start_time) * 1000)
            msg = f"{provider.upper()} API request timed out after 20 seconds."
            logger.warning(f"LLM Call Error [TIMEOUT]: {msg}")
            return LLMExecutionResult(
                text=None,
                is_live_llm=False,
                provider=provider,
                model=model,
                status="TIMEOUT",
                error_message=msg,
                latency_ms=latency_ms,
            )

        except Exception as exc:
            latency_ms = int((time.time() - start_time) * 1000)
            msg = f"Unexpected error communicating with {provider.upper()} API: {str(exc)}"
            logger.error(f"LLM Call Error [API_ERROR]: {msg}")
            return LLMExecutionResult(
                text=None,
                is_live_llm=False,
                provider=provider,
                model=model,
                status="API_ERROR",
                error_message=msg,
                latency_ms=latency_ms,
            )

    async def _call_gemini(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Invokes Google Gemini REST API with clean multi-turn and system instruction handling."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        contents = []
        for idx, m in enumerate(messages):
            # Gemini roles: "user" or "model"
            role = "user" if m.get("role") in ["user", "human"] else "model"
            content_text = m.get("content", "")
            
            # Prepend system prompt to the first user turn if needed
            if idx == 0 and role == "user" and system_prompt:
                turn_text = f"{system_prompt}\n\nUser: {content_text}"
            else:
                turn_text = content_text
                
            contents.append({
                "role": role,
                "parts": [{"text": turn_text}]
            })

        if not contents:
            contents.append({
                "role": "user",
                "parts": [{"text": system_prompt or "Hello"}]
            })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data = res.json()

            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()

            raise ValueError("No text content returned from Gemini API response.")

    async def _call_openai_compatible(
        self,
        api_key: str,
        model: str,
        base_url: str,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Invokes OpenAI, Groq, or any OpenAI-compatible chat completion endpoint."""
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
            
        for m in messages:
            role = m.get("role", "user")
            if role not in ["user", "assistant", "system"]:
                role = "user"
            formatted_messages.append({
                "role": role,
                "content": m.get("content", "")
            })

        payload = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()

            choices = data.get("choices", [])
            if choices and "message" in choices[0] and "content" in choices[0]["message"]:
                return choices[0]["message"]["content"].strip()

            raise ValueError("No message content returned from OpenAI-compatible API response.")


llm_client = UnifiedLLMClient()

