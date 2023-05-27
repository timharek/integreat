import test from 'ava'
import nock from 'nock'
import Integreat from '../index.js'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import mutations from '../mutations/index.js'
import resources from '../tests/helpers/resources/index.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { EndpointDef } from '../service/endpoints/types.js'

import getMeta from './getMeta.js'

// Setup

const defs = (endpoints: EndpointDef[], meta: string | null = 'meta') => ({
  schemas: [
    {
      id: 'meta',
      service: 'store',
      shape: {
        lastSyncedAt: 'date',
        count: 'integer',
        status: 'string',
      },
      access: 'auth',
    },
  ],
  services: [
    {
      id: 'store',
      ...jsonServiceDef,
      meta: meta || undefined,
      endpoints,
    },
    {
      id: 'entries',
      ...jsonServiceDef,
      meta: 'meta',
      endpoints,
    },
  ],
  mutations,
})

const mutation = {
  response: 'response',
  'response.data': ['response.data', { $apply: 'cast_meta' }],
}

const lastSyncedAt = new Date()
const metadata = { lastSyncedAt, count: 5, status: 'ready' }

const ident = { id: 'johnf' }

test.after(() => {
  nock.restore()
})

// Tests

test('should get metadata for service', async (t) => {
  nock('http://api1.test')
    .get('/database/meta:store')
    .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{+payload.id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = () => great.services.store
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
    meta: { ident },
  }
  const expected = {
    status: 'ok',
    data: { service: 'store', meta: { lastSyncedAt } },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should get several metadata for service', async (t) => {
  nock('http://api2.test')
    .get('/database/meta:store')
    .reply(200, { id: 'meta:store', ...metadata })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api2.test/database/{+payload.id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: ['lastSyncedAt', 'count'],
      targetService: 'store',
      endpoint: 'getMeta',
    },
    meta: { ident },
  }
  const expected = { service: 'store', meta: { lastSyncedAt, count: 5 } }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should get all metadata for service', async (t) => {
  nock('http://api3.test')
    .get('/database/meta:store')
    .reply(200, { id: 'meta:store', ...metadata })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api3.test/database/{+payload.id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: { targetService: 'store' },
    meta: { ident },
  }
  const expected = {
    service: 'store',
    meta: { lastSyncedAt, count: 5, status: 'ready' },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should get metadata for service with type', async (t) => {
  nock('http://api1.test')
    .get('/database/meta:store:entry')
    .reply(200, { id: 'meta:store:entry', _rev: '000001', ...metadata })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{+payload.id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = () => great.services.store
  const action = {
    type: 'GET_META',
    payload: {
      type: 'entry',
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
    meta: { ident },
  }
  const expected = {
    status: 'ok',
    data: { service: 'store', meta: { lastSyncedAt } },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should get metadata for service with several types', async (t) => {
  nock('http://api1.test')
    .get('/database/meta:store:entry|article')
    .reply(200, { id: 'meta:store:entry|article', _rev: '000001', ...metadata })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{+payload.id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = () => great.services.store
  const action = {
    type: 'GET_META',
    payload: {
      type: ['entry', 'article'],
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
    meta: { ident },
  }
  const expected = {
    status: 'ok',
    data: { service: 'store', meta: { lastSyncedAt } },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should get metadata for service with metaKey', async (t) => {
  nock('http://api1.test')
    .get('/database/meta:store:product:hardware')
    .reply(200, {
      id: 'meta:store:product:hardware',
      _rev: '000001',
      ...metadata,
    })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{+payload.id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = () => great.services.store
  const action = {
    type: 'GET_META',
    payload: {
      type: 'product',
      keys: 'lastSyncedAt',
      metaKey: 'hardware',
      targetService: 'store',
    },
    meta: { ident },
  }
  const expected = {
    status: 'ok',
    data: { service: 'store', meta: { lastSyncedAt } },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should return null for metadata when not set on service', async (t) => {
  nock('http://api4.test')
    .get('/database/meta:store')
    .reply(200, { id: 'meta:store', _rev: '000001', type: 'meta' })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api4.test/database/{+payload.id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
    meta: { ident },
  }
  const expected = { service: 'store', meta: { lastSyncedAt: null } }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should return reply from service when not ok', async (t) => {
  nock('http://api5.test').get('/database/meta:store').reply(404)
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api5.test/database/{+payload.id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'notfound', ret.error)
})

test('should return empty object as meta when no data from service', async (t) => {
  nock('http://api5.test').get('/database/meta:store').reply(200, '')
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api5.test/database/{+payload.id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
    meta: { ident },
  }
  const expectedData = { meta: {}, service: 'store' }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expectedData)
})

test('should return noaction when when no meta type is set', async (t) => {
  const scope = nock('http://api6.test')
    .get('/database/meta:store')
    .reply(200, {})
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api6.test/database/{+id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints, null), resources)
  const getService = (_type?: string | string[], service?: string) =>
    service === 'store' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'noaction', ret.error)
  t.is(typeof ret.error, 'string')
  t.false(scope.isDone())
})

test('should get metadata from other service', async (t) => {
  nock('http://api7.test')
    .get('/database/meta:entries')
    .reply(200, { id: 'entries', _rev: '000001', lastSyncedAt })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api7.test/database/{+payload.id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints, null), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'entries'
      ? great.services.entries
      : service === 'store' || type === 'meta'
      ? great.services.store
      : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'entries',
    },
    meta: { ident },
  }
  const expected = { service: 'entries', meta: { lastSyncedAt } }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should return noaction when meta is set to an unknown type', async (t) => {
  const endpoints = [] as EndpointDef[]
  const great = Integreat.create(defs(endpoints, 'unknown'), resources)
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'entries',
    },
    meta: { ident },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'noaction', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return error for unknown service', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'unknown',
    },
    meta: { ident },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'error', ret.error)
})

test('should respond with noaccess when not authorized', async (t) => {
  nock('http://api8.test')
    .get('/database/meta:store')
    .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
  const endpoints = [
    { options: { uri: 'http://api8.test/database/{id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'GET_META',
    payload: {
      keys: 'lastSyncedAt',
      targetService: 'store',
    },
  }

  const ret = await getMeta(action, { ...handlerResources, getService })

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
  t.is(ret.reason, 'NO_IDENT')
  t.falsy(ret.data)
})
