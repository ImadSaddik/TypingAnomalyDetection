<template>
  <section class="container">
    <h1 class="title">Keystroke dynamics demo</h1>
    <p class="description secondary">
      This demo shows how we can train a model based on keystroke dynamics. Start typing and the
      model will learn your typing behavior. If you keep using the demo, the model will continuously
      learn and adapt to your typing style.
    </p>

    <!-- Add an input field -->
    <textarea
      class="custom-textarea"
      id="text-input-area"
      rows="8"
      placeholder="Type anything you want here..."
    ></textarea>
  </section>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {}
  },
  methods: {},
  async mounted() {},
  beforeUnmount() {},
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
