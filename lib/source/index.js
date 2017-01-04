class Source {
  constructor (itemtype) {
    this.itemtype = itemtype
    this.adapter = null

    this.fetch = {
      endpoint: null,
      changelog: null,
      path: null,
      map: [],
      filter: []
    }

    this.send = {
      endpoint: null,
      map: []
    }

    this.attributes = []
    this.relationships = []
    this.item = {
      map: [],
      filter: []
    }

    this.schedule = null
    this.allowRelay = false
    this.allowPush = false
    this.nextSync = null
  }

  setNextSync (nextSync) {
    if (nextSync) {
      // Set given nextSync
      this.nextSync = nextSync
    } else if (!this.schedule) {
      // Set to null when no schedule
      this.nextSync = null
    } else {
      // Set nextSync from schedule, or now if nextSync is in the past
      const fromSchedule = (this.nextSync) ? this.nextSync + (this.schedule * 1000) : 0
      this.nextSync = Math.max(fromSchedule, Date.now())
    }

    // Return next sync time
    return this.nextSync
  }
}

module.exports = Source