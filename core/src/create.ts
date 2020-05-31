import { Dictionaries, CustomFunction, MapDefinition } from 'map-transform'
import { Middleware, Transporter } from './types'
import {
  ServiceDef,
  IdentConfig,
  AuthDef,
  Authenticator,
  Service,
} from './service/types'
import { SchemaDef } from './schema/types'
import Auth from './service/Auth'
import builtinHandlers from './handlers'
import builtinTransformers from './transformers/builtIns'
import createSchema, { Schema } from './schema'
import createService from './service'
import createMapOptions from './utils/createMapOptions'
import { lookupById } from './utils/indexUtils'
import createDispatch, { ExchangeHandler } from './dispatch'
import { indexById } from './utils/indexUtils'

export interface Definitions {
  schemas: SchemaDef[]
  services: ServiceDef[]
  mutations?: Record<string, MapDefinition>
  auths?: AuthDef[]
  identConfig?: IdentConfig
  dictionaries?: Dictionaries
}

export interface Resources {
  transporters?: Record<string, Transporter>
  handlers?: Record<string, ExchangeHandler>
  authenticators?: Record<string, Authenticator>
  transformers?: Record<string, CustomFunction>
}

/*
 * Create an Integreat instance.
 */
export default function create(
  {
    services: serviceDefs,
    schemas: schemaDefs,
    mutations,
    auths: authDefs,
    identConfig,
    dictionaries,
  }: Definitions,
  { transporters, transformers, handlers, authenticators }: Resources,
  middlewares: Middleware[] = []
) {
  if (!Array.isArray(serviceDefs) || !Array.isArray(schemaDefs)) {
    throw new TypeError(
      'Please provide Integreat with at least services and schemas'
    )
  }

  // Prepare schemas
  const schemas = schemaDefs
    .map(createSchema)
    .reduce(indexById, {} as Record<string, Schema>)

  // Prepare map options
  const mapOptions = createMapOptions(
    schemas,
    mutations,
    { ...builtinTransformers, ...transformers },
    dictionaries
  )

  // Setup auths object from auth defs
  const auths = Array.isArray(authDefs)
    ? authDefs
        .map(
          (def) =>
            new Auth(
              def.id,
              lookupById(def.authenticator, authenticators),
              def.options
            )
        )
        .reduce(indexById, {} as Record<string, Auth>)
    : undefined

  // Prepare services
  const services = serviceDefs
    .map(
      createService({
        transporters,
        auths,
        transformers, // Provided for validation pipeline only
        schemas,
        mapOptions,
      })
    )
    .reduce(indexById, {} as Record<string, Service>)

  // Create dispatch
  const dispatch = createDispatch({
    identConfig,
    schemas,
    services,
    handlers: { ...builtinHandlers, ...handlers },
    middlewares,
  })

  // Return instance
  return {
    services,
    schemas,
    identType: identConfig && identConfig.type,
    dispatch,

    // on(eventName, serviceId, listener) {
    //   // eslint-disable-next-line security/detect-object-injection
    //   const service = services[serviceId]
    //   if (service && service.on) {
    //     service.on(eventName, listener)
    //   }
    // }
  }
}
