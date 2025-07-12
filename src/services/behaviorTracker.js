import { processEventStreaming } from './dataPointExtractor.js'

const behaviorTracker = {
  isTracking: false,
  boundHandleKeyDown: null,
  boundHandleKeyUp: null,
  dataPointCallback: null,

  startTracking(dataPointCallback = null) {
    if (this.isTracking) return
    this.isTracking = true
    this.dataPointCallback = dataPointCallback

    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleKeyUp = this.handleKeyUp.bind(this)

    document.addEventListener('keydown', this.boundHandleKeyDown)
    document.addEventListener('keyup', this.boundHandleKeyUp)
  },

  stopTracking() {
    if (!this.isTracking) return
    this.isTracking = false
    this.dataPointCallback = null

    if (this.boundHandleKeyDown) {
      document.removeEventListener('keydown', this.boundHandleKeyDown)
      this.boundHandleKeyDown = null
    }
    if (this.boundHandleKeyUp) {
      document.removeEventListener('keyup', this.boundHandleKeyUp)
      this.boundHandleKeyUp = null
    }
  },

  handleKeyDown(event) {
    this.handleKeyEvent(event, 'keydown')
  },

  handleKeyUp(event) {
    this.handleKeyEvent(event, 'keyup')
  },

  handleKeyEvent(event, type) {
    if (this.isTracking && this.dataPointCallback) {
      const dataPoint = processEventStreaming({
        type,
        key: event.key,
        timeStamp: performance.now(),
      })
      if (dataPoint) {
        this.dataPointCallback(dataPoint)
      }
    }
  },
}

export default behaviorTracker
