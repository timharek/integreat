import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import mapAny = require('map-any')
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'
import entry2 from '../helpers/data/entry2'

import integreat = require('../..')

test('should transform entry', async t => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: entry1 })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' }
  }
  const mapping = [
    {
      $iterate: true,
      id: 'key',
      attributes: {
        title: ['headline', { $transform: 'upperCase' }],
        text: 'body',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      },
      relationships: {
        author: 'authorId',
        sections: 'sections[]'
      }
    },
    { $transform: 'addSectionsToText' },
    { $apply: 'cast_entry' }
  ]
  const defs = {
    schemas: [entrySchema],
    services: [{ ...entriesService, mappings: { entry: mapping } }]
  }
  const transformers = {
    upperCase: () => value => value.toUpperCase(),
    addSectionsToText: () =>
      mapAny(item => {
        const sections = item.relationships.sections.join('|')
        item.attributes.text = `${item.attributes.text} - ${sections}`
        return item
      })
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  const item = ret.data
  t.is(item.id, 'ent1')
  t.is(item.attributes.title, 'ENTRY 1')
  t.is(item.attributes.text, 'The text of entry 1 - news|sports')

  nock.restore()
})

test('should transform array of entries', async t => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/')
    .reply(200, { data: [entry1, entry2] })
  const action = {
    type: 'GET',
    payload: { type: 'entry' }
  }
  const mapping = [
    {
      $iterate: true,
      id: 'key',
      attributes: {
        title: ['headline', { $transform: 'upperCase' }],
        text: 'body',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      },
      relationships: {
        author: 'authorId',
        sections: 'sections[]'
      }
    },
    { $transform: 'addSectionsToText' },
    { $apply: 'cast_entry' }
  ]
  const defs = {
    schemas: [entrySchema],
    services: [{ ...entriesService, mappings: { entry: mapping } }]
  }
  const transformers = {
    upperCase: () => value => value.toUpperCase(),
    addSectionsToText: () =>
      mapAny(item => {
        const sections =
          item.relationships && item.relationships.sections.join('|')
        return {
          ...item,
          attributes: {
            ...item.attributes,
            text: `${item.attributes && item.attributes.text} - ${sections}`
          }
        }
      })
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[0].attributes.title, 'ENTRY 1')
  t.is(ret.data[0].attributes.text, 'The text of entry 1 - news|sports')
  t.is(ret.data[1].id, 'ent2')
  t.is(ret.data[1].attributes.title, 'ENTRY 2')
  t.is(ret.data[1].attributes.text, 'The text of entry 2 - ')

  nock.restore()
})
