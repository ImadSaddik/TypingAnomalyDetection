import * as tf from '@tensorflow/tfjs'

const SCALER_STORAGE_KEY = 'keystroke-scaler-parameters'

const featureScaler = {
  mean: null,
  standardDeviation: null,

  fit(dataTensor) {
    const { mean, variance } = tf.moments(dataTensor, 0)
    this.mean = mean

    const epsilon = tf.scalar(1e-7)
    this.standardDeviation = tf.sqrt(variance).add(epsilon)
  },

  transform(dataTensor) {
    if (!this.mean || !this.standardDeviation) {
      throw new Error('Scaler has not been fitted yet. Call fit() before transforming data.')
    }
    return dataTensor.sub(this.mean).div(this.standardDeviation)
  },

  fitTransform(dataTensor) {
    this.fit(dataTensor)
    return this.transform(dataTensor)
  },

  async save() {
    if (!this.mean || !this.standardDeviation) {
      console.error('Cannot save scaler: it has not been fitted.')
      return
    }
    const scalerParams = {
      mean: await this.mean.array(),
      standardDeviation: await this.standardDeviation.array(),
    }
    localStorage.setItem(SCALER_STORAGE_KEY, JSON.stringify(scalerParams))
    console.log('Scaler parameters saved to localStorage.')
  },

  load() {
    try {
      const storedParams = localStorage.getItem(SCALER_STORAGE_KEY)
      if (storedParams) {
        const { mean, standardDeviation } = JSON.parse(storedParams)
        this.mean = tf.tensor(mean)
        this.standardDeviation = tf.tensor(standardDeviation)
        console.log('Scaler parameters loaded from localStorage.')
        return true
      }
    } catch (error) {
      console.error('Error loading scaler parameters:', error)
    }
    return false
  },

  reset() {
    localStorage.removeItem(SCALER_STORAGE_KEY)
    this.mean = null
    this.standardDeviation = null
    console.log('Scaler parameters removed from localStorage.')
  },
}

export default featureScaler
