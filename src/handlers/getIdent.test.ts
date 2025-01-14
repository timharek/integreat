import test from 'ava'
import sinon from 'sinon'
import nock from 'nock'
import Integreat from '../index.js'
import defs from '../tests/helpers/defs/index.js'
import resources from '../tests/helpers/resources/index.js'
import johnfData from '../tests/helpers/data/userJohnf.js'
import ent1Data from '../tests/helpers/data/entry1.js'
import defaultHandlerResources from '../tests/helpers/handlerResources.js'
import { TypedData, IdentType } from '../types.js'

import getIdent from './getIdent.js'

// Setup

const great = Integreat.create(defs, resources)
const getService = () => great.services.users
const options = { identConfig: { type: 'user' } }
const handlerResources = { ...defaultHandlerResources, getService, options }

const johnfIdent = {
  id: 'johnf',
  roles: ['editor'],
  tokens: ['twitter|23456', 'facebook|12345'],
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should complete ident with token', async (t) => {
  const great = Integreat.create(defs, resources)
  const dispatch = sinon.spy(great.services.users, 'send')
  const getService = () => great.services.users
  const scope = nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: johnfData })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }
  const expected = {
    ident: { ...johnfIdent, isCompleted: true },
  }
  const expectedIdent = { id: 'root', root: true, type: IdentType.Root }

  const ret = await getIdent(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access, expected)
  t.is((ret.data as TypedData).id, 'johnf')
  t.is(dispatch.callCount, 1)
  const dispatchedAction = dispatch.args[0][0]
  t.is(dispatchedAction.type, 'GET')
  t.is(dispatchedAction.payload.tokens, 'twitter|23456')
  t.is(dispatchedAction.payload.type, 'user')
  t.deepEqual(dispatchedAction.meta?.ident, expectedIdent)
  t.true(scope.isDone())
})

test('should complete ident with array of tokens', async (t) => {
  const great = Integreat.create(defs, resources)
  const dispatch = sinon.spy(great.services.users, 'send')
  const getService = () => great.services.users
  const scope = nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: johnfData })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: ['twitter|23456'] } },
  }
  const expected = {
    ident: { ...johnfIdent, isCompleted: true },
  }
  const expectedIdent = { id: 'root', root: true, type: IdentType.Root }

  const ret = await getIdent(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access, expected)
  t.is((ret.data as TypedData).id, 'johnf')
  t.is(dispatch.callCount, 1)
  const dispatchedAction = dispatch.args[0][0]
  t.is(dispatchedAction.type, 'GET')
  t.deepEqual(dispatchedAction.payload.tokens, ['twitter|23456'])
  t.is(dispatchedAction.payload.type, 'user')
  t.deepEqual(dispatchedAction.meta?.ident, expectedIdent)
  t.true(scope.isDone())
})

test('should complete ident with id', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const expectedIdent = { ...johnfIdent, isCompleted: true }

  const ret = await getIdent(action, handlerResources)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access?.ident, expectedIdent)
  t.is((ret.data as TypedData).id, 'johnf')
})

test('should complete ident with id when more props are present', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf', withToken: 'other|34567' } },
  }
  const expectedIdent = { ...johnfIdent, isCompleted: true }

  const ret = await getIdent(action, handlerResources)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access?.ident, expectedIdent)
  t.is((ret.data as TypedData).id, 'johnf')
})

test('should return noaction when no props', async (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: {} },
  }
  const expected = {
    status: 'noaction',
    error: 'GET_IDENT: The request has no ident with id or withToken',
    origin: 'handler:GET_IDENT',
  }

  const ret = await getIdent(action, handlerResources)

  t.deepEqual(ret, expected)
})

test('should return noaction when null', async (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: undefined },
  }
  const expected = {
    status: 'noaction',
    error: 'GET_IDENT: The request has no ident',
    origin: 'handler:GET_IDENT',
  }

  const ret = await getIdent(action, handlerResources)

  t.deepEqual(ret, expected)
})

test('should return noaction when no ident options', async (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }
  const options = {}
  const expected = {
    status: 'noaction',
    error: 'GET_IDENT: Integreat is not set up with authentication',
    origin: 'handler:GET_IDENT',
  }

  const ret = await getIdent(action, { ...handlerResources, options })

  t.deepEqual(ret, expected)
})

test('should return notfound when ident not found', async (t) => {
  nock('http://some.api').get('/users/unknown').reply(404)
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'unknown' } },
  }
  const expected = {
    status: 'notfound',
    error:
      "Could not find ident with params { id: 'unknown' }, error: Could not find the url users/unknown",
    origin: 'handler:GET_IDENT',
  }

  const ret = await getIdent(action, handlerResources)

  t.deepEqual(ret, expected)
})

test('should complete ident with other prop keys', async (t) => {
  nock('http://some.api')
    .get('/entries')
    .query({ author: 'johnf' })
    .reply(200, { data: ent1Data })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const identConfig = {
    type: 'entry', // This does not make any sense, but it is just for testing
    props: {
      id: 'author',
      roles: 'sections',
      tokens: undefined,
    },
  }
  const options = { identConfig }
  const getService = () => great.services.entries
  const expectedIdent = {
    id: 'johnf',
    roles: ['news', 'sports'],
    tokens: undefined,
    isCompleted: true,
  }

  const ret = await getIdent(action, {
    ...handlerResources,
    getService,
    options,
  })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access?.ident, expectedIdent)
})

test('should return notfound when unknown service', async (t) => {
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
  const getService = () => undefined
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }
  const expected = {
    status: 'notfound',
    error:
      "Could not find ident with params { tokens: 'twitter|23456' }, error: No service exists for type 'user'",
    origin: 'handler:GET_IDENT',
  }

  const ret = await getIdent(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})
