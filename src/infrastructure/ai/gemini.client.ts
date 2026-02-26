export class GeminiClient {
  private baseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  constructor(private apiKey: string) {}

  async generateSvg(
    imageUrl: string,
    stylePrompt: string,
    petName: string,
  ): Promise<string> {
    const prompt = [
      `You are a talented digital artist specializing in pet portraits.`,
      `Create an SVG artwork of the pet named "${petName}" shown in the reference image.`,
      `Style instructions: ${stylePrompt}`,
      ``,
      `Requirements:`,
      `- Output ONLY valid SVG code, nothing else`,
      `- The SVG should be a complete, self-contained document`,
      `- Use a viewBox of "0 0 512 512"`,
      `- Make the artwork detailed and visually appealing`,
      `- Capture the pet's likeness from the reference photo`,
      `- Apply the requested artistic style consistently`,
    ].join("\n");

    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: await this.fetchImageAsBase64(imageUrl),
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini API error (${response.status}): ${errorBody}`,
      );
    }

    const data = (await response.json()) as GeminiResponse;

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned no content");
    }

    return this.extractSvg(text);
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        binary += String.fromCharCode(byte);
      }
    }
    return btoa(binary);
  }

  private extractSvg(text: string): string {
    // Try to extract SVG from markdown code blocks first
    const codeBlockMatch = text.match(/```(?:svg|xml)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const inner = (codeBlockMatch[1] ?? "").trim();
      if (inner.startsWith("<svg")) {
        return inner;
      }
    }

    // Try to extract raw SVG tags
    const svgMatch = text.match(/<svg[\s\S]*<\/svg>/);
    if (svgMatch) {
      return svgMatch[0];
    }

    throw new Error("Could not extract SVG from Gemini response");
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}
