import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string): string | undefined {
  const url = parse(domain);
  // For localhost in dev mode, return undefined to omit the Domain attribute.
  // Safari and some browsers block cookies with Domain=localhost.
  if (url.hostname === 'localhost' && process.env.NOT_SECURED) {
    return undefined;
  }
  return url.domain! ? '.' + url.domain! : url.hostname!;
}
