<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" @click="$emit('close')"></div>
      <div class="relative bg-gray-800 rounded-lg shadow-xl max-w-lg w-full border border-gray-700">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 class="text-lg font-bold text-white">Import Existing Data?</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          <!-- Icon and Title -->
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-900/30 mb-4">
              <i class="fas fa-cloud-upload-alt text-3xl text-yellow-400"></i>
            </div>
            <h2 class="text-xl font-bold text-white">Import Existing Data?</h2>
            <p class="text-gray-400 text-sm mt-2">
              We found {{ localTicketsCount }} trade(s) in your browser storage
            </p>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="text-center py-6">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
            <p class="text-gray-300">{{ loadingMessage }}</p>
            <div v-if="progress > 0 && progress < 100" class="w-full bg-gray-700 rounded-full h-2 mt-4">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${progress}%` }"
              ></div>
            </div>
          </div>

          <!-- Success State -->
          <div v-else-if="isSuccess" class="text-center py-6">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 mb-4">
              <i class="fas fa-check text-3xl text-green-400"></i>
            </div>
            <p class="text-green-300 font-medium">Migration Complete!</p>
            <p class="text-gray-400 text-sm mt-2">
              {{ migratedCount }} trades imported successfully
            </p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">
            <div class="flex items-start">
              <i class="fas fa-exclamation-circle text-red-400 mt-0.5 mr-3"></i>
              <div>
                <p class="text-red-300 font-medium">Migration Failed</p>
                <p class="text-red-200 text-sm">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- Options -->
          <div v-else class="space-y-4">
            <!-- Import Option -->
            <div
              @click="startMigration"
              class="bg-gray-700/50 rounded-lg p-4 border-2 border-transparent hover:border-blue-500 transition-colors cursor-pointer"
            >
              <div class="flex items-start">
                <div class="flex-shrink-0 mt-1">
                  <i class="fas fa-cloud-upload-alt text-blue-400 text-xl"></i>
                </div>
                <div class="ml-4 flex-1">
                  <h3 class="text-white font-medium">Import to Cloud</h3>
                  <p class="text-gray-400 text-sm mt-1">
                    Upload your existing trades to secure cloud storage. Your data will be synced across all devices.
                  </p>
                  <div class="flex items-center gap-4 mt-3 text-sm">
                    <span class="text-gray-400"><i class="fas fa-database mr-1"></i> {{ localTicketsCount }} trades</span>
                    <span class="text-gray-400"><i class="fas fa-clock mr-1"></i> Takes ~30 seconds</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Skip Option -->
            <div
              @click="skipMigration"
              class="bg-gray-700/30 rounded-lg p-4 border-2 border-transparent hover:border-gray-600 transition-colors cursor-pointer"
            >
              <div class="flex items-start">
                <div class="flex-shrink-0 mt-1">
                  <i class="fas fa-forward text-gray-400 text-xl"></i>
                </div>
                <div class="ml-4 flex-1">
                  <h3 class="text-white font-medium">Skip for Now</h3>
                  <p class="text-gray-400 text-sm mt-1">
                    Start with a fresh account. You can always export and import your data later from Settings.
                  </p>
                  <p class="text-yellow-500 text-xs mt-2">
                    <i class="fas fa-exclamation-triangle mr-1"></i>
                    Local data will remain in your browser
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div v-if="!isLoading && !isSuccess && !error" class="flex gap-3">
            <button
              @click="startMigration"
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <i class="fas fa-cloud-upload-alt mr-2"></i>
              Import Data
            </button>
            <button
              @click="skipMigration"
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Skip
            </button>
          </div>

          <!-- Close Button -->
          <button
            v-if="isSuccess || error"
            @click="$emit('close')"
            class="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {{ isSuccess ? 'Start Using Journal' : 'Close' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  show: Boolean,
  localData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'migrate', 'skip'])

const isLoading = ref(false)
const isSuccess = ref(false)
const error = ref(null)
const loadingMessage = ref('Preparing migration...')
const progress = ref(0)
const migratedCount = ref(0)

const localTicketsCount = computed(() => {
  return props.localData?.tickets?.length || 0
})

const startMigration = () => {
  isLoading.value = true
  isSuccess.value = false
  error.value = null
  progress.value = 0
  loadingMessage.value = 'Uploading trades...'

  emit('migrate', {
    onProgress: (value) => {
      progress.value = value
      if (value < 33) loadingMessage.value = 'Uploading trades...'
      else if (value < 66) loadingMessage.value = 'Uploading transactions...'
      else if (value < 100) loadingMessage.value = 'Finalizing...'
    },
    onSuccess: (count) => {
      progress.value = 100
      isLoading.value = false
      isSuccess.value = true
      migratedCount.value = count
    },
    onError: (err) => {
      isLoading.value = false
      error.value = err.message || 'Migration failed. Please try again.'
    }
  })
}

const skipMigration = () => {
  emit('skip')
}

watch(() => props.show, (newValue) => {
  if (newValue) {
    isLoading.value = false
    isSuccess.value = false
    error.value = null
    progress.value = 0
  }
})
</script>
