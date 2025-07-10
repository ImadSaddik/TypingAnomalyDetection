const behaviorTracker = {
  isTracking: false,
  events: [],
  boundHandleKeyDown: null,
  boundHandleKeyUp: null,

  startTracking() {
    if (this.isTracking) return
    this.isTracking = true
    this.events = []

    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleKeyUp = this.handleKeyUp.bind(this)

    document.addEventListener('keydown', this.boundHandleKeyDown)
    document.addEventListener('keyup', this.boundHandleKeyUp)
  },

  stopTracking() {
    if (!this.isTracking) return
    this.isTracking = false

    if (this.boundHandleKeyDown) {
      document.removeEventListener('keydown', this.boundHandleKeyDown)
      this.boundHandleKeyDown = null
    }
    if (this.boundHandleKeyUp) {
      document.removeEventListener('keyup', this.boundHandleKeyUp)
      this.boundHandleKeyUp = null
    }
    return this.events
  },

  handleKeyDown(event) {
    if (this.isTracking) {
      this.events.push({ type: 'keydown', key: event.key, timeStamp: performance.now() })
    }
  },

  handleKeyUp(event) {
    if (this.isTracking) {
      this.events.push({ type: 'keyup', key: event.key, timeStamp: performance.now() })
    }
  },

  getEventsAndReset() {
    const currentEvents = [...this.events]
    this.events = []
    return currentEvents
  },
}

export default behaviorTracker
