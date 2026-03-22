import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string) {
  const url = parse(domain);
  // Don't set Domain for localhost — Safari blocks Domain=localhost cookies
  if (url.hostname === 'localhost') {
    return undefined as any;
  }
  return url.domain! ? '.' + url.domain! : url.hostname!;
}
