import * as tf from '@tensorflow/tfjs'

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
}

export default featureScaler
