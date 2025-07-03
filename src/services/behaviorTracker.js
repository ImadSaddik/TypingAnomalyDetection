const behaviorTracker = {
  isTracking: false,
  events: [],

  startTracking() {
    if (this.isTracking) return
    this.isTracking = true
    this.events = []

    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('keyup', this.handleKeyUp.bind(this))
  },

  stopTracking() {
    if (!this.isTracking) return
    this.isTracking = false

    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('keyup', this.handleKeyUp.bind(this))
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
