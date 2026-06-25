/**
 * Client-side OEM runtime module.
 *
 * Re-exports the OEM config and provides client-specific utilities
 * (e.g. i18n brand replacement).
 *
 * Provider filtering is handled server-side (see packages/server/src/config/oem.ts).
 */
import oemConfig from '@oem-config'

export { oemConfig }
export default oemConfig

/**
 * Replace brand name in a translated string.
 * Replaces all occurrences of "Hermes" / "hermes" (word-level) with the
 * configured `i18n.brandName`, unless brandName is empty or equals "Hermes".
 */
export function replaceBrandInText<T>(text: T): T {
  if (typeof text !== 'string') return text
  const brand = oemConfig.i18n.brandName
  if (!brand || brand === 'Hermes') return text
  // Replace "Hermes" (capitalized) → brand as-is
  // Replace "hermes" (lowercase) → brand.toLowerCase()
  return text
    .replace(/\bHermes\b/g, brand)
    .replace(/\bhermes\b/g, brand.toLowerCase()) as T
}
