import mapTransform from 'map-transform'
import type {
  MapDefinition,
  MapTransform,
  MapPipe,
} from 'map-transform/types.js'
import { Action } from '../../types.js'
import { MapOptions } from '../types.js'
import { EndpointDef, Endpoint, EndpointOptions } from './types.js'
import isMatch from './match.js'
import {
  prepareActionForMapping,
  populateActionAfterMapping,
} from '../../utils/mappingHelpers.js'
import { ensureArray } from '../../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../../utils/is.js'

export interface PrepareOptions {
  (options: EndpointOptions, serviceId: string): EndpointOptions
}

function mutate(
  mutator: MapTransform,
  data: unknown,
  fromService: boolean,
  noDefaults = false
) {
  if (fromService) {
    return noDefaults ? mutator.onlyMappedValues(data) : mutator(data)
  } else {
    return noDefaults ? mutator.rev.onlyMappedValues(data) : mutator.rev(data)
  }
}

function mutateAction(
  mutator: MapTransform | null,
  isRequest: boolean,
  mapNoDefaults: boolean
) {
  if (!mutator) {
    return (action: Action) => action
  }

  return (action: Action, isIncoming = false) =>
    populateActionAfterMapping(
      action,
      mutate(
        mutator,
        prepareActionForMapping(action, isRequest),
        isRequest ? !!isIncoming : !isIncoming,
        mapNoDefaults ||
          (isRequest
            ? action.payload.sendNoDefaults
            : action.response?.returnNoDefaults)
      )
    )
}

const flattenIfOneOrNone = <T>(arr: T[]): T | T[] =>
  arr.length <= 1 ? arr[0] : arr

const setModifyFlag = (def?: MapDefinition) =>
  isObject(def) ? { ...def, $modify: true } : def

/**
 * Create endpoint from definition.
 */
export default function createEndpoint(
  serviceId: string,
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  serviceMutation?: MapDefinition,
  prepareOptions: PrepareOptions = (options) => options
) {
  return function (endpointDef: EndpointDef): Endpoint {
    const mutation = flattenIfOneOrNone(
      [...ensureArray(serviceMutation), ...ensureArray(endpointDef.mutation)]
        .map(setModifyFlag)
        .filter(isNotNullOrUndefined)
    ) as MapPipe | MapDefinition
    const mutator = mutation ? mapTransform(mutation, mapOptions) : null

    const options = prepareOptions(
      {
        ...serviceOptions,
        ...endpointDef.options,
      },
      serviceId
    )

    const {
      id,
      allowRawRequest = false,
      allowRawResponse = false,
      sendNoDefaults = false,
      returnNoDefaults = false,
      match,
    } = endpointDef

    return {
      id,
      allowRawRequest,
      allowRawResponse,
      match,
      options,
      mutateRequest: mutateAction(mutator, true, sendNoDefaults),
      mutateResponse: mutateAction(mutator, false, returnNoDefaults),
      isMatch: isMatch(endpointDef),
    }
  }
}
