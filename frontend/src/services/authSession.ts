type RefreshPayload = {
  token?: unknown;
};


export class AuthSession {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(
    private readonly fetcher: typeof fetch,
    private readonly refreshUrl: string,
  ) {}

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  refreshAccessToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<string | null> {
    try {
      const response = await this.fetcher(this.refreshUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        this.clearAccessToken();
        return null;
      }

      const payload = (await response.json()) as RefreshPayload;
      if (typeof payload.token !== 'string' || payload.token.length === 0) {
        this.clearAccessToken();
        return null;
      }

      this.setAccessToken(payload.token);
      return payload.token;
    } catch {
      this.clearAccessToken();
      return null;
    }
  }

  async fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    retryOnUnauthorized = true,
  ): Promise<Response> {
    const response = await this.fetchWithCurrentToken(input, init);
    if (response.status !== 401 || !this.accessToken || !retryOnUnauthorized) {
      return response;
    }

    const renewedToken = await this.refreshAccessToken();
    if (!renewedToken) return response;
    return this.fetchWithCurrentToken(input, init);
  }

  private fetchWithCurrentToken(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    } else {
      headers.delete('Authorization');
    }
    return this.fetcher(input, {
      ...init,
      credentials: 'include',
      headers,
    });
  }
}
