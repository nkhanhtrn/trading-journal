<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="fixed inset-0 bg-black/50"></div>
      <div class="relative bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <div class="flex items-baseline gap-2">
            <h2 class="text-lg font-bold text-white">{{ trade.symbol }}</h2>
            <span class="text-[10px] text-gray-500">{{ trade.date }}</span>
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

          <!-- Intraday Chart -->
          <div class="bg-gray-700 rounded p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="text-xs text-gray-400">Intraday Price - {{ trade.date }}</div>
            </div>
            <div v-if="intradayData && intradayData.length > 0" class="h-64">
              <Line :data="intradayChartData" :options="intradayChartOptions" />
              <div class="flex justify-center gap-6 mt-3 text-xs">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-green-400"></span>
                  <span class="text-gray-400">Entry: {{ formatTime(entryTime) }}</span>
                </div>
                <div v-if="exitTime" class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-red-400"></span>
                  <span class="text-gray-400">Exit: {{ formatTime(exitTime) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-gray-400 text-sm">
              <i class="fas fa-chart-line mr-2"></i>
              {{ isIntradayLoading ? 'Loading intraday data...' : 'No intraday data available' }}
            </div>
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
import { computed, ref, onMounted, watch } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { detectStrategy, getStrategyDisplayName } from '../utils/strategyDetector.js'
import { fetchIntradayPrices } from '../utils/priceFetcher.js'

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const props = defineProps({
  trade: {
    type: Object,
    required: true
  },
  proxyUrl: {
    type: String,
    default: ''
  }
})

defineEmits(['close', 'edit', 'delete'])

const intradayData = ref([])
const isIntradayLoading = ref(true)

// Load intraday data when component mounts or trade changes
onMounted(() => {
  loadIntradayData()
})

watch(() => props.trade, () => {
  loadIntradayData()
}, { deep: true })

async function loadIntradayData() {
  if (props.trade?.symbol && props.trade?.date) {
    isIntradayLoading.value = true
    intradayData.value = await fetchIntradayPrices(props.trade.symbol, props.trade.date, props.proxyUrl)
    isIntradayLoading.value = false
  }
}

// Extract entry and exit times from the trade
const entryTime = computed(() => {
  // For tickets with strategies array (new format)
  if (props.trade.strategies?.[0]?.entry_time) {
    const timeStr = props.trade.strategies[0].entry_time
    if (timeStr && typeof timeStr === 'string') {
      // Parse the time string (format might be "HH:MM:SS" or ISO datetime)
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':')
        const hours = parseInt(parts[0])
        const minutes = parseInt(parts[1])
        const date = new Date(props.trade.date + 'T00:00:00Z')
        date.setUTCHours(hours, minutes, 0, 0)
        return date
      }
      return new Date(timeStr)
    }
  }
  // Fallback: use 9:30 AM (market open)
  const date = new Date(props.trade.date + 'T00:00:00Z')
  date.setUTCHours(9, 30, 0, 0)
  return date
})

const exitTime = computed(() => {
  // Only for closed trades
  if (props.trade.status === 'OPEN') return null

  // For tickets with strategies array (new format)
  if (props.trade.strategies?.[0]?.exit_time) {
    const timeStr = props.trade.strategies[0].exit_time
    if (timeStr && typeof timeStr === 'string') {
      // Parse the time string
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':')
        const hours = parseInt(parts[0])
        const minutes = parseInt(parts[1])
        const date = new Date(props.trade.exit_date + 'T00:00:00Z')
        date.setUTCHours(hours, minutes, 0, 0)
        return date
      }
      return new Date(timeStr)
    }
  }

  // Fallback: use 4:00 PM (market close) on exit date
  if (props.trade.exit_date) {
    const date = new Date(props.trade.exit_date + 'T00:00:00Z')
    date.setUTCHours(16, 0, 0, 0)
    return date
  }
  return null
})

// Format time for display
function formatTime(date) {
  if (!date) return '-'
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// Chart data with entry/exit markers
const intradayChartData = computed(() => {
  if (!intradayData.value || intradayData.value.length === 0) {
    return { labels: [], datasets: [] }
  }

  // Format labels as time strings
  const labels = intradayData.value.map(point => {
    return point.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  })

  // Build price data
  const prices = intradayData.value.map(point => point.close)

  // Find the closest data point index for entry time
  const entryIndex = findClosestIndex(intradayData.value, entryTime.value)

  // Find the closest data point index for exit time (if exists and same day)
  let exitIndex = null
  if (exitTime.value) {
    const exitDate = new Date(props.trade.exit_date + 'T00:00:00Z')
    const entryDate = new Date(props.trade.date + 'T00:00:00Z')

    // Only show exit marker if it's the same day as entry
    if (exitDate.getTime() === entryDate.getTime()) {
      exitIndex = findClosestIndex(intradayData.value, exitTime.value)
    }
  }

  // Build entry marker dataset (scatter point)
  const entryMarkers = new Array(labels.length).fill(null)
  if (entryIndex !== null && entryIndex >= 0 && entryIndex < labels.length) {
    entryMarkers[entryIndex] = prices[entryIndex]
  }

  // Build exit marker dataset (scatter point)
  const exitMarkers = new Array(labels.length).fill(null)
  if (exitIndex !== null && exitIndex >= 0 && exitIndex < labels.length) {
    exitMarkers[exitIndex] = prices[exitIndex]
  }

  return {
    labels,
    datasets: [
      {
        type: 'line',
        label: 'Price',
        data: prices,
        borderColor: 'rgba(96, 165, 250, 0.8)',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 3
      },
      {
        type: 'scatter',
        label: 'Entry',
        data: entryMarkers,
        backgroundColor: 'rgba(74, 222, 128, 1)',
        borderColor: 'rgba(74, 222, 128, 1)',
        pointRadius: 8,
        pointHoverRadius: 10,
        pointStyle: 'circle',
        order: 1
      },
      {
        type: 'scatter',
        label: 'Exit',
        data: exitMarkers,
        backgroundColor: 'rgba(248, 113, 113, 1)',
        borderColor: 'rgba(248, 113, 113, 1)',
        pointRadius: 8,
        pointHoverRadius: 10,
        pointStyle: 'circle',
        order: 2
      }
    ]
  }
})

// Find the closest data point index for a given time
function findClosestIndex(data, targetTime) {
  if (!targetTime || !data || data.length === 0) return null

  let closestIndex = 0
  let closestDiff = Math.abs(data[0].time.getTime() - targetTime.getTime())

  for (let i = 1; i < data.length; i++) {
    const diff = Math.abs(data[i].time.getTime() - targetTime.getTime())
    if (diff < closestDiff) {
      closestDiff = diff
      closestIndex = i
    }
  }

  // Only return the index if the time difference is less than 30 minutes
  if (closestDiff < 30 * 60 * 1000) {
    return closestIndex
  }
  return null
}

// Chart options
const intradayChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { top: 20, right: 10, bottom: 0, left: 10 }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(75, 85, 99, 0.5)',
      borderWidth: 1,
      padding: 10,
      callbacks: {
        title: function(context) {
          return context[0].label
        },
        label: function(context) {
          if (context.dataset.label === 'Price') {
            return 'Price: $' + context.raw.toFixed(2)
          } else if (context.dataset.label === 'Entry') {
            return 'Entry Position'
          } else if (context.dataset.label === 'Exit') {
            return 'Exit Position'
          }
          return ''
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(75, 85, 99, 0.3)',
        drawBorder: false
      },
      ticks: {
        color: 'rgba(229, 231, 235, 0.8)',
        font: { size: 10 },
        maxTicksLimit: 8
      }
    },
    y: {
      grid: {
        color: 'rgba(75, 85, 99, 0.3)',
        drawBorder: false
      },
      ticks: {
        color: 'rgba(229, 231, 235, 0.8)',
        font: { size: 10 },
        callback: function(value) {
          return '$' + value.toFixed(2)
        }
      }
    }
  },
  interaction: {
    mode: 'index',
    intersect: false
  }
}

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
