import mapAny = require('map-any')
import { GenericData, DataObject } from '../types'

function uppercase (value: GenericData) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value
}

export default (operands: DataObject) => mapAny(uppercase)