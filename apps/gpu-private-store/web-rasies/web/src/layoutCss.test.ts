import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const css = fs
  .readFileSync(path.resolve(process.cwd(), "src/index.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

function ruleFor(selector: string) {
  return Array.from(css.matchAll(/([^{}]+)\{([^}]*)\}/g))
    .filter(([, selectors]) =>
      selectors
        .split(",")
        .map((item) => item.trim())
        .includes(selector),
    )
    .map((match) => match[2])
    .join("\n");
}

describe("layout CSS", () => {
  it("lets the minimal House Chat workbench fill the section width", () => {
    expect(ruleFor(".chat-panel-minimal")).toContain("width: 100%");
    expect(ruleFor(".chat-panel-minimal .chat-shell")).toContain("width: 100%");
    expect(ruleFor(".chat-panel-minimal .chat-shell")).toContain(
      "grid-template-columns: 1fr",
    );
    expect(ruleFor(".chat-panel-minimal .chat-main")).toContain("width: 100%");
    expect(ruleFor(".chat-panel-minimal .chat-compose")).toContain(
      "grid-column: 1 / -1",
    );
  });

  it("gives the minimal House Chat a real utility rail", () => {
    expect(ruleFor(".chat-panel-minimal .chat-main")).toContain(
      "grid-template-areas",
    );
    expect(ruleFor(".chat-utility-rail")).toContain("grid-area: rail");
    expect(ruleFor(".chat-rail-metrics")).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr))",
    );
    expect(ruleFor(".chat-prompt-deck")).toContain("display: grid");
    expect(ruleFor(".chat-rail-actions")).toContain("display: grid");
  });
});
