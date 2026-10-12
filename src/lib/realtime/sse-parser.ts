export interface SSEMessage {
  id?: string;
  event: string;
  data: string;
}

/**
 * Dependency-free Server-Sent Events parser for PuretyFarm Admin.
 * Handles:
 * 1. Chunks split mid-line or mid-field across stream read boundaries.
 * 2. Ping heartbeat comments (lines starting with ":").
 * 3. Multiple events in a single chunk.
 * 4. Empty lines separating events.
 */
export class SSEParser {
  private buffer = "";

  feed(chunk: string): SSEMessage[] {
    this.buffer += chunk;
    const messages: SSEMessage[] = [];

    // Normalize CRLF to LF
    let normalized = this.buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    let eventEndIdx = normalized.indexOf("\n\n");
    while (eventEndIdx !== -1) {
      const rawBlock = normalized.slice(0, eventEndIdx);
      normalized = normalized.slice(eventEndIdx + 2);

      const msg = this.parseBlock(rawBlock);
      if (msg) {
        messages.push(msg);
      }

      eventEndIdx = normalized.indexOf("\n\n");
    }

    this.buffer = normalized;
    return messages;
  }

  private parseBlock(block: string): SSEMessage | null {
    const lines = block.split("\n");
    let event = "message";
    let id: string | undefined;
    const dataLines: string[] = [];
    let hasData = false;

    for (const rawLine of lines) {
      if (rawLine.startsWith(":")) {
        // Heartbeat or comment
        continue;
      }
      if (!rawLine.trim()) continue;

      const colonIdx = rawLine.indexOf(":");
      let field: string;
      let value = "";
      if (colonIdx === -1) {
        field = rawLine;
      } else {
        field = rawLine.slice(0, colonIdx);
        value = rawLine.slice(colonIdx + 1);
        if (value.startsWith(" ")) {
          value = value.slice(1);
        }
      }

      if (field === "event") {
        event = value;
      } else if (field === "data") {
        dataLines.push(value);
        hasData = true;
      } else if (field === "id") {
        id = value;
      }
    }

    if (hasData || event === "ready") {
      return {
        id,
        event,
        data: dataLines.join("\n"),
      };
    }
    return null;
  }

  reset(): void {
    this.buffer = "";
  }
}
