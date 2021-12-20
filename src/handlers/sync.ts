import pLimit = require('p-limit')
import ms = require('ms')
import {
  Action,
  Response,
  HandlerDispatch,
  Meta,
  TypedData,
  Params,
  ActionHandlerResources,
} from '../types'
import { createErrorOnAction } from '../utils/createError'
import { isTypedData, isNotNullOrUndefined } from '../utils/is'
import { ensureArray } from '../utils/array'
import { castDate } from '../transformers/builtIns/date'
import { castNumber } from '../transformers/builtIns/number'

type RetrieveOptions = 'all' | 'updated' | 'created'

interface ActionParams extends Record<string, unknown> {
  type: string | string[]
  service?: string
  action?: string
  updatedAfter?: Date
  updatedUntil?: Date
  updatedSince?: Date
  updatedBefore?: Date
  createdAfter?: Date
  createdUntil?: Date
  createdSince?: Date
  createdBefore?: Date
}

interface SyncParams extends Record<string, unknown> {
  from?: string | Partial<ActionParams> | (string | Partial<ActionParams>)[]
  to?: string | Partial<ActionParams>
  updatedAfter?: Date
  updatedUntil?: Date
  updatedSince?: Date
  updatedBefore?: Date
  createdAfter?: Date
  createdUntil?: Date
  createdSince?: Date
  createdBefore?: Date
  retrieve?: RetrieveOptions
  doFilterData?: boolean
  doQueueSet?: boolean
  metaKey?: string
  alwaysSet?: boolean
  setLastSyncedAtFromData?: boolean
  maxPerSet?: number
}

interface MetaData {
  meta: {
    lastSyncedAt?: Date
  }
}

const createGetMetaAction = (
  targetService: string,
  type?: string | string[],
  metaKey?: string,
  meta?: Meta
) => ({
  type: 'GET_META',
  payload: { type, params: { keys: 'lastSyncedAt', metaKey }, targetService },
  meta,
})

const createSetMetaAction = (
  lastSyncedAt: Date,
  targetService: string,
  type?: string | string[],
  metaKey?: string,
  meta?: Meta
) => ({
  type: 'SET_META',
  payload: { type, params: { meta: { lastSyncedAt }, metaKey }, targetService },
  meta,
})

const createGetAction = (
  { type, service: targetService, action = 'GET', ...params }: ActionParams,
  meta?: Meta
) => ({
  type: action,
  payload: { type, params, targetService },
  meta,
})

const createSetAction = (
  data: unknown,
  { type, service: targetService, action = 'SET', ...params }: ActionParams,
  doQueueSet: boolean,
  meta?: Meta
): Action => ({
  type: action,
  payload: { type, data, params, targetService },
  meta: { ...meta, queue: doQueueSet },
})

async function setData(
  dispatch: HandlerDispatch,
  data: TypedData[],
  { alwaysSet = false, maxPerSet, ...params }: ActionParams,
  doQueueSet: boolean,
  meta?: Meta
): Promise<Response> {
  let index = data.length === 0 && alwaysSet ? -1 : 0 // Trick to always dispatch SET for `alwaysSet`
  const maxCount = castNumber(maxPerSet) || Number.MAX_SAFE_INTEGER

  while (index < data.length) {
    const { response } = await dispatch(
      createSetAction(
        data.slice(index, index + maxCount),
        params,
        doQueueSet,
        meta
      )
    )
    if (!response?.status || !['ok', 'queued'].includes(response.status)) {
      return {
        status: response?.status || 'error',
        error: `SYNC: Could not set data. Set ${index} of ${
          data.length
        } items. ${response?.error || ''}`.trim(),
      }
    }
    index += maxCount
  }

  return data.length > 0 || alwaysSet
    ? { status: 'ok' }
    : { status: 'noaction', error: 'SYNC: No data to set' }
}

const setDatePropIf = (date: string | Date | undefined, prop: string) =>
  date ? { [prop]: castDate(date) || undefined } : {}

async function getLastSyncedAt(
  dispatch: HandlerDispatch,
  service: string,
  type: string | string[],
  metaKey?: string,
  meta?: Meta
) {
  const metaResponse = await dispatch(
    createGetMetaAction(service, type, metaKey, meta)
  )
  return (
    castDate(
      (metaResponse.response?.data as MetaData | undefined)?.meta.lastSyncedAt
    ) || undefined
  )
}

function setCounterPart(params: ActionParams, dateSet: 'updated' | 'created') {
  const after = params[`${dateSet}After`]
  const since = params[`${dateSet}Since`]
  const until = params[`${dateSet}Until`]
  const before = params[`${dateSet}Before`]
  const nextParams: Partial<ActionParams> = {}
  if (after) {
    nextParams[`${dateSet}Since`] = new Date(after.getTime() + 1)
  } else if (since) {
    nextParams[`${dateSet}After`] = new Date(since.getTime() - 1)
  }
  if (until) {
    nextParams[`${dateSet}Before`] = new Date(until.getTime() + 1)
  } else if (before) {
    nextParams[`${dateSet}Until`] = new Date(before.getTime() - 1)
  }
  return nextParams
}

const setDatesAndType = (
  dispatch: HandlerDispatch,
  type: string | string[],
  syncParams: SyncParams,
  meta?: Meta
) =>
  async function setUpdatedDatesAndType(params: Partial<ActionParams>) {
    const {
      retrieve,
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      createdAfter,
      createdSince,
      createdUntil,
      createdBefore,
      metaKey,
    } = syncParams
    const nextParams: ActionParams = {
      ...setDatePropIf(updatedAfter, 'updatedAfter'),
      ...setDatePropIf(updatedSince, 'updatedSince'),
      ...setDatePropIf(updatedUntil, 'updatedUntil'),
      ...setDatePropIf(updatedBefore, 'updatedBefore'),
      ...setDatePropIf(createdAfter, 'createdAfter'),
      ...setDatePropIf(createdSince, 'createdSince'),
      ...setDatePropIf(createdUntil, 'createdUntil'),
      ...setDatePropIf(createdBefore, 'createdBefore'),
      type,
      ...params,
    }

    // Fetch lastSyncedAt from meta when needed, and use as updatedAfter
    if (
      retrieve === 'updated' &&
      params.service &&
      !updatedAfter &&
      !updatedSince
    ) {
      nextParams.updatedAfter = await getLastSyncedAt(
        dispatch,
        params.service,
        type,
        metaKey,
        meta
      )
    } else if (
      retrieve === 'created' &&
      params.service &&
      !createdAfter &&
      !createdSince
    ) {
      nextParams.createdAfter = await getLastSyncedAt(
        dispatch,
        params.service,
        type,
        metaKey,
        meta
      )
    }

    // Make sure the "counterpart" dates are set
    return {
      ...nextParams,
      ...setCounterPart(nextParams, 'created'),
      ...setCounterPart(nextParams, 'updated'),
    }
  }

const setMetaFromParams = (
  dispatch: HandlerDispatch,
  {
    payload: { type, params: { metaKey } = {} },
    meta: { id, ...meta } = {},
  }: Action,
  datesFromData: (Date | undefined)[],
  gottenDataDate: Date
) =>
  async function setMetaFromParams(
    { service, updatedUntil, createdUntil }: ActionParams,
    index: number
  ) {
    if (service) {
      let lastSyncedAt =
        // eslint-disable-next-line security/detect-object-injection
        datesFromData[index] || updatedUntil || createdUntil || gottenDataDate
      if (lastSyncedAt > gottenDataDate) {
        lastSyncedAt = gottenDataDate
      }
      return dispatch(
        createSetMetaAction(
          lastSyncedAt,
          service,
          type,
          metaKey as string | undefined,
          meta
        )
      )
    }
    return { status: 'noaction' }
  }

const paramsAsObject = (params?: string | Partial<ActionParams>) =>
  typeof params === 'string' ? { service: params } : params

const generateFromParams = async (
  dispatch: HandlerDispatch,
  type: string | string[],
  { payload: { params = {} }, meta: { id, ...meta } = {} }: Action
) =>
  Promise.all(
    ensureArray((params as SyncParams).from)
      .map(paramsAsObject)
      .filter(isNotNullOrUndefined)
      .map(setDatesAndType(dispatch, type, params, meta))
      .map((p) => pLimit(1)(() => p)) // Run one promise at a time
  )

function generateSetDates(
  fromParams: ActionParams[],
  params: Params,
  dateSet: 'updated' | 'created'
) {
  const until = castDate(params[`${dateSet}Until`])
  const before = castDate(params[`${dateSet}Before`])
  const oldestAfter = fromParams
    .map((params) => params[`${dateSet}After`])
    .sort()[0]
  return {
    ...(oldestAfter
      ? {
          [`${dateSet}After`]: oldestAfter,
          [`${dateSet}Since`]: new Date(oldestAfter.getTime() + 1),
        }
      : {}),
    ...(until
      ? {
          [`${dateSet}Until`]: until,
          [`${dateSet}Before`]: new Date(until.getTime() + 1),
        }
      : {}),
    ...(before
      ? {
          [`${dateSet}Before`]: before,
          [`${dateSet}Until`]: new Date(before.getTime() - 1),
        }
      : {}),
  }
}

function generateToParams(
  fromParams: ActionParams[],
  type: string | string[],
  { payload: { params = {} } }: Action
): ActionParams {
  const { to, maxPerSet, alwaysSet }: SyncParams = params
  return {
    type,
    alwaysSet,
    maxPerSet,
    ...generateSetDates(fromParams, params, 'updated'),
    ...generateSetDates(fromParams, params, 'created'),
    ...paramsAsObject(to),
  }
}

async function extractActionParams(
  action: Action,
  dispatch: HandlerDispatch
): Promise<[ActionParams[], ActionParams | undefined]> {
  const { type } = action.payload
  // Require a type
  if (!type) {
    return [[], undefined]
  }

  // Make from an array of params objects and fetch updatedAfter or createdAfter
  // from meta when needed
  const fromParams = await generateFromParams(dispatch, type, action)

  return [fromParams, generateToParams(fromParams, type, action)]
}

const dateFieldFromRetrieve = (retrieve?: RetrieveOptions) =>
  retrieve === 'created' ? 'createdAt' : 'updatedAt'

function sortByItemDate(retrieve?: RetrieveOptions) {
  const dateField = dateFieldFromRetrieve(retrieve)
  return ({ [dateField]: a }: TypedData, { [dateField]: b }: TypedData) => {
    const dateA = a ? new Date(a).getTime() : undefined
    const dateB = b ? new Date(b).getTime() : undefined
    return dateA && dateB ? dateA - dateB : dateA ? -1 : 1
  }
}

const withinDateRange =
  (updatedAfter?: Date, updatedUntil?: Date) => (data: TypedData) =>
    (!updatedAfter || (!!data.updatedAt && data.updatedAt > updatedAfter)) &&
    (!updatedUntil || (!!data.updatedAt && data.updatedAt <= updatedUntil))

async function retrieveDataFromOneService(
  dispatch: HandlerDispatch,
  params: ActionParams,
  doFilterData: boolean,
  meta?: Meta
) {
  const { updatedAfter, updatedUntil } = params

  // Fetch data from service
  const responseAction = await dispatch(createGetAction(params, meta))

  // Throw is not successfull
  if (responseAction.response?.status !== 'ok') {
    throw new Error(responseAction.response?.error)
  }

  // Return array of data filtered with updatedAt within date range
  const data = ensureArray(responseAction.response.data).filter(isTypedData)
  return doFilterData && (updatedAfter || updatedUntil)
    ? data.filter(withinDateRange(updatedAfter, updatedUntil))
    : data
}

const msFromDelta = (delta: string) =>
  delta === 'now'
    ? 0
    : delta[0] === '+'
    ? ms(delta.slice(1))
    : delta[0] === '-'
    ? ms(delta)
    : undefined

function generateUntilDate(date: unknown) {
  if (typeof date === 'string') {
    const delta = msFromDelta(date)
    if (typeof delta === 'number') {
      return new Date(Date.now() + delta)
    }
  }
  return date
}

const prepareInputParams = (action: Action) => ({
  ...action,
  payload: {
    ...action.payload,
    params: {
      ...action.payload.params,
      updatedUntil: generateUntilDate(action.payload.params?.updatedUntil),
      createdUntil: generateUntilDate(action.payload.params?.createdUntil),
      retrieve: action.payload.params?.retrieve ?? 'all',
    } as SyncParams,
  },
})

const extractItemDate = (retrieve?: RetrieveOptions) => (item?: TypedData) =>
  (retrieve === 'created'
    ? item?.createdAt && new Date(item.createdAt)
    : item?.updatedAt && new Date(item.updatedAt)) || undefined

const fetchDataFromService = (
  fromParams: ActionParams[],
  doFilterData: boolean,
  dispatch: HandlerDispatch,
  { meta: { id, ...meta } = {} }: Action
) =>
  Promise.all(
    fromParams.map((params) =>
      retrieveDataFromOneService(dispatch, params, doFilterData, meta)
    )
  )

const extractLastSyncedAtDates = (
  dataFromServices: TypedData[][],
  retrieve?: RetrieveOptions
) =>
  dataFromServices.map((data) =>
    data
      .map(extractItemDate(retrieve))
      .reduce(
        (lastDate, date) =>
          !lastDate || (date && date > lastDate) ? date : lastDate,
        undefined
      )
  )

/**
 * Handler for SYNC action, to sync data from one service to another.
 *
 * `retrieve` indicates which items to retrieve. The default is `all`, which
 * will retrieve all items from the `get` endpoint(s). Set `retrieve` to
 * `updated` to retrieve only items that are updated after the  `lastSyncedAt`
 * date for the `from` service(s). This is done by passing the `lastSyncedAt`
 * date as a parameter named `updatedAfter` to the `get` endpoint(s), and by
 * filtering away any items received with `updatedAt` earlier than
 * `lastSyncedAt`. You may also set `retrieve` to `created` and have the same
 * effect, but whith `createdAfter` and `createdAt`.
 *
 * The `lastSyncedAt` metadata will be set on the `from` service when items
 * are retrieved and updated. By default it will be set to the `updatedUntil` or
 * `createdUntil` date, or `Date.now()` if `updatedUntil` or `createdUntil` are
 * not given. When `setLastSyncedAtFromData` is true, the latest `updatedAt` or
 * `createdAt` from the data will be used for each service.
 */
export default async function syncHandler(
  inputAction: Action,
  { dispatch, setProgress }: ActionHandlerResources
): Promise<Action> {
  setProgress(0)

  const action = prepareInputParams(inputAction)
  const {
    payload: {
      params: {
        retrieve,
        setLastSyncedAtFromData = false,
        doFilterData = true,
        doQueueSet = true,
      },
    },
    meta: { id, ...meta } = {},
  } = action
  const [fromParams, toParams] = await extractActionParams(action, dispatch)

  if (fromParams.length === 0 || !toParams) {
    return createErrorOnAction(
      action,
      'SYNC: `type`, `to`, and `from` parameters are required',
      'badrequest'
    )
  }

  let data: TypedData[]
  let datesFromData: (Date | undefined)[] = []

  setProgress(0.1)

  try {
    const dataFromServices = await fetchDataFromService(
      fromParams,
      doFilterData,
      dispatch,
      action
    )
    data = dataFromServices.flat().sort(sortByItemDate(retrieve))
    if (setLastSyncedAtFromData) {
      datesFromData = extractLastSyncedAtDates(dataFromServices, retrieve)
    }
  } catch (error) {
    return createErrorOnAction(
      action,
      `SYNC: Could not get data. ${(error as Error).message}`
    )
  }
  const gottenDataDate = new Date()

  setProgress(0.5)

  const response = await setData(dispatch, data, toParams, doQueueSet, meta)
  if (response.status !== 'ok') {
    return createErrorOnAction(
      action,
      response?.error,
      response?.status || 'error'
    )
  }

  setProgress(0.9)

  if (retrieve === 'updated' || retrieve === 'created') {
    await Promise.all(
      fromParams.map(
        setMetaFromParams(dispatch, action, datesFromData, gottenDataDate)
      )
    )
  }

  setProgress(1)

  return { ...action, response: { ...action.response, status: 'ok' } }
}
