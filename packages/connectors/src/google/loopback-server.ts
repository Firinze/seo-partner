import http from 'node:http';
import type { AddressInfo } from 'node:net';

export interface LoopbackServerOptions {
  defaultPort?: number;
  timeoutMs?: number;
}

export interface LoopbackServerHandle {
  port: number;
  redirectUri: string;
  waitForAuthorizationCode: () => Promise<string>;
  close: () => Promise<void>;
}

export async function startOAuthLoopbackServer(
  options: LoopbackServerOptions = {},
): Promise<LoopbackServerHandle> {
  const defaultPort = options.defaultPort ?? 51842;
  const timeoutMs = options.timeoutMs ?? 120000;

  let resolveCode: (code: string) => void;
  let rejectCode: (err: Error) => void;

  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Requête invalide');
      return;
    }

    const parsedUrl = new URL(req.url, 'http://127.0.0.1');
    if (parsedUrl.pathname === '/oauth2callback') {
      const code = parsedUrl.searchParams.get('code');
      const error = parsedUrl.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body><h2>Échec de l'authentification</h2><p>${error}</p></body></html>`);
        rejectCode(new Error(`Erreur OAuth : ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #f8fafc;">
              <h2 style="color: #38bdf8;">Authentification Google Search Console Réussie</h2>
              <p>Votre jeton a été transmis avec succès à SEO Partner.</p>
              <p style="color: #94a3b8;">Vous pouvez maintenant fermer cet onglet et revenir à votre terminal ou IDE.</p>
            </body>
          </html>
        `);
        resolveCode(code);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Page non trouvée');
  });

  const port = await new Promise<number>((resolve, reject) => {
    const tryListen = (targetPort: number) => {
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && targetPort === defaultPort) {
          // Port 51842 occupied: allocate dynamic port (0 allows OS to pick free port)
          server.removeAllListeners('error');
          tryListen(0);
        } else {
          reject(err);
        }
      });

      server.listen(targetPort, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        resolve(addr.port);
      });
    };

    tryListen(defaultPort);
  });

  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

  const timeoutTimer = setTimeout(() => {
    rejectCode(new Error('Délai d\'attente d\'autorisation OAuth dépassé (2 minutes).'));
    server.close();
  }, timeoutMs);

  const close = async (): Promise<void> => {
    clearTimeout(timeoutTimer);
    return new Promise<void>((res) => {
      server.close(() => res());
    });
  };

  return {
    port,
    redirectUri,
    waitForAuthorizationCode: async () => {
      try {
        const code = await codePromise;
        return code;
      } finally {
        await close();
      }
    },
    close,
  };
}

