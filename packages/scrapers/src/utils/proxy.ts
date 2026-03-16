import ProxyAgent from 'proxy-agent';
import { ProxyAgent as UndiciProxyAgent, setGlobalDispatcher } from 'undici';

let proxyInitialized = false;

export function getProxyUrl(): string | undefined {
  return (
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    undefined
  );
}

export function initProxyFetch(): void {
  if (proxyInitialized) return;
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    setGlobalDispatcher(new UndiciProxyAgent(proxyUrl));
  }
  proxyInitialized = true;
}

export function getProxyAgent(): ProxyAgent | undefined {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return undefined;
  return new ProxyAgent(proxyUrl);
}
