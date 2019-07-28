const { groupBy, prop, mergeDeepWith } = require('ramda')
import { MapTransform } from 'map-transform'
import { GenericData, DataObject } from '../types'
import { SendOptions, Mappings, Request } from './types'

const groupByType = groupBy(prop('$schema'))

const concatOrRight = (left, right) =>
  Array.isArray(left) ? left.concat(right) : right

const mapIt = (
  mapper: MapTransform,
  request: Request,
  target: GenericData = null
) => {
  const { onlyMappedValues = true } = request.params
  const mapped = onlyMappedValues
    ? mapper.rev.onlyMappedValues(request)
    : mapper.rev(request)
  return (
    (target
      ? Array.isArray(target)
        ? [...target].concat(mapped)
        : mergeDeepWith(concatOrRight, target, mapped) // TODO: Move merging to MapTransform
      : mapped) || null
  )
}
const mapItems = (
  data: GenericData,
  request: Request,
  mapping: Mappings,
  target?: GenericData
) =>
  mapping
    ? mapIt(mapping, { ...request, data }, target)
    : target

const mapDataPerType = (
  typeArrays: DataObject,
  request: Request,
  mappings: Mappings
) =>
  Object.keys(typeArrays).reduce(
    (target, type) =>
      mapItems(typeArrays[type], request, mappings[type], target),
    undefined
  )

const mapData = (data: GenericData, request: Request, mappings: Mappings) =>
  data
    ? Array.isArray(data)
      ? mapDataPerType(groupByType(data), request, mappings)
      : mapItems(data, request, mappings[data.$schema])
    : undefined

const applyEndpointMapper = (request: Request, requestMapper?: MapTransform) =>
  requestMapper ? requestMapper.rev(request) : request

/**
 * Map the data going _to_ the service. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 */
function mapToService() {
  return ({ request, requestMapper, mappings }: SendOptions) => {
    const data = mapData(request.data, request, mappings)
    return {
      ...request,
      ...applyEndpointMapper({ ...request, data }, requestMapper)
    }
  }
}

export default mapToService