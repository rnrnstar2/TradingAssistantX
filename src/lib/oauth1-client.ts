import { createHmac, randomBytes } from 'crypto';

/**
 * OAuth1.0a認証に必要な認証情報
 */
export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * OAuth1.0a署名生成に必要なパラメータ
 */
export interface OAuth1SignatureParams {
  method: string;
  url: string;
  params?: Record<string, string>;
}

/**
 * ランダムなnonceを生成
 * @returns 32文字のランダムな文字列
 */
export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

/**
 * 現在のUnixタイムスタンプを生成
 * @returns Unix時刻（秒）
 */
export function generateTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * RFC 3986に準拠したパーセントエンコーディング
 * @param str エンコードする文字列
 * @returns エンコードされた文字列
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * OAuth1.0aパラメータを正規化
 * @param params パラメータオブジェクト
 * @returns 正規化されたパラメータ文字列
 */
function normalizeParameters(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const encodedParams = sortedKeys.map(key => {
    return `${percentEncode(key)}=${percentEncode(params[key])}`;
  });
  return encodedParams.join('&');
}

/**
 * OAuth1.0a署名ベース文字列を生成
 * @param method HTTPメソッド
 * @param url リクエストURL
 * @param normalizedParams 正規化されたパラメータ
 * @returns 署名ベース文字列
 */
function createSignatureBaseString(
  method: string,
  url: string,
  normalizedParams: string
): string {
  return [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(normalizedParams)
  ].join('&');
}

/**
 * OAuth1.0a署名を生成
 * @param credentials OAuth認証情報
 * @param params 署名パラメータ
 * @returns Base64エンコードされた署名
 */
export function generateOAuth1Signature(
  credentials: OAuth1Credentials,
  params: OAuth1SignatureParams
): string {
  const timestamp = generateTimestamp();
  const nonce = generateNonce();
  
  // OAuth署名に含めるパラメータ
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp.toString(),
    oauth_nonce: nonce,
    oauth_version: '1.0'
  };
  
  // リクエストパラメータとOAuthパラメータを結合
  const allParams = { ...params.params, ...oauthParams };
  
  // パラメータを正規化
  const normalizedParams = normalizeParameters(allParams);
  
  // 署名ベース文字列を生成
  const signatureBaseString = createSignatureBaseString(
    params.method,
    params.url,
    normalizedParams
  );
  
  // 署名キーを生成
  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.accessTokenSecret)}`;
  
  // HMAC-SHA1署名を生成
  const hmac = createHmac('sha1', signingKey);
  hmac.update(signatureBaseString);
  const signature = hmac.digest('base64');
  
  return signature;
}

/**
 * OAuth1.0a Authorizationヘッダーを生成
 * @param credentials OAuth認証情報
 * @param params 署名パラメータ
 * @returns OAuth Authorizationヘッダー文字列
 */
export function generateOAuth1Header(
  credentials: OAuth1Credentials,
  params: OAuth1SignatureParams
): string {
  const timestamp = generateTimestamp();
  const nonce = generateNonce();
  
  // OAuth署名に含めるパラメータ
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp.toString(),
    oauth_nonce: nonce,
    oauth_version: '1.0'
  };
  
  // リクエストパラメータとOAuthパラメータを結合（署名計算用）
  const allParams = { ...params.params, ...oauthParams };
  
  // パラメータを正規化
  const normalizedParams = normalizeParameters(allParams);
  
  // 署名ベース文字列を生成
  const signatureBaseString = createSignatureBaseString(
    params.method,
    params.url,
    normalizedParams
  );
  
  // 署名キーを生成
  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.accessTokenSecret)}`;
  
  // HMAC-SHA1署名を生成
  const hmac = createHmac('sha1', signingKey);
  hmac.update(signatureBaseString);
  const signature = hmac.digest('base64');
  
  // Authorizationヘッダーに含めるパラメータ（署名を追加）
  const authParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature
  };
  
  // Authorizationヘッダー文字列を生成
  const headerParts = Object.keys(authParams)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(authParams[key])}"`)
    .join(', ');
  
  return `OAuth ${headerParts}`;
}