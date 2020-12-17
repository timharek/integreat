import test from 'ava'

import Integreat, { authenticators, mutations, transformers } from '.'

// Tests

test('should have version and create', (t) => {
  t.is(typeof Integreat.version, 'string')
  t.is(typeof Integreat.create, 'function')
})

test('should have queue creator', (t) => {
  t.is(typeof Integreat.createQueue, 'function')
})

test('should export resources', (t) => {
  t.truthy(authenticators)
  t.truthy(authenticators.token)
  t.truthy(mutations)
  t.truthy(mutations['exchange:json'])
  t.truthy(transformers)
  t.truthy(transformers.hash)
})