function calculateMeanAndStandardDeviation(values) {
  if (values.length === 0) {
    return { mean: 0, standardDeviation: 0 }
  }
  const mean = values.reduce((accumulator, value) => accumulator + value, 0) / values.length
  const standardDeviation = Math.sqrt(
    values
      .map((x) => Math.pow(x - mean, 2))
      .reduce((sumOfSquares, squaredDiff) => sumOfSquares + squaredDiff, 0) /
      (values.length > 1 ? values.length - 1 : 1),
  )
  return { mean, standardDeviation }
}

export function extractFeaturesFromRawEvents(events) {
  // We need at least two full keystrokes (press and release) to calculate digraph features.
  if (!events || events.length < 4) {
    return null
  }

  const pendingPresses = {}
  const completedKeystrokes = []

  // First, pair keydown and keyup events to form complete keystrokes.
  events.forEach((event) => {
    if (event.type === 'keydown' && !pendingPresses[event.key]) {
      // Store the press time when a key is first pressed.
      pendingPresses[event.key] = event.timeStamp
    } else if (event.type === 'keyup' && pendingPresses[event.key]) {
      // When the key is released, create a keystroke object.
      completedKeystrokes.push({
        key: event.key,
        pressTime: pendingPresses[event.key],
        releaseTime: event.timeStamp,
      })
      // Clear the pending press to allow for the same key to be pressed again.
      delete pendingPresses[event.key]
    }
  })

  // Sort the completed keystrokes by their press time to ensure chronological order.
  completedKeystrokes.sort((keystrokeA, keystrokeB) => keystrokeA.pressTime - keystrokeB.pressTime)

  if (completedKeystrokes.length < 2) {
    return null
  }

  const holdTimes = []
  const pressToPressTimes = []
  const releaseToReleaseTimes = []
  const releaseToPressTimes = []

  for (let i = 0; i < completedKeystrokes.length; i++) {
    const currentKeystroke = completedKeystrokes[i]

    // Hold Time: The duration a single key is held down.
    holdTimes.push(currentKeystroke.releaseTime - currentKeystroke.pressTime)

    if (i > 0) {
      const previousKeystroke = completedKeystrokes[i - 1]

      // Press-Press Time: Time between pressing one key and pressing the next.
      pressToPressTimes.push(currentKeystroke.pressTime - previousKeystroke.pressTime)

      // Release-Release Time: Time between releasing one key and releasing the next.
      releaseToReleaseTimes.push(currentKeystroke.releaseTime - previousKeystroke.releaseTime)

      // Release-Press Time: Time between releasing one key and pressing the next.
      releaseToPressTimes.push(currentKeystroke.pressTime - previousKeystroke.releaseTime)
    }
  }

  // Calculate the mean and standard deviation for each list of timing features.
  const { mean: holdTimeMean, standardDeviation: holdTimeStandardDeviation } =
    calculateMeanAndStandardDeviation(holdTimes)
  const { mean: pressPressMean, standardDeviation: pressPressStandardDeviation } =
    calculateMeanAndStandardDeviation(pressToPressTimes)
  const { mean: releaseReleaseMean, standardDeviation: releaseReleaseStandardDeviation } =
    calculateMeanAndStandardDeviation(releaseToReleaseTimes)
  const { mean: releasePressMean, standardDeviation: releasePressStandardDeviation } =
    calculateMeanAndStandardDeviation(releaseToPressTimes)

  const backspaceCount = completedKeystrokes.filter((k) => k.key === 'Backspace').length

  return {
    holdTimeMean,
    holdTimeStandardDeviation,
    pressPressMean,
    pressPressStandardDeviation,
    releaseReleaseMean,
    releaseReleaseStandardDeviation,
    releasePressMean,
    releasePressStandardDeviation,
    backspaceCount,
  }
}
