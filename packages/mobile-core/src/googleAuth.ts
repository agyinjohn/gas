import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { resolveMobileApiUrl } from './client';
import { parseOAuthCallbackUrl } from './auth';

WebBrowser.maybeCompleteAuthSession();

export function getGoogleRedirectUri(): string {
  return Linking.createURL('auth/callback');
}

export async function signInWithGoogle(): Promise<{
  token: string;
  userId: string;
  name: string;
  needsPhone: boolean;
} | null> {
  const redirectUri = getGoogleRedirectUri();
  const authUrl = `${resolveMobileApiUrl()}/api/v1/auth/google?redirect=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success') return null;

  const parsed = parseOAuthCallbackUrl(result.url);
  if (!parsed || parsed.error || !parsed.token) return null;

  return {
    token: parsed.token,
    userId: parsed.userId,
    name: parsed.name,
    needsPhone: parsed.needsPhone,
  };
}
