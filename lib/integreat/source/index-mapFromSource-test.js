import test from 'ava'
import dotProp from 'dot-prop'

import source from '.'

// Helpers

const adapter = {
  normalize: (source, path) => Promise.resolve(dotProp.get(source, path))
}

// Tests -- mapFromSource

test('should exist', (t) => {
  const src = source('entries', {adapter})

  t.is(typeof src.mapFromSource, 'function')
})

test('should normalize data', async (t) => {
  const data = {
    items: [{id: 'item1'}, {id: 'item2'}]
  }
  const attributes = [{key: 'id'}]
  const items = [{type: 'entry', path: 'items', attributes}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})

test('should return empty array when no data', async (t) => {
  const items = [{type: 'entry'}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(null, 'entry')

  t.deepEqual(ret, [])
})

test('should return empty array when no item type', async (t) => {
  const data = {data: [{id: 'item1'}]}
  const src = source('entries', {adapter})

  const ret = await src.mapFromSource(data, null)

  t.deepEqual(ret, [])
})

test('should return empty array when normalize returns null', async (t) => {
  const data = {items: [{id: 'item1'}]}
  const adapter = {
    retrieve: () => Promise.resolve([]),
    normalize: () => Promise.resolve(null)
  }
  const items = [{type: 'entry'}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.deepEqual(ret, [])
})

test('should handle normalize returning object instead of array', async (t) => {
  const data = {items: [{id: 'item1'}]}
  const adapter = {
    retrieve: () => Promise.resolve([]),
    normalize: () => Promise.resolve({id: 'item1'})
  }
  const attributes = [{key: 'id'}]
  const items = [{type: 'entry', attributes}]
  const src = source('entries', {adapter, items})
  const ret = await src.mapFromSource(data, 'entry')

  t.is(ret.length, 1)
  t.is(ret[0].id, 'item1')
})

test('should map attributes', async (t) => {
  const data = {
    items: [{id: 'item1', title: 'First item'}, {id: 'item2', item: 'Second'}]
  }
  const attributes = [
    {key: 'id'},
    {key: 'name', path: 'title'}
  ]
  const items = [{type: 'entry', path: 'items', attributes}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.is(ret[0].id, 'item1')
  t.truthy(ret[0].attributes)
  t.is(ret[0].attributes.name, 'First item')
  t.is(typeof ret[0].attributes.title, 'undefined')
})

test('should filter items with itemDef', async (t) => {
  const data = {
    items: [{id: 'item1', title: 'First item'}, {id: 'item2', item: 'Second'}]
  }
  const filterFrom = [() => true, () => false]
  const items = [{type: 'entry', path: 'items', filterFrom}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry')

  t.deepEqual(ret, [])
})

test('should use given path', async (t) => {
  const data = {
    data: {
      items: [{id: 'item1'}, {id: 'item2'}]
    }
  }
  const attributes = [{key: 'id'}]
  const items = [{type: 'entry', path: 'items', attributes}]
  const src = source('entries', {adapter, items})

  const ret = await src.mapFromSource(data, 'entry', 'data')

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
})