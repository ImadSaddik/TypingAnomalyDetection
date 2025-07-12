const KEY_MAPPING = {
  // Letters (1-26)
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8,
  i: 9,
  j: 10,
  k: 11,
  l: 12,
  m: 13,
  n: 14,
  o: 15,
  p: 16,
  q: 17,
  r: 18,
  s: 19,
  t: 20,
  u: 21,
  v: 22,
  w: 23,
  x: 24,
  y: 25,
  z: 26,

  // Numbers (27-36)
  0: 27,
  1: 28,
  2: 29,
  3: 30,
  4: 31,
  5: 32,
  6: 33,
  7: 34,
  8: 35,
  9: 36,

  // Common punctuation (37-46)
  ' ': 37,
  '.': 38,
  ',': 39,
  '!': 40,
  '?': 41,
  ':': 42,
  ';': 43,
  "'": 44,
  '"': 45,
  '-': 46,

  // Special keys (47-50)
  backspace: 47,
  enter: 48,
  tab: 49,
  shift: 50,

  // Default for unknown keys
  unknown: 0,
}

function keyToNumber(key) {
  const normalizedKey = key.toLowerCase()
  return KEY_MAPPING[normalizedKey] || KEY_MAPPING['unknown']
}

class DigraphTracker {
  constructor() {
    this.lastKeystroke = null
    this.pendingPresses = {}
    this.streamingCallback = null
  }

  setStreamingCallback(callback) {
    this.streamingCallback = callback
  }

  processEvent(event) {
    if (event.type === 'keydown' && !this.pendingPresses[event.key]) {
      this.pendingPresses[event.key] = event.timeStamp
    } else if (event.type === 'keyup' && this.pendingPresses[event.key]) {
      const currentKeystroke = {
        key: event.key,
        pressTime: this.pendingPresses[event.key],
        releaseTime: event.timeStamp,
      }

      delete this.pendingPresses[event.key]

      let dataPoint = null

      // If we have a previous keystroke, we can form a digraph
      if (this.lastKeystroke) {
        const digraphTime = currentKeystroke.pressTime - this.lastKeystroke.pressTime
        const previousHoldTime = this.lastKeystroke.releaseTime - this.lastKeystroke.pressTime
        const currentHoldTime = currentKeystroke.releaseTime - currentKeystroke.pressTime

        // Validate the digraph timing - skip if invalid
        if (digraphTime > 0 && previousHoldTime > 0 && currentHoldTime > 0) {
          dataPoint = {
            previousKey: keyToNumber(this.lastKeystroke.key),
            currentKey: keyToNumber(currentKeystroke.key),
            digraphTime: digraphTime,
            previousHoldTime: previousHoldTime,
            currentHoldTime: currentHoldTime,
          }

          if (this.streamingCallback) {
            this.streamingCallback(dataPoint)
          }
        }
      }

      this.lastKeystroke = currentKeystroke

      return dataPoint
    }

    return null
  }

  reset() {
    this.lastKeystroke = null
    this.pendingPresses = {}
  }
}

const digraphTracker = new DigraphTracker()

export function setStreamingCallback(callback) {
  digraphTracker.setStreamingCallback(callback)
}

export function processEventStreaming(event) {
  return digraphTracker.processEvent(event)
}

export function resetDigraphTracker() {
  digraphTracker.reset()
}
