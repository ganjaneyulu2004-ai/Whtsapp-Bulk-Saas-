/**
 * Centralized Meta Graph API Configuration
 * 
 * Changing META_GRAPH_VERSION in your .env file will automatically
 * update every Graph API call across the entire platform.
 */

export const META_GRAPH_VERSION: string =
  process.env.META_GRAPH_VERSION ||
  process.env.NEXT_PUBLIC_META_GRAPH_VERSION ||
  process.env.WA_API_VERSION ||
  "v26.0";

export const META_APP_ID: string =
  process.env.META_APP_ID ||
  process.env.NEXT_PUBLIC_META_APP_ID ||
  "2068663130431385";

export const META_CONFIG_ID: string =
  process.env.META_CONFIG_ID ||
  process.env.NEXT_PUBLIC_META_CONFIG_ID ||
  "1620839459718786";

/**
 * Returns the effective Meta Graph API version string (e.g. "v26.0").
 * Prioritizes the environment variable META_GRAPH_VERSION if set.
 */
export function getMetaGraphVersion(customVersion?: string | null): string {
  if (process.env.META_GRAPH_VERSION) {
    return process.env.META_GRAPH_VERSION;
  }
  return customVersion || process.env.WA_API_VERSION || META_GRAPH_VERSION;
}

/**
 * Returns the full base URL for Meta Graph API calls (e.g. "https://graph.facebook.com/v26.0").
 */
export function getMetaGraphBaseUrl(version?: string | null): string {
  const v = getMetaGraphVersion(version);
  return `https://graph.facebook.com/${v}`;
}

