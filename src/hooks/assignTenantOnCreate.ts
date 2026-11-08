import { Forbidden, type CollectionBeforeValidateHook } from 'payload'

import { writableTenantIdsFor } from '../access/tenantScoped'

/**
 * Pins the `tenant` of a new row to one the caller may write to.
 *
 * `tenantWrite` returns `tenant in [...]` for create, but a `Where` cannot
 * filter a row that does not exist yet: Payload does not apply it to the
 * incoming data. Today the multi-tenant plugin's validator on the `tenant`
 * field is what rejects a foreign tenant. This hook makes that rule explicit
 * in our own code, so it does not hinge on a plugin's validator staying
 * as it is across upgrades. The isolation suite asserts both outcomes.
 *
 * With `fillSingleTenant`, it also fills the tenant in when the caller belongs
 * to exactly one tenant and sent none. That is for `enquiries`, whose only
 * non-admin creator is a client website's API key: its contact form should not
 * need to know its own tenant id. Content collections leave it off and keep
 * rejecting a row without a tenant (see the media namespacing test), because
 * there the admin UI always sends one and a missing tenant signals a bug.
 *
 * Platform admins and Local API calls without a user are left alone.
 */
export const assignTenantOnCreate =
  ({
    fillSingleTenant = false,
  }: { fillSingleTenant?: boolean } = {}): CollectionBeforeValidateHook =>
  ({ data, operation, req }) => {
    if (operation !== 'create' || !data || !req.user) return data
    if ((req.user as { platformRole?: string }).platformRole === 'platform-admin') return data

    const writable = writableTenantIdsFor(req.user)
    const sent = data.tenant
    const sentId = typeof sent === 'object' && sent !== null ? (sent as { id: unknown }).id : sent

    if (sentId === undefined || sentId === null || sentId === '') {
      if (fillSingleTenant && writable.length === 1) return { ...data, tenant: writable[0] }
      return data // left for the field's `required` validation to reject
    }

    if (!writable.some((id) => String(id) === String(sentId))) {
      throw new Forbidden(req.t)
    }

    return data
  }
