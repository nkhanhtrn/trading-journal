<script setup>
import { computed, ref } from 'vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, LineController, BarController } from 'chart.js'
import { detectStrategy, getStrategyDisplayName } from '../utils/strategyDetector.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, LineController, BarController)

const props = defineProps({
  yearlySummary: {
    type: Object,
    required: true
  },
  fullYearSummary: {
    type: Object,
    default: null
  },
  tickets: {
    type: Array,
    default: () => []
  },
  allTickets: {
    type: Array,
    default: () => []
  },
  selectedDate: {
    type: String,
    default: null
  }
})

const activeTab = ref('monthly')

const chartColors = {
  green: 'rgba(74, 222, 128, 0.8)',
  greenBg: 'rgba(74, 222, 128, 0.2)',
  red: 'rgba(248, 113, 113, 0.8)',
  redBg: 'rgba(248, 113, 113, 0.2)',
  blue: 'rgba(96, 165, 250, 0.8)',
  blueBg: 'rgba(96, 165, 250, 0.2)',
  cyan: 'rgba(34, 211, 238, 1)',
  cyanBg: 'rgba(34, 211, 238, 0.1)',
  purple: 'rgba(168, 85, 247, 0.8)',
  orange: 'rgba(251, 146, 60, 0.8)',
  gray: 'rgba(107, 114, 128, 0.5)',
  grid: 'rgba(75, 85, 99, 0.3)',
  text: 'rgba(229, 231, 235, 0.8)'
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: 0
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
      displayColors: true,
      callbacks: {
        label: function(context) {
          return context.dataset.label + ': ' + (context.raw >= 0 ? '+' : '') + '$' + context.raw.toFixed(0)
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 }
      }
    },
    y: {
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 },
        callback: function(value) {
          return '$' + value.toFixed(0)
        }
      }
    }
  }
}

// Chart options for positions (count instead of currency)
const positionsOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: 0
  },
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: chartColors.text,
        font: { size: 10 },
        padding: 8,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(75, 85, 99, 0.5)',
      borderWidth: 1,
      padding: 10,
      displayColors: true,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || ''
          if (label) {
            label += ': '
          }
          if (context.dataset.label === 'Win Rate %') {
            label += context.raw.toFixed(1) + '%'
          } else {
            label += context.raw
          }
          return label
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 }
      }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      beginAtZero: true,
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 },
        stepSize: 1,
        precision: 0
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      beginAtZero: true,
      max: 100,
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 },
        callback: function(value) {
          return value + '%'
        }
      }
    }
  }
}

// Chart options for win rate (duration in hours)
const winRateOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: 0
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: chartColors.text,
        font: { size: 11 },
        padding: 8,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(75, 85, 99, 0.5)',
      borderWidth: 1,
      padding: 10,
      displayColors: true,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || ''
          if (label) {
            label += ': '
          }
          const hours = context.raw
          if (hours < 1) {
            const minutes = Math.round(hours * 60)
            label += minutes + 'min'
          } else if (hours < 24) {
            label += hours.toFixed(1) + 'h'
          } else {
            label += (hours / 24).toFixed(1) + 'd'
          }
          return label
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 11 }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 },
        callback: function(value) {
          if (value < 1) {
            return Math.round(value * 60) + 'm'
          } else if (value < 24) {
            return value.toFixed(0) + 'h'
          } else {
            return (value / 24).toFixed(1) + 'd'
          }
        }
      }
    }
  }
}

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: chartColors.text,
        font: { size: 11 },
        padding: 8,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      bodyColor: '#fff',
      borderColor: 'rgba(75, 85, 99, 0.5)',
      borderWidth: 1,
      padding: 10
    }
  }
}

// Cumulative P&L Chart Data (always uses full year data)
const cumulativeData = computed(() => {
  // Use fullYearSummary if available, otherwise fall back to yearlySummary
  const summary = props.fullYearSummary || props.yearlySummary
  const months = summary.allMonthsData
  let cumulative = 0
  const data = months.map(m => {
    cumulative += m.pnl
    return cumulative
  })

  return {
    labels: months.map(m => m.name),
    datasets: [{
      label: 'Cumulative P&L',
      data: data,
      borderColor: data[data.length - 1] >= 0 ? chartColors.green : chartColors.red,
      backgroundColor: data[data.length - 1] >= 0 ? chartColors.greenBg : chartColors.redBg,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5
    }]
  }
})

// Monthly P&L Bar Chart Data (always uses full year data)
const monthlyData = computed(() => {
  // Use fullYearSummary if available, otherwise fall back to yearlySummary
  const summary = props.fullYearSummary || props.yearlySummary
  const months = summary.allMonthsData // Show all 12 months

  // Calculate cumulative P&L for line overlay
  let cumulative = 0
  const cumulativeData = months.map(m => {
    cumulative += m.pnl
    return cumulative
  })

  return {
    labels: months.map(m => m.name),
    datasets: [
      {
        type: 'bar',
        label: 'Monthly P&L',
        data: months.map(m => m.pnl),
        backgroundColor: months.map(m => m.pnl >= 0 ? chartColors.green : chartColors.red),
        borderRadius: 4,
        order: 2
      },
      {
        type: 'line',
        label: 'Cumulative',
        data: cumulativeData,
        borderColor: chartColors.cyan,
        backgroundColor: chartColors.cyanBg,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 1
      }
    ]
  }
})

// Win/Loss Bar Chart Data - breakdown by day for selected week
const winLossData = computed(() => {
  // Use selectedDate to determine the week, default to today if not set
  const referenceDate = props.selectedDate ? new Date(props.selectedDate + 'T00:00:00Z') : new Date()

  // Get the Monday (start) of the week for the reference date (using UTC)
  const dayOfWeek = referenceDate.getUTCDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  // Create Monday at midnight UTC
  const monday = new Date(referenceDate)
  monday.setUTCDate(referenceDate.getUTCDate() + daysToMonday)
  monday.setUTCHours(0, 0, 0, 0)

  // Get the Saturday (end) of the week for exclusive upper bound
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)

  // Group new and closing positions by day
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const newByDay = new Map()
  const closingByDay = new Map()
  dayNames.forEach(day => {
    newByDay.set(day, 0)
    closingByDay.set(day, 0)
  })

  props.allTickets.forEach(ticket => {
    // Count new positions (by entry date)
    if (ticket.date) {
      const entryDate = new Date(ticket.date + 'T00:00:00Z')
      if (entryDate >= monday && entryDate < saturday) {
        const dayOfWeek = entryDate.getUTCDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayName = dayNames[dayOfWeek - 1]
          newByDay.set(dayName, newByDay.get(dayName) + 1)
        }
      }
    }

    // Count closing positions (by exit date)
    if (ticket.exit_date && ticket.status !== 'OPEN') {
      const exitDate = new Date(ticket.exit_date + 'T00:00:00Z')
      if (exitDate >= monday && exitDate < saturday) {
        const dayOfWeek = exitDate.getUTCDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayName = dayNames[dayOfWeek - 1]
          closingByDay.set(dayName, closingByDay.get(dayName) + 1)
        }
      }
    }
  })

  return {
    labels: dayNames,
    datasets: [
      {
        label: 'New',
        data: dayNames.map(day => newByDay.get(day)),
        backgroundColor: chartColors.purple,
        borderRadius: 4
      },
      {
        label: 'Closing',
        data: dayNames.map(day => closingByDay.get(day)),
        backgroundColor: chartColors.orange,
        borderRadius: 4
      }
    ]
  }
})

// Strategy Performance Bar Chart Data - for selected week
const strategyData = computed(() => {
  // Use selectedDate to determine the week, default to today if not set
  const referenceDate = props.selectedDate ? new Date(props.selectedDate + 'T00:00:00Z') : new Date()

  // Get the Monday (start) of the week for the reference date (using UTC)
  const dayOfWeek = referenceDate.getUTCDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  // Create Monday at midnight UTC
  const monday = new Date(referenceDate)
  monday.setUTCDate(referenceDate.getUTCDate() + daysToMonday)
  monday.setUTCHours(0, 0, 0, 0)

  // Get the Saturday (end) of the week for exclusive upper bound
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)

  // Group trades by strategy for the week
  const strategiesByPnL = new Map()

  props.allTickets.forEach(ticket => {
    if (ticket.exit_date && ticket.status !== 'OPEN') {
      const exitDate = new Date(ticket.exit_date + 'T00:00:00Z')

      // Check if this trade falls within the week
      if (exitDate >= monday && exitDate < saturday) {
        // Get strategy name
        const legs = ticket.strategies?.[0]?.legs || []
        const detectedStrategy = detectStrategy(legs)
        const strategyName = getStrategyDisplayName(detectedStrategy)

        // Accumulate P&L by strategy
        if (!strategiesByPnL.has(strategyName)) {
          strategiesByPnL.set(strategyName, 0)
        }
        strategiesByPnL.set(strategyName, strategiesByPnL.get(strategyName) + (ticket.pnl || 0))
      }
    }
  })

  // Convert to array and sort by P&L
  const strategies = Array.from(strategiesByPnL.entries())
    .map(([strategy, totalPnL]) => ({ strategy, totalPnL }))
    .sort((a, b) => b.totalPnL - a.totalPnL)

  return {
    labels: strategies.map(s => s.strategy.length > 10 ? s.strategy.substring(0, 10) + '...' : s.strategy),
    datasets: [{
      label: 'P&L',
      data: strategies.map(s => s.totalPnL),
      backgroundColor: strategies.map(s => s.totalPnL >= 0 ? chartColors.green : chartColors.red),
      borderRadius: 4
    }]
  }
})

// Win Rate Data - trade duration by outcome per day (how fast you close losers vs hold winners)
const winRateData = computed(() => {
  // Use selectedDate to determine the week, default to today if not set
  const referenceDate = props.selectedDate ? new Date(props.selectedDate + 'T00:00:00Z') : new Date()

  // Get the Monday (start) of the week for the reference date (using UTC)
  const dayOfWeek = referenceDate.getUTCDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  // Create Monday at midnight UTC
  const monday = new Date(referenceDate)
  monday.setUTCDate(referenceDate.getUTCDate() + daysToMonday)
  monday.setUTCHours(0, 0, 0, 0)

  // Get the Saturday (end) of the week for exclusive upper bound
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)

  // Group trade durations by day and outcome
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const winDurationsByDay = new Map()
  const lossDurationsByDay = new Map()
  dayNames.forEach(day => {
    winDurationsByDay.set(day, [])
    lossDurationsByDay.set(day, [])
  })

  props.allTickets.forEach(ticket => {
    if (ticket.exit_date && ticket.date && ticket.status !== 'OPEN') {
      const exitDate = new Date(ticket.exit_date + 'T00:00:00Z')
      if (exitDate >= monday && exitDate < saturday) {
        const entryDate = new Date(ticket.date + 'T00:00:00Z')
        const durationHours = (exitDate - entryDate) / (1000 * 60 * 60)
        const dayOfWeek = exitDate.getUTCDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayName = dayNames[dayOfWeek - 1]
          if (ticket.status === 'WIN') {
            winDurationsByDay.get(dayName).push(durationHours)
          } else if (ticket.status === 'LOSS') {
            lossDurationsByDay.get(dayName).push(durationHours)
          }
        }
      }
    }
  })

  // Calculate average durations for each day
  const avgWinDurations = dayNames.map(day => {
    const durations = winDurationsByDay.get(day)
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
  })

  const avgLossDurations = dayNames.map(day => {
    const durations = lossDurationsByDay.get(day)
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
  })

  return {
    labels: dayNames,
    datasets: [
      {
        type: 'line',
        label: 'Winners',
        data: avgWinDurations,
        borderColor: chartColors.green,
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: false
      },
      {
        type: 'line',
        label: 'Losers',
        data: avgLossDurations,
        borderColor: chartColors.red,
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: false
      }
    ]
  }
})

// Trade Frequency Data - trades by day of week for the selected date's week
const frequencyData = computed(() => {
  // Use selectedDate to determine the week, default to today if not set
  // Parse as UTC to avoid timezone issues
  const referenceDate = props.selectedDate ? new Date(props.selectedDate + 'T00:00:00Z') : new Date()

  // Get the Monday (start) of the week for the reference date (using UTC)
  const dayOfWeek = referenceDate.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  // Create Monday at midnight UTC
  const monday = new Date(referenceDate)
  monday.setUTCDate(referenceDate.getUTCDate() + daysToMonday)
  monday.setUTCHours(0, 0, 0, 0)

  // Get the Saturday (end) of the week for exclusive upper bound
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)

  // Group tickets by day of week for this week
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const tradesByDay = new Map()
  const contractsByDay = new Map()
  const volumeByDay = new Map()
  dayNames.forEach(day => {
    tradesByDay.set(day, 0)
    contractsByDay.set(day, 0)
    volumeByDay.set(day, 0)
  })

  // Check all tickets (not just filtered) to get the full week's trades
  props.allTickets.forEach(ticket => {
    if (ticket.exit_date && ticket.status !== 'OPEN') {
      // Parse exit date as UTC
      const exitDate = new Date(ticket.exit_date + 'T00:00:00Z')

      // Check if this trade falls within the week (Monday 00:00:00 to Saturday 00:00:00 exclusive)
      if (exitDate >= monday && exitDate < saturday) {
        const dayOfWeek = exitDate.getUTCDay() // 1 = Mon, 2 = Tue, etc.
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayName = dayNames[dayOfWeek - 1]

          // Count trades
          tradesByDay.set(dayName, tradesByDay.get(dayName) + 1)

          // Get legs for this trade
          const legs = ticket.strategies?.[0]?.legs || []

          // Calculate contracts - use max quantity across legs (for spreads, count the position size not total legs)
          const totalContracts = legs.length > 0 ? Math.max(...legs.map(leg => leg.quantity || 1)) : 1
          contractsByDay.set(dayName, contractsByDay.get(dayName) + totalContracts)

          // Calculate dollar value from legs (sum of absolute premiums * quantity)
          const dollarValue = legs.reduce((sum, leg) => {
            const premium = leg.premium || 0
            const quantity = leg.quantity || 1
            return sum + (Math.abs(premium) * quantity)
          }, 0)
          volumeByDay.set(dayName, volumeByDay.get(dayName) + dollarValue)
        }
      }
    }
  })

  return {
    labels: dayNames,
    datasets: [
      {
        type: 'bar',
        label: 'Volume ($)',
        data: dayNames.map(day => volumeByDay.get(day)),
        backgroundColor: chartColors.cyan,
        borderRadius: 4,
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: 'Contracts',
        data: dayNames.map(day => contractsByDay.get(day)),
        backgroundColor: chartColors.blue,
        borderRadius: 4,
        yAxisID: 'y1'
      },
      {
        type: 'line',
        label: 'Trades',
        data: dayNames.map(day => tradesByDay.get(day)),
        borderColor: chartColors.green,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        yAxisID: 'y2'
      }
    ]
  }
})

// Chart options for frequency (count instead of currency)
const frequencyOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: 0
  },
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: chartColors.text,
        font: { size: 10 },
        padding: 8,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(75, 85, 99, 0.5)',
      borderWidth: 1,
      padding: 10,
      displayColors: true,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || ''
          if (label) {
            label += ': '
          }
          if (context.dataset.label === 'Volume ($)') {
            label += '$' + context.raw.toFixed(0)
          } else if (context.dataset.label === 'Contracts') {
            label += context.raw + ' contracts'
          } else {
            label += context.raw + ' trade' + (context.raw > 1 ? 's' : '')
          }
          return label
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 }
      }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      beginAtZero: true,
      grid: {
        color: chartColors.grid,
        drawBorder: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 },
        callback: function(value) {
          return '$' + value.toFixed(0)
        }
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      beginAtZero: true,
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        color: chartColors.text,
        font: { size: 10 }
      }
    },
    y2: {
      type: 'linear',
      display: false,
      beginAtZero: true,
      min: 0,
      max: 10,
      grid: {
        drawOnChartArea: false
      }
    }
  }
}))

const tabs = [
  { id: 'monthly', label: 'Monthly', icon: 'fa-chart-bar' },
  { id: 'frequency', label: 'Frequency', icon: 'fa-chart-simple' },
  { id: 'winloss', label: 'Positions', icon: 'fa-chart-pie' }
]
</script>

<template>
  <div class="flex flex-col h-full min-h-0 min-w-0">
    <!-- Tabs Header -->
    <div class="flex gap-1 mb-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'flex-1 py-2 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1',
          activeTab === tab.id
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
        ]"
        :title="tab.label"
      >
        <i :class="['fas', tab.icon]"></i>
        <span class="hidden sm:inline">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Chart Content Area -->
    <div class="flex-1 min-h-0 min-w-0 bg-gray-700/50 rounded p-3">
      <!-- Monthly P&L Bar Chart -->
      <div v-show="activeTab === 'monthly'" class="h-full flex flex-col min-w-0">
        <h4 class="text-xs font-medium text-gray-400 mb-3">Monthly P&L</h4>
        <div class="flex-1 min-h-0 min-w-0 overflow-hidden">
          <Bar :data="monthlyData" :options="chartOptions" />
        </div>
      </div>

      <!-- Trade Frequency Chart -->
      <div v-show="activeTab === 'frequency'" class="h-full flex flex-col min-w-0">
        <h4 class="text-xs font-medium text-gray-400 mb-3">This Week</h4>
        <div class="flex-1 min-h-0 min-w-0 overflow-hidden">
          <Bar :data="frequencyData" :options="frequencyOptions" />
        </div>
      </div>

      <!-- Win/Loss Distribution -->
      <div v-show="activeTab === 'winloss'" class="h-full flex flex-col min-w-0">
        <h4 class="text-xs font-medium text-gray-400 mb-3">Positions (This Week)</h4>
        <div class="flex-1 min-h-0 min-w-0 overflow-hidden">
          <Bar :data="winLossData" :options="positionsOptions" />
        </div>
      </div>
    </div>
  </div>
</template>
