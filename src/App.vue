<template>
  <section class="container">
    <h1 class="title">Keystroke dynamics demo</h1>
    <p class="description secondary">
      This demo shows how we can train a model based on keystroke dynamics. Start typing and the
      model will learn your typing behavior. If you keep using the demo, the model will continuously
      learn and adapt to your typing style.
    </p>

    <textarea
      class="custom-textarea"
      id="text-input-area"
      rows="8"
      placeholder="Type anything you want here..."
    ></textarea>
  </section>
</template>

<script>
import behaviorTracker from './services/behaviorTracker.js'
import { extractFeaturesFromRawEvents } from './services/featureExtractor.js'

export default {
  name: 'App',
  data() {
    return {
      recordingDurationInSeconds: 10,
      collectedFeatures: [],
      recordingInterval: null,
    }
  },
  mounted() {
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

      this.recordingInterval = setInterval(() => {
        const events = behaviorTracker.getEventsAndReset()
        const features = extractFeaturesFromRawEvents(events, this.recordingDurationInSeconds)

        if (features && !this.isEmptyObject(features)) {
          const featureEntry = {
            timestamp: new Date().toISOString(),
            features: features,
          }

          this.collectedFeatures.push(featureEntry)
          this.saveFeaturesToStorage()
        }
      }, this.recordingDurationInSeconds * 1000)
    },
    isEmptyObject(object) {
      return Object.keys(object).length === 0
    },
    saveFeaturesToStorage() {
      try {
        console.log('Saving features to localStorage:', this.collectedFeatures)
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
</style>
