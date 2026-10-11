import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(__dirname, "../..");

function readAppFile(fileName: string) {
  return fs.readFileSync(path.join(appRoot, fileName), "utf8");
}

describe("Runtipi packaging", () => {
  it("routes House Chat through the host gateway LLM endpoint", () => {
    const compose = readAppFile("docker-compose.yml");

    expect(compose).toContain(
      "RASSYMIND_BASE_URL=${RASSYMIND_BASE_URL:-${RASIES_CAT_BASE_URL:-http://host.docker.internal:8844}}",
    );
    expect(compose).toContain(
      "RASSYMIND_CHAT_PATH=${RASSYMIND_CHAT_PATH:-${RASIES_CAT_CHAT_PATH:-/v1/chat/completions}}",
    );
    expect(compose).toContain(
      "RASSYMIND_API_KEY=${RASSYMIND_API_KEY:-${RASIES_CAT_API_KEY:-}}",
    );
    expect(compose).toContain("/data/mastra");
    expect(compose).not.toContain("rasies-cheshire-cat");
    expect(compose).not.toContain("OLLAMA_GENERAL_BASE_URL");
  });

  it("maps host.docker.internal for every service that calls the host LLM", () => {
    const compose = readAppFile("docker-compose.yml");

    const hostGatewayMappings = compose.match(
      /host\.docker\.internal:host-gateway/g,
    );

    expect(hostGatewayMappings).toHaveLength(1);
  });
});
