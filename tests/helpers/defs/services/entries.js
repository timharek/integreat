module.exports = {
  id: 'entries',
  adapter: 'json',
  options: { baseUri: 'http://some.api/entries' },
  endpoints: [
    { match: { action: 'GET', scope: 'collection' }, responseMapping: 'data[]', options: { uri: '/' } },
    {
      match: { action: 'SET', scope: 'collection' },
      requestMapping: 'data[]',
      responseMapping: 'data[]',
      options: { uri: '/', method: 'POST' }
    },
    { match: { scope: 'member' }, options: { uri: '/{id}', path: 'data' } },
    { match: { action: 'GET', params: { author: true } }, responseMapping: 'data', options: { uri: '{?author}' } }
  ],
  mappings: {
    entry: 'entries-entry'
  }
}
