import * as tf from '@tensorflow/tfjs'
import featureScaler from './featureScaler.js'

const MODEL_STORAGE_KEY = 'indexeddb://keystroke-dynamics-model'
const THRESHOLD_STORAGE_KEY = 'keystroke-anomaly-threshold'

const mlService = {
  model: null,
  anomalyThreshold: null,
  featureNames: [
    'holdTimeMean',
    'holdTimeStandardDeviation',
    'pressPressMean',
    'pressPressStandardDeviation',
    'releaseReleaseMean',
    'releaseReleaseStandardDeviation',
    'releasePressMean',
    'releasePressStandardDeviation',
    'backspaceCount',
  ],

  async trainModel(trainingData) {
    const dataSizeThreshold = 10
    if (!trainingData || trainingData.length < dataSizeThreshold) {
      console.log(`Not enough training data. Minimum required: ${dataSizeThreshold} samples.`)
      return
    }

    // 1. Prepare the data and convert to a tensor
    const featureArray = trainingData.map((entry) =>
      this.featureNames.map((name) => entry.features[name] || 0),
    )
    const dataTensor = tf.tensor2d(featureArray)

    // 2. Use the scaler to normalize the data
    const normalizedData = featureScaler.fitTransform(dataTensor)

    // 3. Define the Autoencoder model architecture
    const numFeatures = this.featureNames.length
    const encodingDimension = 16

    this.model = tf.sequential()

    // Encoder
    this.model.add(
      tf.layers.dense({
        inputShape: [numFeatures],
        units: encodingDimension,
        activation: 'relu',
      }),
    )

    // Decoder
    this.model.add(
      tf.layers.dense({
        units: numFeatures,
        activation: 'sigmoid',
      }),
    )

    // 4. Compile the model
    this.model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
    })

    // 5. Train the model
    await this.model.fit(normalizedData, normalizedData, {
      epochs: 50,
      batchSize: 8,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`)
        },
      },
    })

    console.log('Model training complete.')

    // 6. Calculate anomaly threshold from training data reconstruction errors
    const reconstructions = this.model.predict(normalizedData)
    const reconstructionErrors = tf.mean(
      tf.square(tf.sub(normalizedData, reconstructions)),
      1, // axis=1 means average across features (columns)
    )

    const { mean, variance } = tf.moments(reconstructionErrors)
    const standardDeviation = tf.sqrt(variance)
    // The threshold is the mean error plus 2.5 standard deviations.
    // This is a common statistical approach to define an outlier boundary.
    this.anomalyThreshold = (await mean.add(standardDeviation.mul(2.5)).data())[0]
    console.log(`New anomaly threshold calculated: ${this.anomalyThreshold}`)

    // 7. Save the model, scaler, and the new threshold
    try {
      await this.model.save(MODEL_STORAGE_KEY)
      await featureScaler.save()
      localStorage.setItem(THRESHOLD_STORAGE_KEY, this.anomalyThreshold)
    } catch (error) {
      console.error('Error saving model or scaler:', error)
    }
  },

  async predictAnomalyScore(featureData) {
    if (!this.model || !featureScaler.mean || !featureScaler.standardDeviation) {
      console.log('Model or scaler not ready for prediction.')
      return null
    }

    const errorTensor = tf.tidy(() => {
      // 1. Convert the single feature object to a 2D tensor
      const featureArray = this.featureNames.map((name) => featureData[name] || 0)
      const inputTensor = tf.tensor2d([featureArray])

      // 2. Normalize the input using the pre-fitted scaler
      const normalizedInput = featureScaler.transform(inputTensor)

      // 3. Get the model's reconstruction
      const reconstruction = this.model.predict(normalizedInput)

      // 4. Calculate the Mean Squared Error between the input and the reconstruction
      return tf.losses.meanSquaredError(normalizedInput, reconstruction)
    })

    const score = await errorTensor.data()
    errorTensor.dispose()
    return score
  },

  async loadModel() {
    try {
      const loadedModel = await tf.loadLayersModel(MODEL_STORAGE_KEY)
      const scalerLoaded = featureScaler.load()
      const storedThreshold = localStorage.getItem(THRESHOLD_STORAGE_KEY)

      if (loadedModel && scalerLoaded && storedThreshold) {
        this.model = loadedModel
        this.anomalyThreshold = parseFloat(storedThreshold)
        console.log('Model loaded successfully:', this.model)
        console.log('Scaler loaded successfully:', featureScaler)
        console.log('Anomaly threshold loaded successfully:', this.anomalyThreshold)
        return true
      }
    } catch (error) {
      console.log('Error loading model:', error)
    }
    return false
  },

  async resetModel() {
    try {
      await tf.io.removeModel(MODEL_STORAGE_KEY)
      localStorage.removeItem(THRESHOLD_STORAGE_KEY)
      this.model = null
      this.anomalyThreshold = null
    } catch (error) {
      console.error('Error removing model:', error)
    }
  },
}

export default mlService
