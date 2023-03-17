import { setResponseOnAction, setErrorOnAction } from '../utils/action.js'
import createUnknownServiceError from '../utils/createUnknownServiceError.js'
import type { Action, ActionHandlerResources } from '../types.js'

const authorizeAction = ({ meta, ...action }: Action) => ({
  ...action,
  meta: { ...meta, authorized: true },
})

/**
 * Send action straight to service. The service is free to do whatever with the
 * action. This is a good way to trigger clean up routines etc in services,
 * implemented in the service transporter.
 */
export default async function service(
  action: Action,
  { getService }: ActionHandlerResources
): Promise<Action> {
  const serviceId = action.payload.targetService
  const service = getService(undefined, serviceId)
  if (!service) {
    return createUnknownServiceError(action, undefined, serviceId, 'SERVICE')
  }

  const nextAction = authorizeAction(action) // TODO: Really authorize this?
  const { response } = await service.send(nextAction)

  return response?.status
    ? setResponseOnAction(action, response)
    : setErrorOnAction(
        action,
        `Service '${serviceId}' did not respond correctly to SERVICE action`,
        'badresponse'
      )
}
