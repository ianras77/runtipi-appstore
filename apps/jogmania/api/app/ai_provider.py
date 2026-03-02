from typing import Any

import httpx

from .settings import settings


class OpenAICompatibleProvider:
  def __init__(self, base_url: str, api_key: str, model: str):
    self.base_url = base_url.rstrip("/")
    self.api_key = api_key
    self.model = model

  def call_llm(self, messages: list[dict[str, Any]], temperature: float, max_tokens: int) -> str:
    url = f"{self.base_url}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if self.api_key:
      headers["Authorization"] = f"Bearer {self.api_key}"

    payload = {
      "model": self.model,
      "messages": messages,
      "temperature": temperature,
      "max_tokens": max_tokens
    }

    with httpx.Client(timeout=10) as client:
      response = client.post(url, headers=headers, json=payload)
      response.raise_for_status()
      data = response.json()

    return data["choices"][0]["message"]["content"].strip()


def call_llm(messages: list[dict[str, Any]], temperature: float = 0.7, max_tokens: int = 256) -> str:
  provider = OpenAICompatibleProvider(settings.llm_base_url, settings.llm_api_key, settings.llm_model)
  return provider.call_llm(messages, temperature=temperature, max_tokens=max_tokens)
