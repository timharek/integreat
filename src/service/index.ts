import createEndpointMappers from './endpoints'
import createError from '../utils/createError'
import { Transporter } from '../types'
import { Service, ServiceDef, MapOptions } from './types'
import Connection from './Connection'
import { Schema } from '../schema'
import Auth from './Auth'
import { lookupById } from '../utils/indexUtils'
import { isObject } from '../utils/is'
import * as authorizeData from './authorize/data'
import authorizeExchange from './authorize/exchange'

interface Resources {
  transporters?: Record<string, Transporter>
  auths?: Record<string, Auth>
  schemas: Record<string, Schema>
  mapOptions?: MapOptions
}

const isTransporter = (transporter: unknown): transporter is Transporter =>
  isObject(transporter)

/**
 * Create a service with the given id and transporter.
 */
export default ({
  transporters,
  auths,
  schemas,
  mapOptions = {},
}: Resources) => ({
  id: serviceId,
  transporter: transporterId,
  auth,
  meta,
  options = {},
  mutation,
  endpoints: endpointDefs = [],
}: ServiceDef): Service => {
  if (typeof serviceId !== 'string' || serviceId === '') {
    throw new TypeError(`Can't create service without an id.`)
  }

  const transporter = lookupById(transporterId, transporters) || transporterId

  mapOptions = { mutateNull: false, ...mapOptions }

  const authorization =
    typeof auth === 'string' ? lookupById(auth, auths) : undefined
  const requireAuth = !!auth

  const authorizeDataFromService = authorizeData.fromService(schemas)
  const authorizeDataToService = authorizeData.toService(schemas)

  const getEndpointMapper = createEndpointMappers(
    endpointDefs,
    options,
    mapOptions,
    mutation,
    isTransporter(transporter) ? transporter.prepareOptions : undefined
  )

  const connection = isTransporter(transporter)
    ? new Connection(transporter, options)
    : null

  // Create the service instance
  return {
    id: serviceId,
    meta,

    /**
     * Return the endpoint mapper that best matches the given exchange.
     */
    endpointFromExchange: getEndpointMapper,

    /**
     * Authorize the exchange. Sets the authorized flag if okay, otherwise sets
     * an appropriate status and error.
     */
    authorizeExchange: authorizeExchange(schemas, requireAuth),

    /**
     * Map request. Will authorize data and map exchange – in that order – when
     * this is an outgoing requst, and will do it in reverse for an incoming
     * request.
     */
    mapRequest(exchange, endpoint, isIncoming = false) {
      const { mutateRequest, allowRawRequest } = endpoint

      // Set endpoint options on exchange
      const nextExchange = { ...exchange, options: { ...endpoint.options } }

      // Authorize and map in right order
      return isIncoming
        ? authorizeDataToService(
            mutateRequest(nextExchange, isIncoming),
            allowRawRequest
          )
        : mutateRequest(
            authorizeDataToService(nextExchange, allowRawRequest),
            isIncoming
          )
    },

    /**
     * Map response. Will map exchange and authorize data – in the order – when
     * this is the response from an outgoing request. Will do it in the reverse
     * order for a response to an incoming request.
     */
    mapResponse(exchange, endpoint, isIncoming = false) {
      // Authorize and map in right order
      const { mutateResponse, allowRawResponse } = endpoint
      return isIncoming
        ? mutateResponse(
            authorizeDataFromService(exchange, allowRawResponse),
            isIncoming
          )
        : authorizeDataFromService(
            mutateResponse(exchange, isIncoming),
            allowRawResponse
          )
    },

    /**
     * The given exchange is sent to the service via the relevant transporter,
     * and the exchange is updated with the response from the service.
     */
    async sendExchange(exchange) {
      if (exchange.status) {
        return exchange
      }

      if (!isTransporter(transporter) || !connection) {
        return createError(
          exchange,
          `Service '${serviceId}' has no transporter`
        )
      }

      if (!exchange.authorized) {
        return createError(exchange, 'Not authorized')
      }

      // When an authenticator is set: Authenticate and apply result to exchange
      if (authorization) {
        await authorization.authenticate()
        exchange = authorization.applyToExchange(exchange, transporter)
        if (exchange.status) {
          return exchange
        }
      }

      try {
        if (await connection.connect(exchange.auth)) {
          const ret = await transporter.send(exchange, connection.object)
          return ret
        } else {
          return createError(
            exchange,
            `Could not connect to service '${serviceId}'. [${
              connection.status
            }] ${connection.error || ''}`.trim()
          )
        }
      } catch (error) {
        return createError(
          exchange,
          `Error retrieving from service '${serviceId}': ${error.message}`
        )
      }
    },
  }
}

// const knownActions = ['GET', 'SET', 'DELETE']
//
// export const respondToUnknownAction = _options => args =>
//   args.request && knownActions.includes(args.request.action)
//     ? args
//     : { ...args, response: { status: 'noaction' } }