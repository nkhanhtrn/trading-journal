<template>
  <div class="h-full flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-8">
      <!-- Hero Section -->
      <div class="space-y-4">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 mb-6">
          <i class="fas fa-chart-line text-4xl text-white"></i>
        </div>
        <h1 class="text-3xl sm:text-4xl font-bold text-white">Trading Journal</h1>
        <p class="text-gray-400 text-lg">
          Track your trades, analyze your performance, and improve your strategy
        </p>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-gray-800 rounded-lg p-4">
          <div class="text-blue-400 text-2xl mb-2">
            <i class="fas fa-calendar-alt"></i>
          </div>
          <p class="text-gray-300 text-sm font-medium">Track Trades</p>
          <p class="text-gray-500 text-xs mt-1">Log every trade</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-4">
          <div class="text-green-400 text-2xl mb-2">
            <i class="fas fa-chart-pie"></i>
          </div>
          <p class="text-gray-300 text-sm font-medium">Analyze</p>
          <p class="text-gray-500 text-xs mt-1">View statistics</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-4">
          <div class="text-purple-400 text-2xl mb-2">
            <i class="fas fa-trophy"></i>
          </div>
          <p class="text-gray-300 text-sm font-medium">Improve</p>
          <p class="text-gray-500 text-xs mt-1">Grow profits</p>
        </div>
      </div>

      <!-- CTA Buttons -->
      <div class="space-y-3">
        <button
          @click="$emit('open-login')"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button
          @click="$emit('use-local')"
          class="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors"
        >
          <i class="fas fa-laptop mr-2"></i>
          Use Local Storage Only
        </button>
      </div>

      <!-- Privacy Note -->
      <p class="text-gray-500 text-xs">
        <i class="fas fa-lock mr-1"></i>
        Your trading data is private and secure. Sign in required for cloud sync.
      </p>
    </div>
  </div>
</template>

<script setup>
defineEmits(['open-login', 'use-local'])
</script>
