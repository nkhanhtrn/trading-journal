<template>
  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="bg-gray-800 rounded-lg p-4">
      <div class="text-2xl font-bold text-white">{{ summary.totalTickets }}</div>
      <div class="text-xs text-gray-400">Tickets</div>
    </div>
    <div class="bg-gray-800 rounded-lg p-4">
      <div class="text-2xl font-bold text-green-400">{{ summary.winRate }}%</div>
      <div class="text-xs text-gray-400">Win Rate</div>
    </div>
    <div class="bg-gray-800 rounded-lg p-4">
      <div class="text-2xl font-bold" :class="summary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
        {{ summary.totalPnL >= 0 ? '+' : '' }}${{ summary.totalPnL.toFixed(0) }}
      </div>
      <div class="text-xs text-gray-400">Total P&L</div>
    </div>
    <div class="bg-gray-800 rounded-lg p-4">
      <div class="text-2xl font-bold text-blue-400">{{ summary.totalStrategies }}</div>
      <div class="text-xs text-gray-400">Strategies</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  summary: {
    type: Object,
    required: true
  }
})
</script>
