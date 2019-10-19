import test from 'ava'
import nock = require('nock')
import Integreat from '..'
import json from 'integreat-adapter-json'
import defs from '../tests/helpers/defs'
import johnfData from '../tests/helpers/data/userJohnf'
import ent1Data from '../tests/helpers/data/entry1'

import getIdent from './getIdent'

// Setup

const great = Integreat.create(defs, { adapters: { json } })
const getService = () => great.services.users
const identConfig = { type: 'user' }

const johnfIdent = {
  id: 'johnf',
  roles: ['editor'],
  tokens: ['twitter|23456', 'facebook|12345']
}
const johnfItem = {
  $type: 'user',
  id: 'johnf',
  firstname: 'John',
  lastname: 'Fjon',
  roles: ['editor'],
  tokens: ['twitter|23456', 'facebook|12345'],
  username: 'johnf',
  yearOfBirth: 1987,
  feeds: [{ id: 'news', $ref: 'feed' }, { id: 'social', $ref: 'feed' }]
}

const dispatch = async () => ({ status: 'ok' })

test.after.always(() => {
  nock.restore()
})

// Tests

test('should complete ident with token', async t => {
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } }
  }
  const expected = {
    status: 'ok',
    data: johnfItem,
    access: { status: 'granted', ident: johnfIdent }
  }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.deepEqual(ret, expected)
})

test('should complete ident with id', async t => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'ok',
    data: johnfItem,
    access: { status: 'granted', ident: johnfIdent }
  }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.deepEqual(ret, expected)
})

test('should complete ident with id when more props are present', async t => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf', withToken: 'other|34567' } }
  }
  const expected = {
    status: 'ok',
    data: johnfItem,
    access: { status: 'granted', ident: johnfIdent }
  }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.deepEqual(ret, expected)
})

test('should return noaction when no props', async t => {
  const action = { type: 'GET_IDENT', payload: {}, meta: { ident: {} } }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.error, 'string')
})

test('should return noaction when null', async t => {
  const action = { type: 'GET_IDENT', payload: {}, meta: { ident: null } }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.error, 'string')
})

test('should return noaction when no ident options', async t => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } }
  }

  const ret = await getIdent(action, dispatch, getService, undefined)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.error, 'string')
})

test('should return notfound when ident not found', async t => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'unknown' } }
  }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.truthy(ret)
  t.is(ret.status, 'notfound')
  t.is(typeof ret.error, 'string')
})

test('should complete ident with other prop keys', async t => {
  nock('http://some.api')
    .get('/entries')
    .query({ author: 'johnf' })
    .reply(200, { data: ent1Data })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' } }
  }
  const identConfig = {
    type: 'entry',
    props: {
      id: 'author',
      roles: 'sections',
      tokens: null
    }
  }
  const getService = () => great.services.entries
  const expectedAccess = {
    status: 'granted',
    ident: { id: 'johnf', roles: ['news', 'sports'], tokens: undefined }
  }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access, expectedAccess)
})

test('should return error when unknown service', async t => {
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
  const getService = () => null
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } }
  }

  const ret = await getIdent(action, dispatch, getService, identConfig)

  t.is(ret.status, 'error')
})
