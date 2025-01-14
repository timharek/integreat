import test from 'ava'
import sinon from 'sinon'
import { isAuthorizedAction } from '../../service/utils/authAction.js'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import type { Transporter } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const queueService = {
  id: 'queue',
  transporter: 'queue',
  auth: true,
  options: { namespace: 'entriesQueue' },
  endpoints: [{ match: {} }],
}

const defsWithQueue = {
  ...defs,
  services: [...defs.services, queueService],
  queueService: 'queue',
}

const baseTransporter: Transporter = {
  authentication: 'asObject',
  prepareOptions: (options) => options,
  connect: async () => null,
  send: async () => ({ status: 'noaction' }),
  disconnect: async () => undefined,
}

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
}

const action = {
  type: 'SET',
  payload: { type: 'entry', data: entry1Item },
  meta: { ident: { id: 'johnf' }, queue: true, id: '11004' },
}

// Tests

test('should send action to queue', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const resourcesWithQueue = {
    ...resources,
    transporters: {
      ...resources.transporters,
      queue: {
        ...baseTransporter,
        send,
      },
    },
  }

  const great = Integreat.create(defsWithQueue, resourcesWithQueue)
  const before = Date.now()
  const ret = await great.dispatch(action)
  const after = Date.now()

  t.is(ret.status, 'queued', ret.error)
  t.is(send.callCount, 1)
  const queuedAction = send.args[0][0]
  t.is(queuedAction.type, 'SET')
  t.deepEqual(queuedAction.payload, action.payload)
  t.deepEqual(queuedAction.meta.ident, { id: 'johnf' })
  t.true(isAuthorizedAction(queuedAction))
  t.is(queuedAction.meta.id, '11004')
  t.is(queuedAction.meta.cid, '11004')
  t.is(typeof queuedAction.meta?.queuedAt, 'number')
  t.true((queuedAction.meta?.queuedAt as number) >= before)
  t.true((queuedAction.meta?.queuedAt as number) <= after)
})

test('should dispatch action as normal when queue service is unknown', async (t) => {
  const dispatchedAction = {
    ...action,
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(dispatchedAction)

  t.is(ret.status, 'noaccess', ret.error) // `noaccess` means we have reached the `entries` service
})
