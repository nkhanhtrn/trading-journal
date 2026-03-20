<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" @click="$emit('close')"></div>
      <div class="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 class="text-lg font-bold text-white">Sign In to Trading Journal</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          <!-- Logo/Icon -->
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/50 mb-4">
              <i class="fas fa-chart-line text-3xl text-blue-400"></i>
            </div>
            <h2 class="text-xl font-bold text-white">Trading Journal</h2>
            <p class="text-gray-400 text-sm mt-1">Sign in to sync your trades across devices</p>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
            <p class="text-gray-300">{{ loadingMessage }}</p>
          </div>

          <!-- Error Message -->
          <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">
            <div class="flex items-start">
              <i class="fas fa-exclamation-circle text-red-400 mt-0.5 mr-3"></i>
              <div>
                <p class="text-red-300 font-medium">Sign In Error</p>
                <p class="text-red-200 text-sm">{{ error }}</p>
              </div>
            </div>
          </div>

          <!-- Sign In Form -->
          <div v-else class="space-y-4">
            <!-- Google Sign In Button -->
            <button
              @click="handleGoogleSignIn"
              :disabled="isLoading"
              class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <!-- Benefits List -->
            <div class="bg-gray-700/50 rounded-lg px-4 py-3 space-y-2">
              <p class="text-sm font-medium text-gray-300">Benefits of signing in:</p>
              <ul class="text-sm text-gray-400 space-y-1">
                <li class="flex items-start">
                  <i class="fas fa-check text-green-400 mt-1 mr-2 text-xs"></i>
                  <span>Sync trades across all your devices</span>
                </li>
                <li class="flex items-start">
                  <i class="fas fa-check text-green-400 mt-1 mr-2 text-xs"></i>
                  <span>Automatic backup to the cloud</span>
                </li>
                <li class="flex items-start">
                  <i class="fas fa-check text-green-400 mt-1 mr-2 text-xs"></i>
                  <span>Never lose your trading data</span>
                </li>
              </ul>
            </div>

            <!-- Privacy Note -->
            <p class="text-xs text-gray-500 text-center">
              <i class="fas fa-lock mr-1"></i>
              Your data is secure and private. We only use Google for authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'success'])

const isLoading = ref(false)
const error = ref(null)
const loadingMessage = ref('Signing in...')

const handleGoogleSignIn = () => {
  isLoading.value = true
  error.value = null
  emit('success')
}

watch(() => props.show, (newValue) => {
  if (newValue) {
    error.value = null
    isLoading.value = false
  }
})
</script>
