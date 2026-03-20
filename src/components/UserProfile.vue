<template>
  <div class="p-4 border-b border-gray-700">
    <!-- Not Authenticated State -->
    <div v-if="!isAuthenticated" class="text-center space-y-3">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-700">
        <i class="fas fa-user text-gray-400 text-xl"></i>
      </div>
      <div>
        <p class="text-white font-medium text-sm">Not Signed In</p>
        <p class="text-gray-500 text-xs mt-1">Sign in to sync your data</p>
      </div>
      <button
        @click="$emit('open-login')"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
      >
        <i class="fas fa-sign-in-alt mr-2"></i>
        Sign In
      </button>
    </div>

    <!-- Authenticated State -->
    <div v-else class="space-y-3">
      <!-- User Info -->
      <div class="flex items-center gap-3">
        <img
          v-if="userPhoto"
          :src="userPhoto"
          :alt="userName"
          class="w-10 h-10 rounded-full object-cover"
        >
        <div
          v-else
          class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center"
        >
          <span class="text-white font-medium text-lg">
            {{ userName.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white font-medium text-sm truncate">{{ userName }}</p>
          <p class="text-gray-500 text-xs truncate">{{ userEmail }}</p>
        </div>
      </div>

      <!-- Sync Status -->
      <div class="flex items-center gap-2 text-xs">
        <span
          class="inline-flex items-center gap-1 px-2 py-1 rounded"
          :class="isSynced ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'"
        >
          <i
            class="fas fa-xs"
            :class="isSynced ? 'fa-check-circle' : 'fa-sync'"
          ></i>
          {{ isSynced ? 'Synced' : 'Syncing...' }}
        </span>
      </div>

      <!-- Sign Out Button -->
      <button
        @click="handleSignOut"
        :disabled="isSigningOut"
        class="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i v-if="isSigningOut" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-sign-out-alt mr-2"></i>
        {{ isSigningOut ? 'Signing Out...' : 'Sign Out' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  isAuthenticated: Boolean,
  userName: String,
  userEmail: String,
  userPhoto: String,
  isSynced: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['open-login', 'sign-out'])

const isSigningOut = ref(false)

const handleSignOut = () => {
  isSigningOut.value = true
  emit('sign-out')
  setTimeout(() => {
    isSigningOut.value = false
  }, 1000)
}
</script>
