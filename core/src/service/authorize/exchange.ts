import { ensureArray } from '../../utils/array'
import { Exchange, Ident } from '../../types'
import { AccessDef } from '../../schema/types'
import { Schema } from '../../schema'

const isRoot = (ident?: Ident) => Boolean(ident?.root)

function authorizeByAllow(allow?: string, hasIdent = false) {
  switch (allow) {
    case undefined:
    case 'all':
      return undefined
    case 'auth':
      return hasIdent ? undefined : 'NO_IDENT'
    default:
      // including 'none'
      return 'ALLOW_NONE'
  }
}

const hasRole = (required: string[], present?: string[]) =>
  Boolean(present && required.some((role) => present.includes(role)))

const authMethods = [
  'allow',
  'ident',
  'role',
  'identFromField',
  'roleFromField',
]
const isAuthMethod = (method: string) => authMethods.includes(method)
const hasAuthMethod = (access: AccessDef) =>
  Object.keys(access).filter(isAuthMethod).length > 0

const createRequiredError = (items: string[], itemName: string) =>
  `Authentication was refused, ${itemName}${
    items.length > 1 ? 's' : ''
  } required: ${items.map((item) => `'${item}'`).join(', ')}`

function authorizeByOneSchema(
  ident: Ident | undefined,
  schema: Schema | undefined,
  type: string,
  actionType: string,
  requireAuth: boolean
) {
  if (!schema) {
    return {
      reason: 'NO_SCHEMA',
      error: `Authentication was refused for type '${type}'`,
    }
  }

  const access = schema.accessForAction(actionType)
  if (requireAuth && !hasAuthMethod(access)) {
    return {
      reason: 'ACCESS_METHOD_REQUIRED',
      error: `Authentication was refused for type '${type}'`,
    }
  }

  const allowReason = authorizeByAllow(access.allow, !!ident)
  if (allowReason) {
    return {
      reason: allowReason,
      error: `Authentication was refused for type '${type}'`,
    }
  }

  const roles = ensureArray(access.role)
  if (roles.length > 0 && !hasRole(roles, ident?.roles)) {
    return {
      reason: 'MISSING_ROLE',
      error: createRequiredError(roles, 'role'),
    }
  }

  const idents = ensureArray(access.ident)
  if (idents.length > 0 && ident?.id && !idents.includes(ident?.id)) {
    return {
      reason: 'WRONG_IDENT',
      error: createRequiredError(idents, 'ident'),
    }
  }

  if (
    (typeof access.identFromField === 'string' ||
      typeof access.roleFromField === 'string') &&
    !ident
  ) {
    return {
      reason: 'NO_IDENT',
      error: `Authentication was refused for type '${type}'`,
    }
  }

  return undefined
}

function authorizeBySchema(
  ident: Ident | undefined,
  schemas: Record<string, Schema>,
  actionTypes: string[],
  action: string,
  requireAuth: boolean
) {
  for (const actionType of actionTypes) {
    const error = authorizeByOneSchema(
      ident,
      schemas[actionType], // eslint-disable-line security/detect-object-injection
      actionType,
      action,
      requireAuth
    )
    if (error) {
      return error
    }
  }
  return { reason: undefined, error: undefined }
}

export default (schemas: Record<string, Schema>, requireAuth: boolean) =>
  function authorizeExchange(exchange: Exchange): Exchange {
    const {
      ident,
      status,
      request: { type },
    } = exchange

    // Don't authenticate a request with an existing error
    if (typeof status === 'string' && status !== 'ok') {
      return { ...exchange, authorized: false }
    }

    // Authenticate if not root
    if (!isRoot(ident)) {
      const types = ensureArray(type)

      // Always allow requests without type
      if (types.length > 0) {
        const { reason, error } = authorizeBySchema(
          ident,
          schemas,
          types,
          exchange.type,
          requireAuth
        )
        // If we have got reason or error, the authentication failed
        if (reason || error) {
          return {
            ...exchange,
            authorized: false,
            status: 'noaccess',
            response: { ...exchange.response, error, reason },
          }
        }
      }
    }

    // Authenticated
    return { ...exchange, authorized: true }
  }
