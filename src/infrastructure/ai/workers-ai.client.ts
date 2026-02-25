export class WorkersAiClient {
  constructor(private ai: Ai) {}

  async generateImage(prompt: string): Promise<Uint8Array> {
    const response = await this.ai.run(
      "@cf/black-forest-labs/flux-1-schnell",
      {
        prompt,
        steps: 4,
      },
    );

    // flux-1-schnell returns { image?: string } with Base64-encoded image
    if (
      response &&
      typeof response === "object" &&
      "image" in response &&
      typeof response.image === "string"
    ) {
      return this.base64ToUint8Array(response.image);
    }

    // If it returns a ReadableStream (some model versions)
    if (response instanceof ReadableStream) {
      const reader = response.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    }

    throw new Error("Unexpected response type from Workers AI");
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}
