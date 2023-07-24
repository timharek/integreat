/* eslint-disable security/detect-object-injection */
import { getFirstIfArray } from '../utils/array.js'
import { isObject, isObject } from '../utils/is.js'
import type { Transformer } from 'map-transform/types.js'

const parseObject = (value: string) => {
  try {
    return JSON.parse(value)
  } catch (err) {
    return value
  }
}

const parseForm = (data: unknown) =>
  typeof data === 'string'
    ? data
        .split('&')
        .map((pair) => pair.split('='))
        .map(([key, value]) => ({
          [key]:
            typeof value === 'undefined'
              ? undefined
              : parseObject(decodeURIComponent(value).replace(/\+/g, ' ')),
        }))
        .reduce((object, pair) => ({ ...object, ...pair }), {})
    : null

const formatObject = (value: unknown) =>
  isObject(value) ? JSON.stringify(value) : String(value)
const formatValue = (value: unknown) =>
  encodeURIComponent(formatObject(value)).replace(/%20/g, '+')

const stringifyForm = (data: unknown) =>
  isObject(data)
    ? Object.keys(data)
        .map((key: string) =>
          typeof data[key] === 'undefined'
            ? key
            : `${key}=${formatValue(data[key])}`
        )
        .join('&')
    : null

const form: Transformer = () => () => (data, state) =>
  state.rev ? stringifyForm(getFirstIfArray(data)) : parseForm(data)

export default form
