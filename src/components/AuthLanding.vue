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
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          Sign In
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
