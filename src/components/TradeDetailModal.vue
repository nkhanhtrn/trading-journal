<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="fixed inset-0 bg-black/50"></div>
      <div class="relative bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 class="text-lg font-bold text-white">{{ trade.symbol }} - #{{ trade.id }}</h2>
            <p class="text-sm text-gray-400">{{ trade.date }}</p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-4">
          <!-- Strategy & Status -->
          <div class="flex gap-2">
            <span class="px-3 py-1 text-sm rounded-full bg-blue-900 text-blue-300">
              {{ strategyName }}
            </span>
            <span class="px-3 py-1 text-sm rounded-full" :class="getStatusClass(trade.status)">
              {{ trade.status }}
            </span>
          </div>

          <!-- Legs -->
          <div class="bg-gray-700 rounded overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-750">
                <tr>
                  <th class="px-3 py-2 text-left text-gray-400">Action</th>
                  <th class="px-3 py-2 text-left text-gray-400">Type</th>
                  <th class="px-3 py-2 text-right text-gray-400">Strike</th>
                  <th class="px-3 py-2 text-left text-gray-400">Expiry</th>
                  <th class="px-3 py-2 text-right text-gray-400">Prem</th>
                  <th class="px-3 py-2 text-right text-gray-400">Qty</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-600">
                <tr v-for="(leg, i) in trade.legs" :key="i">
                  <td class="px-3 py-2">
                    <span class="px-2 py-0.5 text-xs rounded" :class="leg.action === 'buy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'">
                      {{ leg.action === 'buy' ? 'LONG' : 'SHORT' }}
                    </span>
                  </td>
                  <td class="px-3 py-2 font-semibold">{{ leg.type.toUpperCase() }}</td>
                  <td class="px-3 py-2 text-right">${{ leg.strike }}</td>
                  <td class="px-3 py-2 text-gray-400">{{ leg.expiry }}</td>
                  <td class="px-3 py-2 text-right">${{ leg.premium.toFixed(2) }}</td>
                  <td class="px-3 py-2 text-right">{{ leg.quantity }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Details -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-gray-700 rounded p-3">
              <div class="text-xs text-gray-400">Debit</div>
              <div class="text-lg font-semibold text-red-400">
                {{ trade.debit_paid ? `$${trade.debit_paid.toFixed(2)}` : '-' }}
              </div>
            </div>
            <div class="bg-gray-700 rounded p-3">
              <div class="text-xs text-gray-400">Credit</div>
              <div class="text-lg font-semibold text-green-400">
                {{ trade.credit_received ? `$${trade.credit_received.toFixed(2)}` : '-' }}
              </div>
            </div>
            <div class="bg-gray-700 rounded p-3">
              <div class="text-xs text-gray-400">Exit Date</div>
              <div class="text-lg font-semibold text-white">
                {{ trade.exit_date || 'Open' }}
              </div>
            </div>
          </div>

          <!-- P&L -->
          <div v-if="trade.status !== 'OPEN'" class="bg-gray-700 rounded p-4">
            <div class="text-xs text-gray-400 mb-1">Total P&L</div>
            <div class="text-2xl font-bold" :class="trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ trade.pnl >= 0 ? '+' : '' }}${{ trade.pnl.toFixed(2) }}
            </div>
          </div>

          <!-- Notes -->
          <div v-if="trade.notes" class="bg-gray-700 rounded p-3">
            <div class="text-xs text-gray-400 mb-2">Notes</div>
            <div class="text-sm text-gray-200">{{ trade.notes }}</div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4 border-t border-gray-700">
            <button
              @click="$emit('edit', trade)"
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            >
              Edit Trade
            </button>
            <button
              @click="$emit('delete', trade.id)"
              class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded"
            >
              Delete Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { detectStrategy, getStrategyDisplayName } from '../utils/strategyDetector.js'

const props = defineProps({
  trade: {
    type: Object,
    required: true
  }
})

defineEmits(['close', 'edit', 'delete'])

const strategyName = computed(() => {
  return getStrategyDisplayName(detectStrategy(props.trade.legs))
})

const getStatusClass = (status) => {
  const classes = {
    'WIN': 'bg-green-900 text-green-300',
    'LOSS': 'bg-red-900 text-red-300',
    'OPEN': 'bg-yellow-900 text-yellow-300'
  }
  return classes[status] || 'bg-gray-700 text-gray-300'
}
</script>
