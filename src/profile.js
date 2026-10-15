import defaultProfile from './default.js';

/**
 * Merge a user config over the defaults.
 * Arrays are replaced wholesale rather than concatenated: a card either has
 * your intro lines or the example ones, never a mix of both.
 */
export function mergeProfile(base, override = {}) {
  return {
    ...base,
    ...override,
    menu: override.menu ?? base.menu,
    exit: override.exit ?? base.exit,
  };
}

/** Load me.config.js if the project has one, otherwise fall back silently. */
async function loadUserConfig() {
  // In the browser there is no me.config.js — the web IDE passes its own
  // profile straight to the renderer instead.
  if (typeof window !== 'undefined') return {};

  try {
    const mod = await import('../me.config.js');
    const config = mod.profile ?? mod.default;
    return config ?? {};
  } catch {
    return {};
  }
}

/** The profile this copy of the project shows. */
export const profile = mergeProfile(defaultProfile, await loadUserConfig());

export default profile;