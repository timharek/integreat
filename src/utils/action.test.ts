import test from 'ava'

import {
  createAction,
  setResponseOnAction,
  setErrorOnAction,
  setDataOnActionPayload,
  setOriginOnAction,
} from './action.js'

// Tests -- createAction

test('should return an action', (t) => {
  const type = 'GET'
  const payload = { id: 'ent1', type: 'entry' }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: {},
  }

  const ret = createAction(type, payload)

  t.deepEqual(ret, expected)
})

test('should always set payload object', (t) => {
  const type = 'GET'
  const expected = {
    type: 'GET',
    payload: {},
    meta: {},
  }

  const ret = createAction(type)

  t.deepEqual(ret, expected)
})

test('should set meta', (t) => {
  const type = 'GET'
  const payload = { id: 'ent1', type: 'entry' }
  const meta = { schedule: {}, queue: true }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { schedule: {}, queue: true },
  }

  const ret = createAction(type, payload, meta)

  t.deepEqual(ret, expected)
})

test('should return null if no type', (t) => {
  const payload = { id: 'ent1', type: 'entry' }

  const ret = createAction(null as unknown as string, payload)

  t.is(ret, null)
})

// Tests -- setDataOnActionPayload

test('should set data on action payload', (t) => {
  const action = {
    type: 'SET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const data = [{ id: 'ent1', $type: 'entry' }]
  const expected = {
    type: 'SET',
    payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setDataOnActionPayload(action, data)

  t.deepEqual(ret, expected)
})

test('should replace existing data on action payload', (t) => {
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const data = undefined
  const expected = {
    type: 'SET',
    payload: { type: 'entry', data: undefined },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setDataOnActionPayload(action, data)

  t.deepEqual(ret, expected)
})

// Tests -- setResponseOnAction

test('should set response on action', (t) => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const response = { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setResponseOnAction(action, response)

  t.deepEqual(ret, expected)
})

test('should set response on action when no response is given', (t) => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const response = undefined
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {},
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setResponseOnAction(action, response)

  t.deepEqual(ret, expected)
})

// Tests -- setErrorOnAction

test('should set error response on action object', (t) => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const message = 'Too long'
  const status = 'timeout'
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'timeout',
      error: 'Too long',
      origin: 'somewhere',
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setErrorOnAction(action, message, 'somewhere', status)

  t.deepEqual(ret, expected)
})

test('should set error response on action object that already has a response', (t) => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'ok',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const message = 'An ugly error'
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'error',
      error: 'An ugly error',
      origin: 'somewhere',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setErrorOnAction(action, message, 'somewhere')

  t.deepEqual(ret, expected)
})

// Tests -- setOriginOnAction

test('should set origin on response', (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'error', error: 'We failed' },
    meta: { ident: { id: 'johnf' } },
  }
  const origin = 'somewhere:bad'
  const expected = {
    ...action,
    response: {
      status: 'error',
      error: 'We failed',
      origin: 'somewhere:bad',
    },
  }

  const ret = setOriginOnAction(action, origin)

  t.deepEqual(ret, expected)
})

test('should prefix origin when one already exists', (t) => {
  const doPrefix = true
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: {
      status: 'error',
      error: 'We failed',
      origin: 'somewhere:else',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const origin = 'and:here'
  const expected = {
    ...action,
    response: {
      status: 'error',
      error: 'We failed',
      origin: 'and:here:somewhere:else',
    },
  }

  const ret = setOriginOnAction(action, origin, doPrefix)

  t.deepEqual(ret, expected)
})
