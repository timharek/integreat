import authorizeItems from './authorizeItems'

const authorizeUnmapped = (response, access) => {
  if (!access.ident.root) {
    return {
      ...response,
      status: 'noaccess',
      access: {
        ...access,
        status: 'refused',
        scheme: 'unmapped'
      },
      data: []
    }
  }

  return {
    ...response,
    access: { ...access, scheme: 'unmapped' }
  }
}

const getStatus = (access, status) =>
  access && access.status === 'refused' ? 'noaccess' : status

function authorizeResponse({ schemas }) {
  return ({ response, request }) => {
    if (response.status !== 'ok') {
      return response
    }

    const access = response.access || request.access

    if (request.params && request.params.unmapped) {
      return authorizeUnmapped(response, access)
    }

    const authResult = authorizeItems(
      {
        data: response.data,
        access,
        action: request.action,
        auth: request.auth
      },
      schemas
    )

    const status = getStatus(authResult.access, response.status)

    return { ...response, access, ...authResult, status }
  }
}

export default authorizeResponse
