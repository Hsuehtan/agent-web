/**
 * Server-side OEM runtime module.
 *
 * Re-exports the OEM config for server-side consumption.
 *
 * Provider filtering is applied directly in `shared/providers.ts` at load time
 * (to avoid circular dependencies), so no filter function is needed here.
 */
import oemConfig from '../../../../oem.config'

export { oemConfig }
