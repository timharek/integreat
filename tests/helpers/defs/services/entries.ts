export default {
  id: 'entries',
  adapter: 'json',
  options: { baseUri: 'http://some.api/entries' },
  mappings: {
    entry: 'entries-entry',
    user: 'users-user'
  },
  endpoints: [
    {
      match: { action: 'GET', scope: 'collection', params: { offset: true } },
      responseMapping: [
        'data',
        {
          data: 'data[]',
          'paging.next.type': [{ $transform: 'fixed', value: 'entry' }],
          'paging.next.offset': 'offset'
        }
      ],
      options: { uri: '/{?offset=offset?}' }
    },
    {
      match: { action: 'GET', scope: 'collection' },
      responseMapping: [
        'data',
        {
          data: 'data[]',
          'paging.next.type': [{ $transform: 'fixed', value: 'entry' }],
          'paging.next.offset': 'offset'
        }
      ],
      options: { uri: '/' }
    },
    {
      match: { action: 'SET', scope: 'collection' },
      requestMapping: 'data[]',
      responseMapping: 'data[]',
      options: { uri: '/', method: 'POST' }
    },
    {
      match: { scope: 'member' },
      responseMapping: 'data',
      options: { uri: '/{id}' }
    },
    {
      match: { action: 'GET', params: { author: true } },
      responseMapping: 'data',
      options: { uri: '{?author}' }
    },
    {
      match: {
        action: 'REQUEST',
        filters: {
          data: { type: 'object', required: ['key'] },
          'params.requestMethod': { const: 'GET' }
        }
      },
      responseMapping: [
        {
          'params.id': 'data.key'
        }
      ],
      incoming: true,
      options: { actionType: 'GET', actionPayload: { type: 'entry' } }
    },
    {
      match: {
        action: 'REQUEST',
        filters: {
          'params.type': { const: 'entry' },
          'params.requestMethod': { const: 'POST' }
        }
      },
      incoming: true,
      options: { actionType: 'SET', actionPayload: { type: 'entry' } }
    }
  ]
}