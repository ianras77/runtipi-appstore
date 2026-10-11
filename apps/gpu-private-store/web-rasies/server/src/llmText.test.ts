import { describe, expect, it } from 'vitest';
import { extractLlmText } from './llmText.js';

describe('extractLlmText', () => {
  it('extracts text from a Cheshire Cat content array', () => {
    expect(
      extractLlmText({
        content: [{ text: 'Wizard reply from Cheshire Cat.' }]
      })
    ).toBe('Wizard reply from Cheshire Cat.');
  });

  it('extracts text from OpenAI-style choices', () => {
    expect(
      extractLlmText({
        choices: [
          {
            message: {
              content: [{ text: 'Orbital response.' }]
            }
          }
        ]
      })
    ).toBe('Orbital response.');
  });

  it('returns null when there is no text to extract', () => {
    expect(extractLlmText({ ok: true })).toBeNull();
  });
});
