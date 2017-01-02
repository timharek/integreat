const http = require('http')
const EventEmitter = require('events')
const Storage = require('./storage')
const Scheduler = require('./utils/scheduler')
const rep = require('./utils/repository')
const scheduleSource = require('./sync/scheduleSource')
const processSource = require('./sync/processSource')
const debug = require('debug')('great')

const version = '0.1'

class Integreat {
  constructor (config) {
    this._config = config || {}
    const dbConfig = (config && config.db) ? config.db : undefined
    this.version = version
    this._adapters = new Map()
    this._filters = new Map()
    this._mappers = new Map()
    this._sources = new Map()
    this._storage = new Storage(dbConfig)
    this._scheduler = new Scheduler()
    this._emitter = new EventEmitter()
  }

  /**
   * Add listener to an event from this Integreat instance.
   * @param {string} eventName - Name of event to listen for
   * @param {function} listener - Function to call when event is emitted
   * @returns {Object} This Integreat instance - for chaining
   */
  on (eventName, listener) {
    this._emitter.on(eventName, listener)
    return this
  }

  // Adapters
  getAdapter (id) { return rep.get(this._adapters, id) }
  setAdapter (id, adapter) { rep.set(this._adapters, id, adapter) }
  removeAdapter (id) { rep.remove(this._adapters, id) }

  // Filters
  getFilter (id) { return rep.get(this._filters, id) }
  setFilter (id, filter) { rep.set(this._filters, id, filter) }
  removeFilter (id) { rep.remove(this._filters, id) }

  // Mappers
  getMapper (id) { return rep.get(this._mappers, id) }
  setMapper (id, mapper) { rep.set(this._mappers, id, mapper) }
  removeMapper (id) { rep.remove(this._mappers, id) }

  /**
   * Get source definition.
   * @param {string} id - Identifier for source definition
   * @returns {object} Source definition object
   */
  getSource (id) {
    return rep.get(this._sources, id)
  }

  /**
   * Set source definition.
   * If called with `source` as only argument, `itemtype` is used as id.
   * @param {string} id - Identifier for source definition
   * @param {Object} sourceDef - The source definition
   * @returns {void}
   */
  setSource (id, source) {
    if (!source && typeof id === 'object') {
      // setSource(source)
      rep.set(this._sources, id.itemtype, id)
    } else {
      // setSource(id, source)
      rep.set(this._sources, id, source)
    }
  }

  /**
   * Remove source definition.
   * @param {string} id - Identifier for source definition
   * @returns {void}
   */
  removeSource (id) {
    rep.remove(this._sources, id)
  }

  /**
   * Load default adapters, mappers, and filters.
   * @returns {void}
   */
  loadDefaults () {
    debug('Loading defaults')
    // Adapters
    this.setAdapter('json', require('./adapters/json'))

    // Mappers
    this.setMapper('date', require('./mappers/date'))
    this.setMapper('float', require('./mappers/float'))
    this.setMapper('integer', require('./mappers/integer'))
  }

  /**
   * Return storage used for this integration layer.
   * @returns {Object} Storage object
   */
  getStorage () {
    return this._storage
  }

  // Private function syncing one source. Exposed for testing purposes.
  _syncSource (source) {
    debug('Processing source `%s`', source.sourcetype)
    return processSource(source, this.getAdapter.bind(this), this._storage)
    .then((items) => {
      scheduleSource(this._scheduler, source)
      this._emitter.emit('sync', source, items)
    })
  }

  /**
   * Start integration server and returns a promise.
   * Will start schedule queue and schedule all sources for sync.
   * If a `port` is set in the config, a node.js server will be started at that
   * port, and the returned promise will resolve with that instance when it is
   * started.
   * With no port, no node.js server will be started, and the returned promise
   * is resolved right away.
   * @returns {Promise} Promise of server instance
   */
  start () {
    return new Promise((resolve, reject) => {
      debug('Starting Integreat')

      // Subscribe to schedule queue
      debug('Subscribing to scheduler queue')
      this._scheduleSubscription =
        this._scheduler.subscribe(this._syncSource.bind(this))

      // Schedule all sources for sync.
      // Sources without a schedule will be skipped
      this._sources.forEach((source) => {
        debug('Scheduling source `%s`', source.sourcetype)
        scheduleSource(this._scheduler, source)
      })

      if (this._config.port) {
        // Start a node.js server on the given port
        const server = http.createServer()
        server.listen(this._config.port, () => {
          debug('Integreat is running with http server on port %d', this._config.port)
          this._emitter.emit('start', server)
          resolve(server)
        })
      } else {
        // Don't start a node.js when no port is set
        debug('Integreat is running without http server')
        this._emitter.emit('start', null)
        resolve(null)
      }
    })
  }

  /**
   * Stop integration server.
   * @returns {void}
   */
  stop () {
    debug('Stopping Integreat')
    if (this._scheduleSubscription) {
      this._scheduleSubscription.dispose()
      this._scheduleSubscription = null
      debug('Unsubscribed from scheduler queue')
    }
    this._emitter.emit('stop')
  }
}
Integreat.version = version

module.exports = Integreat