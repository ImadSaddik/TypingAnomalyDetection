<template>
  <section class="container">
    <h1 class="title">Keystroke dynamics demo</h1>
    <p class="description secondary">
      This demo shows how we can train a model based on keystroke dynamics. Start typing and the
      model will learn your typing behavior. If you keep using the demo, the model will continuously
      learn and adapt to your typing style.
    </p>

    <p v-if="lastAnomalyScore !== null" class="description">
      Anomaly Score: {{ lastAnomalyScore.toFixed(4) }}
    </p>

    <textarea
      class="custom-textarea"
      id="text-input-area"
      rows="8"
      placeholder="Type anything you want here..."
    ></textarea>

    <p v-if="collectedFeatures.length > 0" class="description secondary">
      Collected {{ collectedFeatures.length }} data points in total
    </p>

    <div class="action-buttons">
      <button class="custom-btn custom-btn-white" @click="clearLocalStorage">Clear data</button>
    </div>
  </section>
</template>

<script>
import behaviorTracker from './services/behaviorTracker.js'
import { extractFeaturesFromRawEvents } from './services/featureExtractor.js'
import featureScaler from './services/featureScaler.js'
import mlService from './services/mlService.js'

export default {
  name: 'App',
  data() {
    return {
      recordingDurationInSeconds: 10,
      collectedFeatures: [],
      recordingInterval: null,
      isTraining: false,
      trainingTriggerInterval: 50,
      lastAnomalyScore: null,
    }
  },
  computed: {
    canUseModelForInference() {
      return this.collectedFeatures.length > 100
    },
  },
  watch: {
    collectedFeatures(newFeatures) {
      const shouldTrain =
        newFeatures.length > 0 && newFeatures.length % this.trainingTriggerInterval === 0
      if (shouldTrain && !this.isTraining) {
        this.trainUserModel()
      }
    },
  },
  async mounted() {
    await mlService.loadModel()
    this.loadStoredFeatures()
    this.startRecordingData()
  },
  beforeUnmount() {
    this.stopRecording()
  },
  methods: {
    loadStoredFeatures() {
      try {
        const storedData = localStorage.getItem('behaviorFeatures')
        if (storedData) {
          this.collectedFeatures = JSON.parse(storedData)
        }
      } catch (error) {
        console.error('Error loading stored features:', error)
        this.collectedFeatures = []
      }
    },
    startRecordingData() {
      behaviorTracker.startTracking()

      this.recordingInterval = setInterval(async () => {
        const events = behaviorTracker.getEventsAndReset()
        const features = extractFeaturesFromRawEvents(events)

        if (features && !this.isEmptyObject(features)) {
          const featureEntry = {
            timestamp: new Date().toISOString(),
            features: features,
          }

          this.collectedFeatures.push(featureEntry)
          this.saveFeaturesToStorage()

          // Inference if model is loaded
          if (mlService.model) {
            const score = await mlService.predictAnomalyScore(features)
            if (score) {
              // .data() returns an array-like object, so we take the first element
              this.lastAnomalyScore = score[0]
            }
          }
        }
      }, this.recordingDurationInSeconds * 1000)
    },
    isEmptyObject(object) {
      return Object.keys(object).length === 0
    },
    saveFeaturesToStorage() {
      try {
        localStorage.setItem('behaviorFeatures', JSON.stringify(this.collectedFeatures))
      } catch (error) {
        console.error('Error saving features to localStorage:', error)
      }
    },
    stopRecording() {
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval)
        this.recordingInterval = null
      }
      behaviorTracker.stopTracking()
    },
    async clearLocalStorage() {
      try {
        localStorage.removeItem('behaviorFeatures')
        this.collectedFeatures = []
        await mlService.resetModel()
        featureScaler.reset()
        console.log('All data, model, and scaler parameters have been cleared.')
      } catch (error) {
        console.error('Error clearing local storage:', error)
      }
    },
    async trainUserModel() {
      this.isTraining = true
      console.log(`Training model with ${this.collectedFeatures.length} data points.`)
      try {
        await mlService.trainModel(this.collectedFeatures)
        console.log('Model training cycle completed successfully.')
      } catch (error) {
        console.error('An error occurred during model training:', error)
      } finally {
        this.isTraining = false
      }
    },
  },
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 30%;
}

.title {
  font-size: 2.25rem;
  font-weight: bold;
  color: #111827;
}

.description {
  font-size: 1.125rem;
  text-align: center;
  transition: color 0.5s ease;
}

.secondary {
  color: #6b7280;
}

.custom-textarea {
  margin-top: 5rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 1rem;
  font-size: 1rem;
  width: 100%;
  max-width: 100%;
  min-height: 200px;
  box-sizing: border-box;
}

.custom-btn {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem !important;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-width: 20%;
}

.custom-btn-white {
  background-color: white;
  color: black;
}

.custom-btn-white:hover {
  background-color: #f0f0f0;
  border-color: #aaa !important;
}

.custom-btn-black {
  background-color: black;
  color: white;
}

.custom-btn-black:hover {
  background-color: #333;
  color: #f0f0f0;
  border-color: #f0f0f0;
}

.disabled {
  background-color: #f0f0f0;
  color: #aaa;
  cursor: not-allowed;
  pointer-events: none;
  user-select: none;
}

.action-buttons {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  width: 100%;
}
</style>
