const behaviorTracker = {
  isTracking: false,
  events: [],

  startTracking() {
    if (this.isTracking) return
    console.log('Behavior tracking started.')
    this.isTracking = true
    this.events = []

    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('mousemove', this.handleMouseMove.bind(this))
  },

  stopTracking() {
    if (!this.isTracking) return
    console.log('Behavior tracking stopped.')
    this.isTracking = false

    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    return this.events
  },

  handleKeyDown(event) {
    if (this.isTracking) {
      this.events.push({ type: 'keydown', key: event.key, timeStamp: performance.now() })
    }
  },

  handleMouseMove() {
    if (this.isTracking) {
      this.events.push({ type: 'mousemove', timeStamp: performance.now() })
    }
  },
}

export default behaviorTracker
