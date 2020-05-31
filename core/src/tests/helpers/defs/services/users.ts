export default {
  id: 'users',
  adapter: 'json',
  // transport: 'http',
  auth: true,
  options: { baseUri: 'http://some.api' },
  mutation: [{ $apply: 'exchange:json' }],
  endpoints: [
    {
      match: { action: 'GET', params: { tokens: true } },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'users-user' }],
      },
      options: { uri: '/users{?tokens}' },
    },
    {
      match: { action: 'GET', scope: 'collection' },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'users-user' }],
      },
      options: { uri: '/users' },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'users-user' }],
      },
      options: { uri: '/users', method: 'POST' },
    },
    {
      match: { action: 'GET', scope: 'member' },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'users-user' }],
      },
      options: { uri: '/users/{id}' },
    },
  ],
}