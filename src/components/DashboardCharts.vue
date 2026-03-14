<script setup>
import { computed, ref } from 'vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement)

const props = defineProps({
  yearlySummary: {
    type: Object,
    required: true
  },
  fullYearSummary: {
    type: Object,
    default: null
  }
})

const activeTab = ref('cumulative')

const chartColors = {
  green: 'rgba(74, 222, 128, 0.8)',
  greenBg: 'rgba(74, 222, 128, 0.2)',
  red: 'rgba(248, 113, 113, 0.8)',
  redBg: 'rgba(248, 113, 113, 0.2)',
  blue: 'rgba(96, 165, 250, 0.8)',
  blueBg: 'rgba(96, 165, 250, 0.2)',
  gray: 'rgba(107, 114, 128, 0.5)',
  grid: 'rgba(75, 85, 99, 0.3)',
  text: 'rgba(229, 231, 235, 0.8)'
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
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
  const months = summary.allMonthsData.filter(m => m.count > 0)

  return {
    labels: months.map(m => m.name),
    datasets: [{
      label: 'Monthly P&L',
      data: months.map(m => m.pnl),
      backgroundColor: months.map(m => m.pnl >= 0 ? chartColors.green : chartColors.red),
      borderRadius: 4
    }]
  }
})

// Win/Loss Pie Chart Data
const winLossData = computed(() => {
  const wins = props.yearlySummary.allMonthsData.reduce((sum, m) => sum + m.wins, 0)
  const totalTrades = props.yearlySummary.totalTrades
  const losses = totalTrades - wins

  return {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [wins, losses],
      backgroundColor: [chartColors.green, chartColors.red],
      borderWidth: 0,
      hoverOffset: 4
    }]
  }
})

// Strategy Performance Bar Chart Data
const strategyData = computed(() => {
  const strategies = props.yearlySummary.strategyPerformance.slice(0, 6)

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

const tabs = [
  { id: 'cumulative', label: 'Cumulative', icon: 'fa-chart-line' },
  { id: 'monthly', label: 'Monthly', icon: 'fa-chart-bar' },
  { id: 'winloss', label: 'Win/Loss', icon: 'fa-chart-pie' },
  { id: 'strategies', label: 'Strategies', icon: 'fa-list' }
]
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
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
    <div class="flex-1 min-h-0 bg-gray-700/50 rounded p-3">
      <!-- Cumulative P&L Chart -->
      <div v-show="activeTab === 'cumulative'" class="h-full flex flex-col">
        <h4 class="text-xs font-medium text-gray-400 mb-3">Cumulative P&L</h4>
        <div class="flex-1 min-h-0">
          <Line :data="cumulativeData" :options="chartOptions" />
        </div>
      </div>

      <!-- Monthly P&L Bar Chart -->
      <div v-show="activeTab === 'monthly'" class="h-full flex flex-col">
        <h4 class="text-xs font-medium text-gray-400 mb-3">Monthly P&L</h4>
        <div class="flex-1 min-h-0">
          <Bar :data="monthlyData" :options="chartOptions" />
        </div>
      </div>

      <!-- Win/Loss Distribution -->
      <div v-show="activeTab === 'winloss'" class="h-full flex flex-col">
        <h4 class="text-xs font-medium text-gray-400 mb-3">Win/Loss Distribution</h4>
        <div class="flex-1 min-h-0 flex items-center justify-center">
          <div class="w-full max-w-[200px]">
            <Doughnut :data="winLossData" :options="pieOptions" />
          </div>
        </div>
      </div>

      <!-- Strategy Performance -->
      <div v-show="activeTab === 'strategies'" class="h-full flex flex-col">
        <h4 class="text-xs font-medium text-gray-400 mb-3">Strategy Performance</h4>
        <div class="flex-1 min-h-0">
          <Bar :data="strategyData" :options="chartOptions" />
        </div>
      </div>
    </div>
  </div>
</template>
