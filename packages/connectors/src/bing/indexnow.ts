import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface IndexNowSubmitOptions {
  host: string;
  key?: string;
  keyLocation?: string;
  urlList: string[];
  fetchFn?: typeof fetch;
}

export interface IndexNowSubmitResult {
  success: boolean;
  submittedCount: number;
  statusCode: number;
  message: string;
}

export function generateIndexNowKey(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function deployIndexNowKeyFile(projectRoot: string, key: string): string {
  // Check if public/ exists, else write to project root
  const publicDir = path.join(projectRoot, 'public');
  const targetDir = fs.existsSync(publicDir) ? publicDir : projectRoot;
  const keyFilePath = path.join(targetDir, `${key}.txt`);
  fs.writeFileSync(keyFilePath, key, 'utf-8');
  return keyFilePath;
}

export async function submitUrlsToIndexNow(
  options: IndexNowSubmitOptions,
): Promise<IndexNowSubmitResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const key = options.key ?? generateIndexNowKey();
  const endpoint = 'https://api.indexnow.org/indexnow';

  const payload = {
    host: options.host,
    key,
    keyLocation: options.keyLocation,
    urlList: options.urlList,
  };

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (response.status === 200 || response.status === 202) {
      return {
        success: true,
        submittedCount: options.urlList.length,
        statusCode: response.status,
        message: 'URLs soumises avec succès au réseau IndexNow (Bing, Yandex, Naver).',
      };
    }

    return {
      success: false,
      submittedCount: 0,
      statusCode: response.status,
      message: `Réponse IndexNow : ${response.status} ${response.statusText}`,
    };
  } catch (err) {
    return {
      success: false,
      submittedCount: 0,
      statusCode: 500,
      message: `Erreur de connexion IndexNow : ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

