import test from 'ava'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import tokenAuth from '../../authenticators/token.js'
import entriesService from '../helpers/defs/services/entries.js'
import entriesData from '../helpers/data/entries.js'
import { TypedData } from '../../types.js'
import { ServiceDef } from '../../service/types.js'

import Integreat from '../../index.js'

// Setup

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get entries from service requiring authentication', async (t) => {
  nock('http://some.api', {
    reqheaders: {
      authorization: 'Bearer t0k3n',
    },
  })
    .get('/entries')
    .reply(200, { data: entriesData })
  const resourcesWithAuth = {
    ...resources,
    authenticators: { token: tokenAuth },
  }
  const defsWithAuth = {
    ...defs,
    services: [
      {
        ...entriesService,
        auth: 'entriesToken',
      } as ServiceDef,
    ],
    auths: [
      {
        id: 'entriesToken',
        authenticator: 'token',
        options: { token: 't0k3n', type: 'Bearer' },
      },
    ],
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defsWithAuth, resourcesWithAuth)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is((ret.data as TypedData[]).length, 3)
})
