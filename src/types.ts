import PProgress = require('p-progress')
import { MapObject } from 'map-transform'
import { EndpointOptions } from './service/endpoints/types'
import { IdentConfig } from './service/types'
import { Service } from './service/types'

export type JsonSchema = Record<string, unknown> | boolean

export interface Reference {
  id: string | null
  $ref: string
  isNew?: boolean
  isDeleted?: boolean
}

export type DataValue = string | number | boolean | Date | null | undefined

export interface DataObject {
  [key: string]: Data
}

export type Data = DataValue | Reference | DataObject | Data[]

export interface TypedData extends DataObject {
  $type: string
  id?: string
  createdAt?: Date | string
  updatedAt?: Date | string
  isNew?: boolean
  isDeleted?: boolean
}

export type ScheduleObject = {
  s?: number[]
  m?: number[]
  h?: number[]
  t?: number[]
  D?: number[]
  M?: number[]
  Y?: number[]
  dw?: number[]
  dc?: number[]
  dy?: number[]
  wm?: number[]
  wy?: number[]
}

interface JobFields {
  id: string
  conditions?: Record<string, JsonSchema | undefined>
  mutation?: MapObject
}

export interface JobWithFlow extends JobFields {
  flow: (Job | Job[])[]
}

export interface JobWithAction extends JobFields {
  action: Action
}

export type Job = JobWithAction | JobWithFlow

export interface JobDef {
  id?: string
  action?: Action
  flow?: (Job | Job[])[]
  schedules?: ScheduleObject[]
  exceptions?: ScheduleObject[]
  cron?: string
  human?: string
  responseMutation?: MapObject
}

export interface DataFunction {
  (): Data
}

export interface TransformFunction<
  T extends DataObject = DataObject,
  U extends Data = Data
> {
  (operands: T): (value: Data) => U
}

export interface Ident {
  id?: string
  root?: boolean
  withToken?: string
  roles?: string[]
  tokens?: string[]
}

export type Params = Record<string, unknown>

export interface Paging {
  next?: Payload
  prev?: Payload
}

export type Headers = Record<string, string | string[] | undefined>

export interface Payload<T = unknown> extends Record<string, unknown> {
  type?: string | string[]
  id?: string | string[]
  data?: T
  sourceService?: string
  targetService?: string
  service?: string // For backward compability, may be removed
  endpoint?: string
  uri?: string
  method?: string
  headers?: Headers
  page?: number
  pageOffset?: number
  pageSize?: number
  pageAfter?: string
  pageBefore?: string
  pageId?: string
  sendNoDefaults?: boolean
}

export interface Meta extends Record<string, unknown> {
  id?: string
  cid?: string
  ident?: Ident
  queue?: boolean | number
  queuedAt?: number
  auth?: Record<string, unknown> | null
  options?: EndpointOptions
  authorized?: boolean
}

export interface Response<T = unknown> {
  status: string | null
  data?: T
  reason?: string
  error?: string
  warning?: string
  paging?: Paging
  params?: Params
  headers?: Headers
  returnNoDefaults?: boolean
  responses?: Response[] // TODO: Is this the right way?
  access?: Record<string, unknown>
  meta?: Meta
}

export interface Action<P extends Payload = Payload, ResponseData = unknown> {
  type: string
  payload: P
  response?: Response<ResponseData>
  meta?: Meta
}

export interface Dispatch<T = unknown> {
  (action: Action | null): PProgress<Response<T>>
}

export interface InternalDispatch {
  (action: Action): PProgress<Action>
}

export interface HandlerDispatch {
  (action: Action): Promise<Action>
}

export interface Middleware {
  (next: HandlerDispatch): HandlerDispatch
}

export interface Connection extends Record<string, unknown> {
  status: string
}

export interface Transporter {
  authentication: string | null
  prepareOptions: (
    options: Record<string, unknown>,
    serviceId: string
  ) => Record<string, unknown>
  connect: (
    options: Record<string, unknown>,
    authentication: Record<string, unknown> | null,
    connection: Connection | null,
    emit: (eventType: string, ...args: unknown[]) => void
  ) => Promise<Connection | null>
  send: (action: Action, connection: Connection | null) => Promise<Response>
  shouldListen?: (options: EndpointOptions) => boolean
  listen?: (
    dispatch: Dispatch,
    connection: Connection | null
  ) => Promise<Response>
  disconnect: (connection: Connection | null) => Promise<void>
}

export interface GetService {
  (type?: string | string[], serviceId?: string): Service | undefined
}

export interface SetProgress {
  (progress: number): void
}

export interface HandlerOptions {
  identConfig?: IdentConfig
  queueService?: string
}

export interface ActionHandlerResources {
  dispatch: HandlerDispatch
  getService: GetService
  setProgress: SetProgress
  options: HandlerOptions
}

export interface ActionHandler {
  (action: Action, resources: ActionHandlerResources): Promise<Action>
}
