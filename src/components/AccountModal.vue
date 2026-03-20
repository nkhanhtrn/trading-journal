<template>
  <BaseModal
    :show="show"
    title="My Account"
    max-width="md"
    @close="$emit('close')"
  >
    <template #default>
      <div class="space-y-6">
        <!-- User Info -->
        <div class="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
          <div class="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold text-2xl">{{ userName.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-semibold text-lg">{{ userName }}</h3>
            <p class="text-gray-400 text-sm">{{ userEmail }}</p>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-700/50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-white">{{ stats.totalTrades }}</div>
            <div class="text-xs text-gray-400 mt-1">Total Trades</div>
          </div>
          <div class="bg-gray-700/50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold" :class="stats.overallPnL >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ stats.overallPnL >= 0 ? '+' : '' }}${{ stats.overallPnL.toFixed(0) }}
            </div>
            <div class="text-xs text-gray-400 mt-1">Overall P&L</div>
          </div>
          <div class="bg-gray-700/50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold" :class="stats.yearlyPnL >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ stats.yearlyPnL >= 0 ? '+' : '' }}${{ stats.yearlyPnL.toFixed(0) }}
            </div>
            <div class="text-xs text-gray-400 mt-1">Yearly P&L</div>
          </div>
          <div class="bg-gray-700/50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-blue-400">{{ stats.winRate }}%</div>
            <div class="text-xs text-gray-400 mt-1">Win Rate</div>
          </div>
        </div>

        <!-- Sync Status -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">Sync Status</span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" :class="isSynced ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'">
            <i class="fas fa-xs" :class="isSynced ? 'fa-check-circle' : 'fa-sync fa-spin'"></i>
            {{ isSynced ? 'Synced' : 'Syncing...' }}
          </span>
        </div>
      </div>
    </template>

    <template #footer>
      <button
        @click="handleSignOut"
        :disabled="isSigningOut"
        class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i v-if="isSigningOut" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-sign-out-alt mr-2"></i>
        {{ isSigningOut ? 'Signing Out...' : 'Sign Out' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  show: Boolean,
  userName: String,
  userEmail: String,
  isSynced: {
    type: Boolean,
    default: true
  },
  stats: {
    type: Object,
    default: () => ({
      totalTrades: 0,
      overallPnL: 0,
      yearlyPnL: 0,
      winRate: 0
    })
  }
})

const emit = defineEmits(['close', 'sign-out'])

const isSigningOut = ref(false)

const handleSignOut = () => {
  isSigningOut.value = true
  emit('sign-out')
  setTimeout(() => {
    isSigningOut.value = false
  }, 1000)
}
</script>
