/**
 * Lambda proxy utility for B2C Next.js API routes.
 * Each B2C API route calls its corresponding Lambda function URL
 * instead of hitting MongoDB directly.
 *
 * Lambda Function URLs are set via environment variables.
 * In dev mode (LAMBDA_PROXY_ENABLED=false) the routes still hit DB directly.
 */

export const LAMBDA_URLS = {
  auth: process.env.LAMBDA_URL_B2C_AUTH || '',
  admin: process.env.LAMBDA_URL_B2C_ADMIN || '',
  inspector: process.env.LAMBDA_URL_B2C_INSPECTOR || '',
  properties: process.env.LAMBDA_URL_B2C_PROPERTIES || '',
  booking: process.env.LAMBDA_URL_B2C_BOOKING || '',
  agents: process.env.LAMBDA_URL_B2C_AGENTS || '',
  payments: process.env.LAMBDA_URL_B2C_PAYMENTS || '',
  scoring: process.env.LAMBDA_URL_B2C_SCORING || '',
  dashboard: process.env.LAMBDA_URL_B2C_DASHBOARD || '',
  users: process.env.LAMBDA_URL_B2C_USERS || '',
} as const;

export const LAMBDA_PROXY_ENABLED = process.env.LAMBDA_PROXY_ENABLED === 'true';

/**
 * Forward a Next.js API request to a Lambda Function URL.
 * Preserves method, headers (auth token), query params, and body.
 *
 * @param lambdaBaseUrl  - Lambda Function URL base (e.g. https://xxx.lambda-url.ap-south-1.on.aws)
 * @param path           - Path suffix to append (e.g. /login)
 * @param req            - Incoming NextRequest
 */
export async function forwardToLambda(
  lambdaBaseUrl: string,
  path: string,
  req: Request
): Promise<Response> {
  const url = new URL(path, lambdaBaseUrl);

  // Forward query parameters
  const incomingUrl = new URL(req.url);
  incomingUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward auth token
  const authToken =
    req.headers.get('x-access-token') ||
    req.headers.get('authorization');
  if (authToken) {
    headers['x-access-token'] = authToken.replace('Bearer ', '');
  }

  const method = req.method;
  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(method);

  const fetchOptions: RequestInit = {
    method,
    headers,
    ...(hasBody && { body: req.body }),
    // @ts-ignore — Node.js fetch duplex required for streaming body
    duplex: 'half',
  };

  return fetch(url.toString(), fetchOptions);
}
