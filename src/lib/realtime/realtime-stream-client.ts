
export interface AdminStreamClientOptions {
  streamUrl: string;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  onEvents: (types: string[]) => void;
  onConnected?: () => void;
  onHealthChange?: (healthy: boolean) => void;
  fetchFn?: typeof fetch;
  createParser?: () => { feed: (chunk: string) => Array<{ event: string; data?: string }> };
}

export class RealtimeStreamClient {
  private streamUrl: string;
  private getAccessToken: () => string | null;
  private refreshAccessToken: () => Promise<string | null>;
  private onEvents: (types: string[]) => void;
  private onConnected?: () => void;
  private onHealthChange?: (healthy: boolean) => void;
  private fetchFn: typeof fetch;
  private createParser: () => { feed: (chunk: string) => Array<{ event: string; data?: string }> };

  private abortController: AbortController | null = null;
  private isTerminated = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isHealthy = false;
  private failedAttempts = 0;

  constructor(options: AdminStreamClientOptions) {
    this.streamUrl = options.streamUrl;
    this.getAccessToken = options.getAccessToken;
    this.refreshAccessToken = options.refreshAccessToken;
    this.onEvents = options.onEvents;
    this.onConnected = options.onConnected;
    this.onHealthChange = options.onHealthChange;
    this.fetchFn = options.fetchFn || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (undefined as any));
    this.createParser = options.createParser || (() => ({ feed: () => [] }));
  }

  getIsHealthy(): boolean {
    return this.isHealthy;
  }

  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  computeBackoff(attempts: number): number {
    return Math.min(30000, 1000 * Math.pow(2, attempts) + Math.random() * 1000);
  }

  private setHealthy(val: boolean) {
    if (this.isHealthy !== val) {
      this.isHealthy = val;
      this.onHealthChange?.(val);
    }
  }

  scheduleReconnect(delayMs: number): void {
    if (this.isTerminated) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      void this.connect();
    }, delayMs);
  }

  async connect(): Promise<void> {
    if (this.isTerminated) return;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const token = this.getAccessToken();
    if (!token) {
      this.failedAttempts++;
      if (this.failedAttempts >= 2) this.setHealthy(false);
      this.scheduleReconnect(3000);
      return;
    }

    try {
      const response = await this.fetchFn(this.streamUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        credentials: "omit",
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          try {
            const freshToken = await this.refreshAccessToken();
            if (freshToken && !this.isTerminated) {
              void this.connect();
              return;
            }
          } catch {
            this.setHealthy(false);
            return;
          }
        }

        this.failedAttempts++;
        if (this.failedAttempts >= 2) {
          this.setHealthy(false);
        }

        const backoff = this.computeBackoff(this.failedAttempts);
        this.scheduleReconnect(backoff);
        return;
      }

      if (!response.body) {
        throw new Error("No response body received for SSE stream");
      }

      this.failedAttempts = 0;
      this.setHealthy(true);
      this.onConnected?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = this.createParser();

      while (!this.isTerminated) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const messages = parser.feed(chunk);

        for (const msg of messages) {
          if (msg.event === "sync" && msg.data) {
            try {
              const parsed = JSON.parse(msg.data);
              if (parsed?.types && Array.isArray(parsed.types)) {
                this.onEvents(parsed.types);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (this.isTerminated || this.abortController.signal.aborted) {
        return;
      }
      this.failedAttempts++;
      if (this.failedAttempts >= 2) {
        this.setHealthy(false);
      }
      const backoff = this.computeBackoff(this.failedAttempts);
      this.scheduleReconnect(backoff);
    }
  }

  disconnect(): void {
    this.isTerminated = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.abortController?.abort();
    this.setHealthy(false);
  }
}
