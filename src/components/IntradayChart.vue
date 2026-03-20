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
            <div class="flex items-center gap-3">
              <!-- Timeframe Selector -->
              <div class="flex gap-1">
                <button
                  v-for="option in TIMEFRAME_OPTIONS"
                  :key="option.value"
                  @click="selectedTimeframe = option.value"
                  class="px-2 py-1 text-xs rounded transition-colors"
                  :class="selectedTimeframe === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
                >
                  {{ option.label }}
                </button>
              </div>
              <!-- Indicator Toggle -->
              <button
                @click="showVWAP = !showVWAP"
                class="px-2 py-1 text-xs rounded transition-colors"
                :class="showVWAP
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
                title="Toggle VWAP"
              >
                VWAP
              </button>
              <div v-if="daysHeld > 0" class="text-gray-500 text-sm">
                <i class="fas fa-clock mr-1"></i>
                {{ daysHeld }} day{{ daysHeld > 1 ? 's' : '' }} held
              </div>
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

      <!-- Multi-day charts: show one at a time with dot navigation -->
      <div v-else>
        <div class="h-96">
          <Bar :data="selectedChartTab === 'entry' ? entryChartData : exitChartData"
               :options="selectedChartTab === 'entry' ? entryChartOptionsWithZoom : exitChartOptionsWithZoom" />
        </div>
        <!-- Dot navigation -->
        <div class="flex justify-center items-center gap-6 mt-4">
          <button
            @click="selectedChartTab = 'entry'"
            class="w-3 h-3 rounded-full transition-all duration-200"
            :class="selectedChartTab === 'entry' ? 'bg-blue-500 scale-125' : 'bg-gray-600 hover:bg-gray-500'"
            :title="`Entry Day: ${formatDateRange(entryDateDisplay)}`"
          ></button>
          <button
            @click="selectedChartTab = 'exit'"
            class="w-3 h-3 rounded-full transition-all duration-200"
            :class="selectedChartTab === 'exit' ? 'bg-blue-500 scale-125' : 'bg-gray-600 hover:bg-gray-500'"
            :title="`Exit Day: ${formatDateRange(exitDateDisplay)}`"
          ></button>
        </div>
        <!-- Chart labels -->
        <div class="flex justify-center items-center gap-8 mt-2 text-xs text-gray-400">
          <span :class="selectedChartTab === 'entry' ? 'text-blue-400 font-medium' : ''">Entry</span>
          <span :class="selectedChartTab === 'exit' ? 'text-blue-400 font-medium' : ''">Exit</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import { fetchIntradayPrices, aggregateToTimeframe } from '../utils/priceFetcher.js'

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
  },
  userId: {
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
const selectedTimeframe = ref('5m')
const showVWAP = ref(false)
const selectedChartTab = ref('entry') // 'entry' or 'exit'

const INDICATORS = [
  { value: 'vwap', label: 'VWAP' }
]

const TIMEFRAME_OPTIONS = [
  { value: '5m', label: '5m', minutes: 5 },
  { value: '15m', label: '15m', minutes: 15 },
  { value: '30m', label: '30m', minutes: 30 },
  { value: '1h', label: '1H', minutes: 60 }
]

// Aggregated data based on selected timeframe
const aggregatedData = computed(() => {
  const option = TIMEFRAME_OPTIONS.find(opt => opt.value === selectedTimeframe.value)
  if (!option || option.minutes === 5) {
    return intradayData.value
  }
  return {
    entry: aggregateToTimeframe(intradayData.value.entry, option.minutes),
    exit: aggregateToTimeframe(intradayData.value.exit, option.minutes)
  }
})

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
  return aggregatedData.value.entry.length > 0 && aggregatedData.value.exit.length > 0 && !isSameDayExit.value
})

// Check if we have data to display
const hasData = computed(() => {
  return aggregatedData.value.entry.length > 0 || aggregatedData.value.exit.length > 0
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

// Calculate VWAP (Volume Weighted Average Price) with standard deviation bands
function calculateVWAP(data) {
  if (!data || data.length === 0) {
    return { vwap: [], upper1: [], lower1: [], upper2: [], lower2: [] }
  }

  const vwapData = []
  const typicalPrices = []
  let cumulativeVolumePrice = 0
  let cumulativeVolume = 0

  // First pass: calculate VWAP
  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3
    typicalPrices.push(typicalPrice)
    const volume = data[i].volume || 0

    cumulativeVolumePrice += typicalPrice * volume
    cumulativeVolume += volume

    if (cumulativeVolume > 0) {
      vwapData.push(cumulativeVolumePrice / cumulativeVolume)
    } else {
      vwapData.push(null)
    }
  }

  // Calculate standard deviation bands
  const upper1Data = []
  const lower1Data = []
  const upper2Data = []
  const lower2Data = []

  for (let i = 0; i < data.length; i++) {
    if (vwapData[i] === null) {
      upper1Data.push(null)
      lower1Data.push(null)
      upper2Data.push(null)
      lower2Data.push(null)
      continue
    }

    // Calculate squared deviations from VWAP up to this point
    let sumSquaredDev = 0
    let sumVolume = 0

    for (let j = 0; j <= i; j++) {
      const volume = data[j].volume || 0
      sumSquaredDev += Math.pow(typicalPrices[j] - vwapData[i], 2) * volume
      sumVolume += volume
    }

    if (sumVolume > 0) {
      const variance = sumSquaredDev / sumVolume
      const stdDev = Math.sqrt(variance)

      upper1Data.push(vwapData[i] + stdDev)
      lower1Data.push(vwapData[i] - stdDev)
      upper2Data.push(vwapData[i] + stdDev * 2)
      lower2Data.push(vwapData[i] - stdDev * 2)
    } else {
      upper1Data.push(null)
      lower1Data.push(null)
      upper2Data.push(null)
      lower2Data.push(null)
    }
  }

  return { vwap: vwapData, upper1: upper1Data, lower1: lower1Data, upper2: upper2Data, lower2: lower2Data }
}

// Build candlestick data
function buildCandlestickData(data, entryTime, exitTime, showEntry, showExit, entryAction, exitAction, includeVWAP = false) {
  if (!data || data.length === 0) {
    return { labels: [], datasets: [] }
  }

  const labels = data.map(point => {
    const date = new Date(point.time)
    // Format time in Eastern Time (America/New_York)
    const options = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }
    return date.toLocaleTimeString('en-US', options)
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

  // Volume data with colors matching candlesticks
  const volumeData = data.map(point => point.volume || 0)
  const volumeColors = data.map(point => {
    const alpha = 0.3
    if (point.close >= point.open) {
      return `rgba(16, 185, 129, ${alpha})` // Green with opacity
    } else {
      return `rgba(239, 68, 68, ${alpha})` // Red with opacity
    }
  })

  const datasets = [
    {
      type: 'bar',
      label: 'Wicks',
      data: wicksData,
      backgroundColor: bodyColors,
      barPercentage: 0.05,
      categoryPercentage: 1.0,
      order: 1,
      yAxisID: 'y'
    },
    {
      type: 'bar',
      label: 'Price',
      data: bodiesData,
      backgroundColor: bodyColors,
      borderColor: bodyBorderColors,
      borderWidth: 1,
      barPercentage: 0.8,
      categoryPercentage: 1.0,
      order: 2,
      yAxisID: 'y'
    },
    {
      type: 'bar',
      label: 'Volume',
      data: volumeData,
      backgroundColor: volumeColors,
      barPercentage: 0.8,
      categoryPercentage: 1.0,
      order: 3,
      yAxisID: 'y1'
    }
  ]

  // Add VWAP 2SD line if enabled
  if (includeVWAP) {
    const vwapResult = calculateVWAP(data)

    datasets.push({
      type: 'line',
      label: 'VWAP ±2SD',
      data: vwapResult.vwap,
      borderColor: '#FBBF24',
      backgroundColor: 'transparent',
      borderWidth: 1,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHitRadius: 10,
      fill: false,
      tension: 0.1,
      order: 0,
      yAxisID: 'y'
    })

    datasets.push({
      type: 'line',
      label: 'VWAP +2SD',
      data: vwapResult.upper2,
      borderColor: '#22C55E',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      tension: 0.1,
      order: 0,
      yAxisID: 'y',
      interaction: {
        mode: 'none',
        intersect: false
      }
    })

    datasets.push({
      type: 'line',
      label: 'VWAP -2SD',
      data: vwapResult.lower2,
      borderColor: '#EF4444',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      tension: 0.1,
      order: 0,
      yAxisID: 'y',
      interaction: {
        mode: 'none',
        intersect: false
      }
    })
  }

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
        backgroundColor: '#00FFFF',
        borderColor: '#00CCCC',
        pointStyle: 'circle',
        pointRadius: 8,
        pointHoverRadius: 10,
        type: 'scatter',
        order: 0,
        yAxisID: 'y'
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
        backgroundColor: '#FF1493',
        borderColor: '#CC1177',
        pointStyle: 'circle',
        pointRadius: 8,
        pointHoverRadius: 10,
        type: 'scatter',
        order: 0,
        yAxisID: 'y'
      })
    }
  }

  return { labels, datasets }
}

// Entry day chart data
const entryChartData = computed(() => {
  const data = aggregatedData.value
  if (!data.entry || data.entry.length === 0) {
    return { labels: [], datasets: [] }
  }

  const ticket = currentTicket.value
  if (!ticket) return { labels: [], datasets: [] }

  const entryTime = parseEntryTime(ticket)
  const exitTime = isSameDayExit.value ? parseExitTime(ticket) : null
  const entryAction = ticket.strategies?.[0]?.legs?.[0]?.action || 'buy'

  return buildCandlestickData(data.entry, entryTime, exitTime, props.showEntry, isSameDayExit.value, entryAction, null, showVWAP.value)
})

// Exit day chart data
const exitChartData = computed(() => {
  const data = aggregatedData.value
  if (!data.exit || data.exit.length === 0 || isSameDayExit.value) {
    return { labels: [], datasets: [] }
  }

  const ticket = currentTicket.value
  if (!ticket) return { labels: [], datasets: [] }

  const entryAction = ticket.strategies?.[0]?.legs?.[0]?.action || 'buy'
  const exitAction = entryAction === 'buy' ? 'sell' : 'buy'
  const exitTime = parseExitTime(ticket)

  return buildCandlestickData(data.exit, null, exitTime, false, props.showExit, entryAction, exitAction, showVWAP.value)
})

// Single chart data (for same-day or entry-only)
const chartData = computed(() => {
  const data = aggregatedData.value
  if (!data.entry || data.entry.length === 0) {
    return { labels: [], datasets: [] }
  }

  const ticket = currentTicket.value
  if (!ticket) return { labels: [], datasets: [] }

  const entryTime = parseEntryTime(ticket)
  const exitTime = isSameDayExit.value ? parseExitTime(ticket) : null
  const entryAction = ticket.strategies?.[0]?.legs?.[0]?.action || 'buy'
  const exitAction = entryAction === 'buy' ? 'sell' : 'buy'

  return buildCandlestickData(data.entry, entryTime, exitTime, props.showEntry, isSameDayExit.value && props.showExit, entryAction, exitAction, showVWAP.value)
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
          // Only show tooltip for the dataset actually being hovered
          if (context.dataset.label === 'Entry') {
            const ticket = currentTicket.value
            if (ticket) {
              const strategyName = ticket.strategies?.[0]?.name || ticket.symbol
              return [
                `🟢 ENTRY POSITION`,
                `Price: $${context.raw.toFixed(2)}`,
                `Ticket #${ticket.ticket} - ${strategyName}`
              ]
            }
          }
          if (context.dataset.label === 'Exit') {
            const ticket = currentTicket.value
            if (ticket) {
              return [
                `🔴 EXIT POSITION`,
                `Price: $${context.raw.toFixed(2)}`,
                ticket.status !== 'OPEN' ? `P&L: ${ticket.pnl >= 0 ? '+' : ''}$${ticket.pnl.toFixed(2)}` : null
              ].filter(Boolean)
            }
          }
          if (context.dataset.label === 'Volume') {
            const volume = context.raw
            let volumeStr = volume.toLocaleString()
            if (volume >= 1000000) {
              volumeStr = (volume / 1000000).toFixed(2) + 'M'
            } else if (volume >= 1000) {
              volumeStr = (volume / 1000).toFixed(0) + 'K'
            }
            return `Volume: ${volumeStr}`
          }
          if (context.dataset.label === 'VWAP ±2SD' && context.raw != null) {
            return `VWAP: $${context.raw.toFixed(2)}`
          }
          return null
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { color: 'rgba(75, 85, 99, 0.3)', drawBorder: false },
      ticks: { color: 'rgba(229, 231, 235, 0.8)', font: { size: 10 }, maxTicksLimit: 8 }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      grid: { color: 'rgba(75, 85, 99, 0.3)', drawBorder: false },
      ticks: {
        color: 'rgba(229, 231, 235, 0.8)',
        font: { size: 10 },
        callback: (value) => '$' + value.toFixed(2)
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      grid: { display: false },
      ticks: {
        color: 'rgba(229, 231, 235, 0.6)',
        font: { size: 9 },
        callback: (value) => {
          if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
          if (value >= 1000) return (value / 1000).toFixed(0) + 'K'
          return value
        }
      }
    }
  },
  interaction: { mode: 'nearest', intersect: true }
}))

// Dynamic Y-axis zoom
const chartOptionsWithZoom = computed(() => {
  const data = aggregatedData.value

  if (!data.entry || data.entry.length === 0) {
    return chartOptions.value
  }

  const allLows = data.entry.map(p => p.low)
  const allHighs = data.entry.map(p => p.high)
  const minPrice = Math.min(...allLows)
  const maxPrice = Math.max(...allHighs)
  const range = maxPrice - minPrice
  const padding = range * 0.01 || 0.05

  // Calculate volume max and set y1 axis to make bars only 20% tall
  const allVolumes = data.entry.map(p => p.volume || 0)
  const maxVolume = Math.max(...allVolumes)
  const volumeY1Max = maxVolume * 5 // 5x so bars are only 20% of height

  return {
    ...chartOptions.value,
    scales: {
      ...chartOptions.value.scales,
      x: {
        ...chartOptions.value.scales.x,
        stacked: true
      },
      y: {
        ...chartOptions.value.scales.y,
        min: minPrice - padding,
        max: maxPrice + padding,
        beginAtZero: false
      },
      y1: {
        ...chartOptions.value.scales.y1,
        max: volumeY1Max
      }
    }
  }
})

// Entry chart options (independent Y-axis)
const entryChartOptionsWithZoom = computed(() => {
  const data = aggregatedData.value

  // For dual charts, use combined range from both days
  if (isMultiDay.value && data.entry.length > 0 && data.exit.length > 0) {
    const allData = [...data.entry, ...data.exit]
    const allLows = allData.map(p => p.low)
    const allHighs = allData.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.01 || 0.05

    // Calculate volume max for y1 axis
    const allVolumes = allData.map(p => p.volume || 0)
    const maxVolume = Math.max(...allVolumes)
    const volumeY1Max = maxVolume * 5

    return {
      ...chartOptions.value,
      scales: {
        ...chartOptions.value.scales,
        x: {
          ...chartOptions.value.scales.x,
          stacked: true
        },
        y: {
          ...chartOptions.value.scales.y,
          min: minPrice - padding,
          max: maxPrice + padding,
          beginAtZero: false
        },
        y1: {
          ...chartOptions.value.scales.y1,
          max: volumeY1Max
        }
      }
    }
  } else if (data.entry && data.entry.length > 0) {
    const allLows = data.entry.map(p => p.low)
    const allHighs = data.entry.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.01 || 0.05

    // Calculate volume max for y1 axis
    const allVolumes = data.entry.map(p => p.volume || 0)
    const maxVolume = Math.max(...allVolumes)
    const volumeY1Max = maxVolume * 5

    return {
      ...chartOptions.value,
      scales: {
        ...chartOptions.value.scales,
        x: {
          ...chartOptions.value.scales.x,
          stacked: true
        },
        y: {
          ...chartOptions.value.scales.y,
          min: minPrice - padding,
          max: maxPrice + padding,
          beginAtZero: false
        },
        y1: {
          ...chartOptions.value.scales.y1,
          max: volumeY1Max
        }
      }
    }
  }

  return chartOptions.value
})

// Exit chart options (independent Y-axis)
const exitChartOptionsWithZoom = computed(() => {
  const data = aggregatedData.value

  // For dual charts, use combined range from both days
  if (data.entry.length > 0 && data.exit.length > 0) {
    const allData = [...data.entry, ...data.exit]
    const allLows = allData.map(p => p.low)
    const allHighs = allData.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.01 || 0.05

    // Calculate volume max for y1 axis
    const allVolumes = allData.map(p => p.volume || 0)
    const maxVolume = Math.max(...allVolumes)
    const volumeY1Max = maxVolume * 5

    return {
      ...chartOptions.value,
      scales: {
        ...chartOptions.value.scales,
        x: {
          ...chartOptions.value.scales.x,
          stacked: true
        },
        y: {
          ...chartOptions.value.scales.y,
          min: minPrice - padding,
          max: maxPrice + padding,
          beginAtZero: false
        },
        y1: {
          ...chartOptions.value.scales.y1,
          max: volumeY1Max
        }
      }
    }
  } else if (data.exit && data.exit.length > 0) {
    const allLows = data.exit.map(p => p.low)
    const allHighs = data.exit.map(p => p.high)
    const minPrice = Math.min(...allLows)
    const maxPrice = Math.max(...allHighs)
    const range = maxPrice - minPrice
    const padding = range * 0.01 || 0.05

    // Calculate volume max for y1 axis
    const allVolumes = data.exit.map(p => p.volume || 0)
    const maxVolume = Math.max(...allVolumes)
    const volumeY1Max = maxVolume * 5

    return {
      ...chartOptions.value,
      scales: {
        ...chartOptions.value.scales,
        x: {
          ...chartOptions.value.scales.x,
          stacked: true
        },
        y: {
          ...chartOptions.value.scales.y,
          min: minPrice - padding,
          max: maxPrice + padding,
          beginAtZero: false
        },
        y1: {
          ...chartOptions.value.scales.y1,
          max: volumeY1Max
        }
      }
    }
  }

  return chartOptions.value
})

// Load intraday data
async function loadIntradayData() {
  const ticket = currentTicket.value
  if (!ticket) return

  loading.value = true

  try {
    const entryDate = ticket.date
    const entryData = await fetchIntradayPrices(props.symbol, entryDate, props.proxyUrl, props.userId)

    if (ticket.exit_date && ticket.status !== 'OPEN') {
      const exitDate = ticket.exit_date
      const exitData = await fetchIntradayPrices(props.symbol, exitDate, props.proxyUrl, props.userId)
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
  selectedChartTab.value = 'entry' // Reset to entry chart when position changes
  loadIntradayData()
}, { immediate: true })
</script>
