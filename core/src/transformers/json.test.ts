import test from 'ava'

import json from './json'

// Setup

const operands = {}
const options = {}
const context = {
  rev: false,
  onlyMappedValues: false,
}
const contextRev = {
  rev: true,
  onlyMappedValues: false,
}

// Tests -- from service

test('should parse json from service', (t) => {
  const data = '[{"key":"ent1"},{"key":"ent2"}]'
  const expected = [{ key: 'ent1' }, { key: 'ent2' }]

  const ret = json(operands, options)(data, context)

  t.deepEqual(ret, expected)
})

test('should return undefined from service when invalid json', (t) => {
  const data = 'Not json'

  const ret = json(operands, options)(data, context)

  t.is(ret, undefined)
})

test('should return undefined from service when not a string', (t) => {
  const data = [{ key: 'ent1' }, { key: 'ent2' }]

  const ret = json(operands, options)(data, context)

  t.is(ret, undefined)
})

test('should parse iso date strings from service as strings', (t) => {
  const data = '{"date":"2020-03-18T18:43:11.000Z"}'
  const expected = { date: '2020-03-18T18:43:11.000Z' }

  const ret = json(operands, options)(data, context)

  t.deepEqual(ret, expected)
})

// Tests -- to service

test('should stringify json to service', (t) => {
  const data = [{ key: 'ent1' }, { key: 'ent2' }]
  const expected = '[{"key":"ent1"},{"key":"ent2"}]'

  const ret = json(operands, options)(data, contextRev)

  t.is(ret, expected)
})

test('should not stringify undefined to service', (t) => {
  const data = undefined

  const ret = json(operands, options)(data, contextRev)

  t.is(ret, undefined)
})

test('should stringify null to service', (t) => {
  const data = null

  const ret = json(operands, options)(data, contextRev)

  t.is(ret, 'null')
})

test('should stringify date as iso string', (t) => {
  const data = { date: new Date('2020-03-18T18:43:11Z') }
  const expected = '{"date":"2020-03-18T18:43:11.000Z"}'

  const ret = json(operands, options)(data, contextRev)

  t.is(ret, expected)
})
