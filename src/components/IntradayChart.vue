<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="border-t border-gray-700 pt-4">
      <div class="h-20 flex items-center justify-center text-gray-500 text-sm">
        <i class="fas fa-chart-bar mr-2"></i>
        Loading intraday data...
      </div>
    </div>

    <!-- No data state -->
    <div v-else-if="!hasData" class="border-t border-gray-700 pt-4">
      <div class="h-20 flex items-center justify-center text-gray-500 text-sm">
        <i class="fas fa-chart-bar mr-2"></i>
        No intraday data available
      </div>
    </div>

    <!-- P&L Details for current position -->
    <template v-else>
      <!-- Navigation header (always show if multiple tickets) -->
      <div v-if="hasMultiplePositions" class="border-t border-gray-700 pt-4">
        <div class="flex items-center justify-between px-3">
          <div class="flex items-center gap-3">
            <button @click="previousPosition" :disabled="positionIndex === 0" class="px-3 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white">
              <i class="fas fa-chevron-left mr-1"></i> Previous
            </button>
            <span class="text-sm text-gray-300">
              Ticket #{{ currentTicket?.ticket }} <span class="text-gray-500">({{ positionDisplay }})</span>
            </span>
            <button @click="nextPosition" :disabled="positionIndex >= positions.length - 1" class="px-3 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white">
              Next <i class="fas fa-chevron-right ml-1"></i>
            </button>
          </div>
          <div class="text-xs" :class="currentTicket?.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
            {{ currentTicket?.status !== 'OPEN' ? (currentTicket?.pnl >= 0 ? '+' : '') + '$' + currentTicket?.pnl : 'Open' }}
          </div>
        </div>
      </div>

      <!-- Date Range Header -->
      <div class="pt-4">
        <div class="bg-gray-800/50 rounded-lg px-4 py-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div v-if="isMultiDay || currentTicket?.exit_date" class="flex items-center gap-2">
                <i class="fas fa-calendar-day text-blue-400"></i>
                <span class="text-gray-400 text-sm">Entry</span>
                <span class="text-white font-medium">{{ formatDateRange(entryDateDisplay) }}</span>
                <span v-if="entryTimeDisplay" class="text-gray-500 text-sm">{{ entryTimeDisplay }}</span>
              </div>
              <div v-if="isMultiDay || currentTicket?.exit_date" class="flex items-center gap-2 text-gray-600">
                <i class="fas fa-arrow-right text-xs"></i>
              </div>
              <div v-if="currentTicket?.exit_date && currentTicket?.status !== 'OPEN'" class="flex items-center gap-2">
                <i class="fas fa-calendar-day text-orange-400"></i>
                <span class="text-gray-400 text-sm">Exit</span>
                <span class="text-white font-medium">{{ formatDateRange(exitDateDisplay) }}</span>
                <span v-if="exitTimeDisplay" class="text-gray-500 text-sm">{{ exitTimeDisplay }}</span>
              </div>
            </div>
            <div v-if="daysHeld > 0" class="text-gray-500 text-sm">
              <i class="fas fa-clock mr-1"></i>
              {{ daysHeld }} day{{ daysHeld > 1 ? 's' : '' }} held
            </div>
          </div>
        </div>
      </div>

      <!-- Single chart for same-day entry/exit or entry-only -->
      <div v-if="!isMultiDay">
        <div class="h-96">
          <Bar :data="chartData" :options="chartOptionsWithZoom" />
        </div>
      </div>

      <!-- Dual charts for multi-day entry/exit -->
      <div v-else>
        <div class="grid grid-cols-2 gap-4">
          <!-- Entry Day Chart -->
          <div>
            <div class="h-96">
              <Bar :data="entryChartData" :options="entryChartOptionsWithZoom" />
            </div>
          </div>

          <!-- Exit Day Chart -->
          <div>
            <div class="h-96">
              <Bar :data="exitChartData" :options="exitChartOptionsWithZoom" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import { fetchIntradayPrices } from '../utils/priceFetcher.js'

const props = defineProps({
  positions: {
    type: Array,
    default: () => []
  },
  symbol: {
    type: String,
    required: true
  },
  showEntry: {
    type: Boolean,
    default: true
  },
  showExit: {
    type: Boolean,
    default: true
  },
  modelIndex: {
    type: Number,
    default: 0
  },
  proxyUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelIndex'])

// State
const positionIndex = computed({
  get: () => props.modelIndex,
  set: (value) => emit('update:modelIndex', value)
})
const intradayData = ref({ entry: [], exit: [] })
const loading = ref(false)

// Get current ticket
const currentTicket = computed(() => {
  if (props.positions.length === 0) return null
  return props.positions[positionIndex.value] || props.positions[0]
})

// Check if entry and exit are on the same day
const isSameDayExit = computed(() => {
  const ticket = currentTicket.value
  if (!ticket) return false
  if (!ticket.exit_date || ticket.status === 'OPEN') return false
  const entryDate = new Date(ticket.date + 'T00:00:00-05:00')
  const exitDate = new Date(ticket.exit_date + 'T00:00:00-05:00')
  return exitDate.toDateString() === entryDate.toDateString()
})

// Check if we need dual charts (multi-day)
const isMultiDay = computed(() => {
  return intradayData.value.entry.length > 0 && intradayData.value.exit.length > 0 && !isSameDayExit.value
})

// Check if we have data to display
const hasData = computed(() => {
  return intradayData.value.entry.length > 0 || intradayData.value.exit.length > 0
})

// Navigation
const hasMultiplePositions = computed(() => props.positions.length > 1)
const positionDisplay = computed(() => `${positionIndex.value + 1} / ${props.positions.length}`)

const previousPosition = () => {
  if (positionIndex.value > 0) {
    positionIndex.value--
    emit('position-change', positionIndex.value)
  }
}

const nextPosition = () => {
  if (positionIndex.value < props.positions.length - 1) {
    positionIndex.value++
    emit('position-change', positionIndex.value)
  }
}

// Display dates
const displayDate = computed(() => {
  const ticket = currentTicket.value
  return ticket?.date || ''
})

const entryDateDisplay = computed(() => {
  const ticket = currentTicket.value
  return ticket?.date || ''
})

const exitDateDisplay = computed(() => {
  const ticket = currentTicket.value
  return ticket?.exit_date || ''
})

// Calculate days held
const daysHeld = computed(() => {
  const ticket = currentTicket.value
  if (!ticket) return 0
  if (!ticket.exit_date || ticket.status === 'OPEN') return 0

  const entryDate = new Date(ticket.date + 'T00:00:00-05:00')
  const exitDate = new Date(ticket.exit_date + 'T00:00:00-05:00')
  const diffTime = exitDate.getTime() - entryDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

// Format date range for display (e.g., "Jan 15, 2025")
function formatDateRange(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00-05:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

// Format time for display (EST)
function formatTimeEST(date) {
  if (!date || isNaN(date.getTime())) return ''
  const hours = date.getUTCHours() - 5
  const adjustedHours = ((hours % 24) + 24) % 24
  const minutes = date.getUTCMinutes()
  const ampm = adjustedHours >= 12 ? 'PM' : 'AM'
  const displayHours = adjustedHours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

const entryTimeDisplay = computed(() => {
  const ticket = currentTicket.value
  const entryTime = parseEntryTime(ticket)
  return formatTimeEST(entryTime)
})

const exitTimeDisplay = computed(() => {
  const ticket = currentTicket.value
  const exitTime = parseExitTime(ticket)
  return formatTimeEST(exitTime)
})

// Parse entry time from ticket
function parseEntryTime(ticket) {
  if (ticket.strategies?.[0]?.entry_time) {
    const timeStr = ticket.strategies[0].entry_time
    if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
      try {
        const parsed = new Date(timeStr)
        if (!isNaN(parsed.getTime())) return parsed
      } catch (e) {}
      if (timeStr.includes(':')) {
        const parts = timeStr.trim().split(':')
        const hours = parseInt(parts[0])
        const minutes = parseInt(parts[1])
        const date = new Date(ticket.date + 'T00:00:00-05:00')
        date.setHours(hours, minutes, 0, 0)
        return date
      }
    }
  }
  return new Date(ticket.date + 'T09:30:00-05:00')
}

// Parse exit time from ticket
function parseExitTime(ticket) {
  if (ticket.strategies?.[0]?.exit_time) {
    const timeStr = ticket.strategies[0].exit_time
    if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
      try {
        const parsed = new Date(timeStr)
        if (!isNaN(parsed.getTime())) return parsed
      } catch (e) {}
      if (timeStr.includes(':')) {
        const parts = timeStr.trim().split(':')
        const hours = parseInt(parts[0])
        const minutes = parseInt(parts[1])
        const date = new Date(ticket.exit_date + 'T00:00:00-05:00')
        date.setHours(hours, minutes, 0, 0)
        return date
      }
    }
  }
  return new Date(ticket.exit_date + 'T16:00:00-05:00')
}

// Build candlestick data
function buildCandlestickData(data, entryTime, exitTime, showEntry, showExit, entryAction, exitAction) {
  if (!data || data.length === 0) {
    return { labels: [], datasets: [] }
  }

  const labels = data.map(point => {
    const date = new Date(point.time)
    // Format time in EST (UTC-5)
    const hours = date.getUTCHours() - 5
    const adjustedHours = ((hours % 24) + 24) % 24 // Handle negative values
    const minutes = date.getUTCMinutes()
    const ampm = adjustedHours >= 12 ? 'PM' : 'AM'
    const displayHours = adjustedHours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
  })

  // Wicks (thin bars from low to high)
  const wicksData = data.map(point => [point.low, point.high])

  // Bodies (thicker bars from open to close)
  const bodiesData = data.map(point => [
    Math.min(point.open, point.close),
    Math.max(point.open, point.close)
  ])

  // Determine colors based on price movement
  const bodyColors = data.map(point => point.close >= point.open ? '#10B981' : '#EF4444')
  const bodyBorderColors = data.map(point => point.close >= point.open ? '#059669' : '#DC2626')

  const datasets = [
    {
      label: 'Wicks',
      data: wicksData,
      backgroundColor: '#6B7280',
      barPercentage: 0.05,
      categoryPercentage: 1.0,
      order: 1
    },
    {
      label: 'Price',
      data: bodiesData,
      backgroundColor: bodyColors,
      borderColor: bodyBorderColors,
      borderWidth: 1,
      barPercentage: 0.8,
      categoryPercentage: 1.0,
      order: 2
    }
  ]

  // Add entry marker
  if (showEntry && entryTime) {
    const entryIdx = data.findIndex(p => {
      const pointTime = new Date(p.time)
      return pointTime >= entryTime
    })
    if (entryIdx >= 0) {
      const entryPrice = data[entryIdx].open
      const isLong = entryAction === 'buy'
      console.log('Entry marker:', { entryTime, entryIdx, entryPrice, candleTime: data[entryIdx]?.time })
      datasets.push({
        label: 'Entry',
        data: Array(entryIdx).fill(null).concat([entryPrice]).concat(Array(data.length - entryIdx - 1).fill(null)),
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
        pointStyle: 'triangle',
        pointRotation: isLong ? 0 : 180,
        pointRadius: 12,
        pointHoverRadius: 14,
        type: 'scatter',
        order: 0
      })
    }
  }

  // Add exit marker
  if (showExit && exitTime) {
    // Find the closest data point to the exit time
    let closestIdx = -1
    let smallestDiff = Infinity
    for (let i = 0; i < data.length; i++) {
      const pointTime = new Date(data[i].time)
      const diff = Math.abs(pointTime.getTime() - exitTime.getTime())
      if (diff < smallestDiff) {
        smallestDiff = diff
        closestIdx = i
      }
    }
    if (closestIdx >= 0 && smallestDiff < 30 * 60 * 1000) { // Within 30 minutes
      const exitPrice = data[closestIdx].open
      const isLongExit = exitAction === 'buy'
      console.log('Exit marker:', { exitTime, closestIdx, exitPrice, candleTime: data[closestIdx]?.time, smallestDiff })
      datasets.push({
        label: 'Exit',
        data: Array(closestIdx).fill(null).concat([exitPrice]).concat(Array(data.length - closestIdx - 1).fill(null)),
        backgroundColor: '#F97316',
        borderColor: '#F97316',
        pointStyle: 'triangle',
        pointRotation: isLongExit ? 180 : 0,
        pointRadius: 12,
        pointHoverRadius: 14,
        type: 'scatter',
        order: 0
      })
    }
  }

  return { labels, datasets }
}

// Entry day chart data
const entryChartData = computed(() => {
  if (!intradayData.value.entry || intradayData.value.entry.length === 0) {
    return { labels: [], datasets: [] }
  }

  const ticket = currentTicket.value
  if (!ticket) return { labels: [], datasets: [] }

  const entryTime = parseEntryTime(ticket)
  const exitTime = isSameDayExit.value ? parseExitTime(ticket) : null
  const entryAction = ticket.strategies?.[0]?.legs?.[0]?.action || 'buy'

  return buildCandlestickData(intradayData.value.entry, entryTime, exitTime, props.showEntry, isSameDayExit.value, entryAction, null)
})

// Exit day chart data
const exitChartData = computed(() => {
  if (!intradayData.value.exit || intradayData.value.exit.length === 0 || isSameDayExit.value) {
    return { labels: [], datasets: [] }
  }

  const ticket = currentTicket.value
  if (!ticket) return { labels: [], datasets: [] }

  const entryAction = ticket.strategies?.[0]?.legs?.[0]?.action || 'buy'
  const exitAction = entryAction === 'buy' ? 'sell' : 'buy'
  const exitTime = parseExitTime(ticket)

  return buildCandlestickData(intradayData.value.exit, null, exitTime, false, props.showExit, entryAction, exitAction)
})

// Single chart data (for same-day or entry-only)
const chartData = computed(() => {
  if (!intradayData.value.entry || intradayData.value.entry.length === 0) {
    return { labels: [], datasets: [] }
  }

  const ticket = currentTicket.value
  if (!ticket) return { labels: [], datasets: [] }

  const entryTime = parseEntryTime(ticket)
  const exitTime = isSameDayExit.value ? parseExitTime(ticket) : null
  const entryAction = ticket.strategies?.[0]?.legs?.[0]?.action || 'buy'
  const exitAction = entryAction === 'buy' ? 'sell' : 'buy'

  return buildCandlestickData(intradayData.value.entry, entryTime, exitTime, props.showEntry, isSameDayExit.value && props.showExit, entryAction, exitAction)
})

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: { top: 20, right: 10, bottom: 0, left: 10 }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(75, 85, 99, 0.5)',
      borderWidth: 1,
      padding: 10,
      callbacks: {
        title: (context) => context[0].label,
        label: (context) => {
          if (context.dataset.label === 'Entry' || context.dataset.label === 'Exit') {
            const ticket = currentTicket.value
            if (ticket) {
              const legs = ticket.strategies?.[0]?.legs || []
              const strategyName = ticket.strategies?.[0]?.name || ticket.symbol
              const legDetails = legs.map(leg => {
                const action = leg.action === 'buy' ? 'LONG' : 'SHORT'
                const type = leg.type.toUpperCase()
                return `${action} ${type} $${leg.strike}`
              }).join(', ')
              return [
                `#${ticket.ticket} - ${strategyName}`,
                `Legs: ${legDetails}`,
                ticket.status !== 'OPEN' ? `P&L: ${ticket.pnl >= 0 ? '+' : ''}$${ticket.pnl}` : 'Open Position'
              ]
            }
          }
          return null // Don't show tooltip for Price (candlesticks)
        }
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(75, 85, 99, 0.3)', drawBorder: false },
      ticks: { color: 'rgba(229, 231, 235, 0.8)', font: { size: 10 }, maxTicksLimit: 8 }
    },
    y: {
      grid: { color: 'rgba(75, 85, 99, 0.3)', drawBorder: false },
      ticks: {
        color: 'rgba(229, 231, 235, 0.8)',
        font: { size: 10 },
        callback: (value) => '$' + value.toFixed(2)
      }
    }
  },
  interaction: { mode: 'index', intersect: false }
}))

// Dynamic Y-axis zoom
const chartOptionsWithZoom = computed(() => {
  const options = { ...chartOptions.value }

  if (intradayData.value.entry && intradayData.value.entry.length > 0) {
    const allLows = intradayData.value.entry.map(p => p.low)
    const allHighs = intradayData.value.entry.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.02 || 0.10
    options.scales.y.min = minPrice - padding
    options.scales.y.max = maxPrice + padding
  }

  return options
})

// Entry chart options (independent Y-axis)
const entryChartOptionsWithZoom = computed(() => {
  const options = { ...chartOptions.value }

  // For dual charts, use combined range from both days
  if (isMultiDay.value && intradayData.value.entry.length > 0 && intradayData.value.exit.length > 0) {
    const allData = [...intradayData.value.entry, ...intradayData.value.exit]
    const allLows = allData.map(p => p.low)
    const allHighs = allData.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.02 || 0.10
    options.scales.y.min = minPrice - padding
    options.scales.y.max = maxPrice + padding
  } else if (intradayData.value.entry && intradayData.value.entry.length > 0) {
    const allLows = intradayData.value.entry.map(p => p.low)
    const allHighs = intradayData.value.entry.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.02 || 0.10
    options.scales.y.min = minPrice - padding
    options.scales.y.max = maxPrice + padding
  }

  return options
})

// Exit chart options (independent Y-axis)
const exitChartOptionsWithZoom = computed(() => {
  const options = { ...chartOptions.value }

  // For dual charts, use combined range from both days
  if (intradayData.value.entry.length > 0 && intradayData.value.exit.length > 0) {
    const allData = [...intradayData.value.entry, ...intradayData.value.exit]
    const allLows = allData.map(p => p.low)
    const allHighs = allData.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.02 || 0.10
    options.scales.y.min = minPrice - padding
    options.scales.y.max = maxPrice + padding
  } else if (intradayData.value.exit && intradayData.value.exit.length > 0) {
    const allLows = intradayData.value.exit.map(p => p.low)
    const allHighs = intradayData.value.exit.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.02 || 0.10
    options.scales.y.min = minPrice - padding
    options.scales.y.max = maxPrice + padding
  }

  return options
})

// Load intraday data
async function loadIntradayData() {
  const ticket = currentTicket.value
  if (!ticket) return

  loading.value = true

  try {
    const entryDate = ticket.date
    const entryData = await fetchIntradayPrices(props.symbol, entryDate, props.proxyUrl)

    if (ticket.exit_date && ticket.status !== 'OPEN') {
      const exitDate = ticket.exit_date
      const exitData = await fetchIntradayPrices(props.symbol, exitDate, props.proxyUrl)
      intradayData.value = { entry: entryData, exit: exitData }
    } else {
      intradayData.value = { entry: entryData, exit: [] }
    }
  } catch (error) {
    console.error('Failed to load intraday data:', error)
    intradayData.value = { entry: [], exit: [] }
  } finally {
    loading.value = false
  }
}

// Watch for position changes
watch(() => [props.symbol, props.positions, positionIndex.value], () => {
  loadIntradayData()
}, { immediate: true })
</script>
