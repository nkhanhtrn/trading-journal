<template>
  <BaseModal
    :show="show"
    :title="resetEmailSent ? '' : 'Sign In'"
    max-width="md"
    @close="$emit('close')"
  >
    <template #default>
      <div class="space-y-6">
        <!-- Logo/Icon -->
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/50 mb-4">
            <i class="fas fa-chart-line text-3xl text-blue-400"></i>
          </div>
          <h2 class="text-xl font-bold text-white">Trading Journal</h2>
          <p class="text-gray-400 text-sm mt-1">
            Sign in to sync your trades across devices
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
          <p class="text-gray-300">Signing in...</p>
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

        <!-- Success Message -->
        <div v-else-if="resetEmailSent" class="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3">
          <div class="flex items-start">
            <i class="fas fa-check-circle text-green-400 mt-0.5 mr-3"></i>
            <div>
              <p class="text-green-300 font-medium">Password Reset Email Sent</p>
              <p class="text-green-200 text-sm">Check your email for instructions to reset your password.</p>
            </div>
          </div>
        </div>

        <!-- Sign In Form -->
        <div v-if="!isLoading && !resetEmailSent" class="space-y-4">
          <!-- Email Field -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              v-model="formData.email"
              type="email"
              placeholder="you@example.com"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :disabled="isLoading"
              @keyup.enter="handleSubmit"
            >
          </div>

          <!-- Password Field -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <div class="relative">
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                :disabled="isLoading"
                @keyup.enter="handleSubmit"
              >
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <!-- Forgot Password -->
          <div class="text-center text-sm">
            <button
              @click="showForgotPassword = true"
              class="text-gray-400 hover:text-gray-300"
            >
              Forgot password?
            </button>
          </div>

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
            Your data is secure and private.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="!isLoading && !resetEmailSent" class="flex gap-3">
        <button
          v-if="showForgotPassword"
          @click="showForgotPassword = false"
          class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          v-if="!showForgotPassword"
          @click="handleSubmit"
          :disabled="isLoading || !isFormValid"
          class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
          Sign In
        </button>
        <button
          v-if="showForgotPassword && resetEmail"
          @click="handleResetPassword"
          :disabled="isLoading || !resetEmail"
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
          Send Reset Link
        </button>
      </div>
      <button
        v-if="resetEmailSent"
        @click="$emit('close')"
        class="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        Close
      </button>
    </template>
  </BaseModal>

  <!-- Forgot Password Sub-Modal -->
  <BaseModal
    :show="showForgotPassword"
    title="Reset Password"
    max-width="sm"
    @close="showForgotPassword = false"
  >
    <template #default>
      <p class="text-gray-400 text-sm mb-4">Enter your email address and we'll send you a link to reset your password.</p>
      <input
        v-model="resetEmail"
        type="email"
        placeholder="you@example.com"
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @keyup.enter="handleResetPassword"
      >
    </template>
    <template #footer>
      <div class="flex gap-3">
        <button
          @click="showForgotPassword = false"
          class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleResetPassword"
          :disabled="isLoading || !resetEmail"
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
          Send Reset Link
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'success'])

// Form state
const showPassword = ref(false)
const showForgotPassword = ref(false)
const resetEmailSent = ref(false)
const isLoading = ref(false)
const error = ref(null)
const resetEmail = ref('')

const formData = ref({
  email: '',
  password: ''
})

// Form validation
const isFormValid = computed(() => {
  return formData.value.email && formData.value.password
})

// Handle form submission
const handleSubmit = () => {
  if (!isFormValid.value) return

  isLoading.value = true
  error.value = null

  emit('success', {
    action: 'signIn',
    email: formData.value.email,
    password: formData.value.password
  })
}

// Handle password reset
const handleResetPassword = () => {
  if (!resetEmail.value) return

  isLoading.value = true
  error.value = null

  emit('success', {
    action: 'resetPassword',
    email: resetEmail.value
  })

  // Close forgot password modal
  showForgotPassword.value = false
}

// Handle password reset success
const handleResetSuccess = () => {
  resetEmailSent.value = true
  setTimeout(() => {
    resetEmailSent.value = false
  }, 5000)
}

// Watch for modal close to reset state
watch(() => props.show, (newValue) => {
  if (newValue) {
    error.value = null
    isLoading.value = false
    resetEmailSent.value = false
    showForgotPassword.value = false
  }
})

// Expose methods for parent
defineExpose({
  handleResetSuccess,
  setError: (err) => { error.value = err },
  setLoading: (loading) => { isLoading.value = loading }
})
</script>
