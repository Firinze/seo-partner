export interface JsRenderedPageResult {
  readonly finalUrl: string;
  readonly statusCode: number;
  readonly html: string;
  readonly headers: Record<string, string>;
}

interface PlaywrightPageLike {
  goto(
    url: string,
    options?: { waitUntil?: 'domcontentloaded' | 'networkidle'; timeout?: number },
  ): Promise<{
    status(): number;
    url(): string;
    allHeaders(): Promise<Record<string, string>>;
  } | null>;
  content(): Promise<string>;
  close(): Promise<void>;
}

interface PlaywrightBrowserLike {
  newPage(options?: { userAgent?: string }): Promise<PlaywrightPageLike>;
  close(): Promise<void>;
}

interface PlaywrightModuleLike {
  chromium: {
    launch(options?: { headless?: boolean }): Promise<PlaywrightBrowserLike>;
  };
}

export async function renderPageWithPlaywright(
  url: string,
  userAgent = 'seo-partner-bot/0.2',
  timeoutMs = 15000,
): Promise<JsRenderedPageResult> {
  let pw: PlaywrightModuleLike;
  try {
    const moduleName = 'playwright';
    pw = (await import(moduleName)) as unknown as PlaywrightModuleLike;
  } catch {
    throw new Error(
      'Playwright is required when using the --js flag. Install it on demand with: pnpm add -D playwright && npx playwright install chromium',
    );
  }

  const browser = await pw.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent });
    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: timeoutMs,
      });
      const html = await page.content();
      const statusCode = response ? response.status() : 200;
      const finalUrl = response ? response.url() : url;
      const headers = response ? await response.allHeaders() : {};
      return {
        finalUrl,
        statusCode,
        html,
        headers,
      };
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

