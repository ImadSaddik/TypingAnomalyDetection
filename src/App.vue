<template>
  <section class="container">
    <h1 class="title">Keystroke dynamics demo</h1>
    <p class="description secondary">
      This demo shows how we can train a model based on keystroke dynamics. Start typing and the
      model will learn your typing behavior. If you keep using the demo, the model will continuously
      learn and adapt to your typing style.
    </p>

    <div class="row">
      <div class="column text-to-type-container">
        <h2 class="subtitle">Type this:</h2>
        <p class="prompt-text">{{ currentTextToType }}</p>
      </div>
      <div class="column">
        <textarea
          class="custom-textarea"
          id="text-input-area"
          rows="8"
          placeholder="Type anything you want here..."
        ></textarea>
      </div>
    </div>

    <div class="action-buttons">
      <button class="custom-btn custom-btn-white" @click="clearLocalStorage">Clear data</button>
      <button
        :class="[
          'custom-btn',
          isInInferenceMode ? 'custom-btn-white' : 'custom-btn-black',
          { disabled: !isModelReady },
        ]"
        @click="isInInferenceMode = !isInInferenceMode"
      >
        {{ isInInferenceMode ? 'Stop inference' : 'Start Inference' }}
      </button>
    </div>

    <p v-if="collectedFeatures.length > 0" class="description secondary" style="margin-top: 2rem">
      Collected {{ collectedFeatures.length }} data points in total
    </p>

    <div class="inference-results" v-if="isInInferenceMode">
      <h2 class="title">Inference results</h2>
      <p class="description" style="margin-bottom: 3rem">
        Use this slider to set the anomaly detection threshold
      </p>

      <label class="description secondary" for="anomaly-threshold-slider">
        Anomaly threshold
        <span v-if="anomalyThreshold !== null">({{ anomalyThreshold }})</span>
      </label>
      <input
        id="anomaly-threshold-slider"
        class="custom-range-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        v-model="anomalyThreshold"
      />

      <div class="probability-card">
        <h2 class="subtitle">Anomaly detection results:</h2>
        <p
          class="subtitle"
          :class="{ 'anomaly-detected': isAnomaly }"
          style="margin-top: 1.5rem; margin-bottom: 0"
        >
          <span class="description" v-if="lastAnomalyScore !== null">
            <strong v-if="isAnomaly">⚠️ Anomaly detected!</strong>
            <strong v-else>✅ Normal behavior</strong>
            <br />
            <span class="score-details">
              Score: {{ lastAnomalyScore.toFixed(3) }} | Threshold:
              {{ parseFloat(anomalyThreshold).toFixed(3) }}
            </span>
          </span>
          <span class="description secondary" v-else>
            Start typing to compute the anomaly score
          </span>
        </p>
      </div>
    </div>
  </section>
</template>

<script>
import behaviorTracker from './services/behaviorTracker.js'
import { extractFeaturesFromRawEvents, resetDigraphTracker } from './services/featureExtractor.js'
import featureScaler from './services/featureScaler.js'
import mlService from './services/mlService.js'
import textToTypeList from './assets/textToTypeList.json'

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
      anomalyThreshold: null,
      isInInferenceMode: false,
      isModelReady: false,
      currentTextToType: '',
    }
  },
  computed: {
    isAnomaly() {
      if (this.lastAnomalyScore === null || this.anomalyThreshold === null) {
        return false
      }
      return this.lastAnomalyScore > this.anomalyThreshold
    },
  },
  watch: {
    collectedFeatures: {
      handler(newFeatures) {
        const shouldTrain =
          newFeatures.length > 0 && newFeatures.length % this.trainingTriggerInterval === 0
        if (shouldTrain && !this.isTraining) {
          this.trainUserModel()
        }
      },
      deep: true,
    },
    anomalyThreshold(newThreshold) {
      if (newThreshold !== null && mlService.model) {
        mlService.anomalyThreshold = parseFloat(newThreshold)
        localStorage.setItem('keystroke-anomaly-threshold', newThreshold)
      }
    },
  },
  async mounted() {
    const modelLoaded = await mlService.loadModel()
    if (modelLoaded) {
      this.anomalyThreshold = mlService.anomalyThreshold
      this.isModelReady = true
    }
    this.loadStoredFeatures()
    this.startRecordingData()
    this.pickRandomText()
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
      if (this.recordingInterval) {
        this.stopRecording()
      }

      behaviorTracker.startTracking()

      this.recordingInterval = setInterval(async () => {
        const events = behaviorTracker.getEventsAndReset()
        const digraphFeatures = extractFeaturesFromRawEvents(events)

        if (!digraphFeatures || digraphFeatures.length === 0) {
          return
        }

        if (this.isInInferenceMode) {
          for (const feature of digraphFeatures) {
            if (mlService.model) {
              const score = await mlService.predictAnomalyScore(feature)
              if (score !== undefined && score !== null) {
                this.lastAnomalyScore = score[0]
              }
            }
          }
        } else {
          digraphFeatures.forEach((feature) => {
            const featureEntry = {
              timestamp: new Date().toISOString(),
              features: feature,
            }
            this.collectedFeatures.push(featureEntry)
          })

          if (digraphFeatures.length > 0) {
            this.saveFeaturesToStorage()
          }
        }
      }, this.recordingDurationInSeconds * 1000)
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
        resetDigraphTracker()
        this.lastAnomalyScore = null
        this.anomalyThreshold = null
        this.isModelReady = false
      } catch (error) {
        console.error('Error clearing local storage:', error)
      }
    },
    async trainUserModel() {
      this.isTraining = true
      console.log(`Training model with ${this.collectedFeatures.length} data points.`)
      try {
        await mlService.trainModel(this.collectedFeatures)
        this.anomalyThreshold = mlService.anomalyThreshold
        this.isModelReady = true
        console.log('Model training cycle completed successfully.')
      } catch (error) {
        console.error('An error occurred during model training:', error)
      } finally {
        this.isTraining = false
      }
    },
    pickRandomText() {
      const index = Math.floor(Math.random() * textToTypeList.length)
      this.currentTextToType = textToTypeList[index]
    },
  },
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 50%;
  text-align: center;
}

.title {
  font-size: 2.25rem;
  font-weight: bold;
  color: #111827;
}

.subtitle {
  font-size: 1.5rem;
  color: #111827;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.description {
  font-size: 1.125rem;
  text-align: center;
  transition: color 0.5s ease;
}

.anomaly-detected {
  color: #ef4444;
  font-weight: bold;
}

.secondary {
  color: #6b7280;
}

.custom-textarea {
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 1rem;
  font-size: 1rem;
  box-sizing: border-box;
  resize: none;
  margin-top: 0;
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
  width: 50%;
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

.row {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: center;
  align-items: flex-start;
  margin-top: 2rem;
  gap: 2rem;
  align-items: stretch;
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.text-to-type-container {
  align-items: flex-start;
  text-align: justify;
}

.custom-range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
  margin-top: 1rem;
}

.custom-range-slider:hover {
  opacity: 1;
}

.custom-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 32px;
  height: 32px;
  background: #111827;
  cursor: pointer;
  border-radius: 50%;
  border: 6px solid white;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}

.custom-range-slider::-moz-range-thumb {
  width: 32px;
  height: 32px;
  background: #111827;
  cursor: pointer;
  border-radius: 50%;
  border: 6px solid white;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}

.score-details {
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: normal;
}

.probability-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-top: 3rem;
}

.probability-card:has(.anomaly-detected) {
  border-color: #ef4444;
  box-shadow: 0 2px 5px rgba(239, 68, 68, 0.2);
}

.inference-results {
  width: 50%;
}
</style>
