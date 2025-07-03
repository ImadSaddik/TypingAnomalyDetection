export function extractFeaturesFromRawEvents(events, durationSeconds) {
  if (!events || events.length < 2) return null

  const keyEvents = events.filter((e) => e.type === 'keydown')
  if (keyEvents.length < 2) return null

  const interKeyDelays = []
  for (let i = 1; i < keyEvents.length; i++) {
    interKeyDelays.push(keyEvents[i].timeStamp - keyEvents[i - 1].timeStamp)
  }

  const sumOfDelays = interKeyDelays.reduce((accumulator, delay) => accumulator + delay, 0)
  const averageInterKeyDelay = sumOfDelays / (interKeyDelays.length || 1)
  const typingSpeed = keyEvents.length / durationSeconds
  const backspaceCount = keyEvents.filter((k) => k.key === 'Backspace').length

  let idleTime = 0
  const idleThreshold = 1500
  for (let i = 1; i < events.length; i++) {
    if (events[i].timeStamp - events[i - 1].timeStamp > idleThreshold) {
      idleTime += events[i].timeStamp - events[i - 1].timeStamp
    }
  }

  const durationInMilliseconds = durationSeconds * 1000
  const mouseIdlePercentage = (idleTime / durationInMilliseconds) * 100

  return {
    averageInterKeyDelay, // Milliseconds
    typingSpeed, // Keys per second
    backspaceCount,
    mouseIdlePercentage,
  }
}
