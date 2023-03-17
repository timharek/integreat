import { setResponseOnAction } from '../utils/action.js'
import type { Action, ActionHandlerResources } from '../types.js'

const authorizeAction = ({ meta, ...action }: Action) => ({
  ...action,
  meta: { ...meta, authorized: true },
})

/**
 * Send action to queue service. An `ok` status from queue service is returned
 * as `queued`. All other responses are just relayed.
 *
 * If the given `queueService` does not exist, the action is instead dispatched
 * without the `queue` flag.
 */
export default async function queue(
  action: Action,
  { dispatch, getService, options: { queueService } }: ActionHandlerResources
): Promise<Action> {
  const service = getService(undefined, queueService)
  if (!service) {
    return dispatch(action)
  }

  const nextAction = authorizeAction(action)
  const { response } = await service.send(nextAction) // TODO: Map data back and forth?
  const status = response?.status === 'ok' ? 'queued' : response?.status

  return setResponseOnAction(action, {
    ...action.response,
    ...response,
    status: status || 'badresponse',
    ...(status ? {} : { error: 'Queue did not respond correctly' }),
  })
}
