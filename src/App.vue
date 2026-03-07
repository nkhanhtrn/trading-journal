<template>
  <div class="min-h-screen bg-gray-900 flex flex-col">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-bold text-white">📊 Options Journal</h1>
        <button @click="showAddModal = true" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">+ Add Trade</button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-6xl mx-auto px-4 py-6 pb-24 overflow-auto">
      <!-- Calendar Tab -->
      <div v-if="activeTab === 'calendar'">
        <SummaryCards :summary="displayStats" />

        <!-- Calendar -->
        <div class="bg-gray-800 rounded-lg p-4">
          <!-- Month Navigation & Quick Filters -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <button @click="prevMonth" class="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">
                <i class="fas fa-chevron-left"></i>
              </button>
              <h2 class="text-lg font-semibold text-white">{{ formatMonth(currentMonth) }}</h2>
              <button @click="nextMonth" class="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
            <div class="flex gap-1">
              <button @click="selectThisWeek" class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">This Week</button>
              <button @click="selectThisMonth" class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">This Month</button>
              <button @click="selectAllTime" class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">All Time</button>
            </div>
          </div>

          <!-- Date Range Picker -->
          <div v-if="dateRange.mode === 'range'" class="mb-3 p-2 bg-gray-700 rounded flex items-center gap-2 text-sm">
            <span class="text-gray-400">From:</span>
            <input v-model="dateRange.start" type="date" class="bg-gray-600 text-white px-2 py-1 rounded border border-gray-500 text-xs">
            <span class="text-gray-400">To:</span>
            <input v-model="dateRange.end" type="date" class="bg-gray-600 text-white px-2 py-1 rounded border border-gray-500 text-xs">
            <button @click="clearDateRange" class="text-gray-400 hover:text-white ml-auto">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Calendar Grid -->
          <div class="grid grid-cols-7 gap-1">
            <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="text-center text-xs text-gray-500 py-2">
              {{ day }}
            </div>
            <div
              v-for="day in calendarDays"
              :key="day.date"
              @click="selectDate(day.date)"
              :class="[
                'p-2 text-center rounded cursor-pointer text-sm transition-colors min-h-16',
                !day.date ? 'pointer-events-none' : '',
                day.pnl === 0 ? 'text-gray-600' : '',
                day.pnl > 0 ? 'bg-green-900 hover:bg-green-800 text-green-300' : '',
                day.pnl < 0 ? 'bg-red-900 hover:bg-red-800 text-red-300' : '',
                isDateInRange(day.date) ? 'ring-2 ring-blue-500' : ''
              ]"
            >
              <div v-if="day.date" class="font-semibold">{{ day.dayOfMonth }}</div>
              <div v-if="day.date && day.pnl !== 0" class="text-xs font-bold mt-1">
                {{ day.pnl >= 0 ? '+' : '' }}${{ day.pnl }}
              </div>
            </div>
          </div>

          <!-- Selection Info -->
          <div v-if="dateRange.mode" class="mt-4 flex items-center justify-between px-4 py-2 bg-gray-700/50 rounded-lg">
            <p class="text-sm text-gray-300">
              <i class="fas fa-filter mr-2 text-blue-400"></i>
              <span v-if="dateRange.mode === 'single'">{{ dateRange.single }}</span>
              <span v-if="dateRange.mode === 'week'">This Week</span>
              <span v-if="dateRange.mode === 'month'">{{ formatMonth(currentMonth) }}</span>
              <span v-if="dateRange.mode === 'range'">{{ dateRange.start }} → {{ dateRange.end }}</span>
              <span v-if="dateRange.mode === 'all'">All Time</span>
            </p>
            <button @click="clearDateRange" class="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded transition-colors">
              <i class="fas fa-times mr-1"></i> Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Trades Tab -->
      <div v-if="activeTab === 'trades'">
        <!-- Filters -->
        <div class="bg-gray-800 rounded-lg p-3 mb-6 flex gap-3 flex-wrap items-center">
          <input v-model="filters.symbol" type="text" placeholder="Search symbol..." class="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm flex-1 min-w-40">
          <select v-model="filters.status" class="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm">
            <option value="">All Status</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
          </select>
          <select v-model="sortBy" class="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm">
            <option value="ticket">Ticket #</option>
            <option value="pnl_high">P&L ↓</option>
            <option value="pnl_low">P&L ↑</option>
            <option value="date">Date</option>
          </select>
          <button @click="resetFilters" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">Clear</button>
        </div>

        <!-- P&L Summary -->
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-300">
              <i class="fas fa-chart-pie mr-2"></i>
              <span v-if="dateRange.mode">P&L Summary</span>
              <span v-else>Overall P&L Summary</span>
            </h3>
            <div class="text-xs text-gray-500">{{ filteredSummary.count }} tickets</div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold" :class="filteredSummary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ filteredSummary.totalPnL >= 0 ? '+' : '' }}${{ filteredSummary.totalPnL.toFixed(0) }}
              </div>
              <div class="text-xs text-gray-400 mt-1">Total P&L</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-400">{{ filteredSummary.winRate }}%</div>
              <div class="text-xs text-gray-400 mt-1">Win Rate</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-400">${{ filteredSummary.avgPnL >= 0 ? '+' : '' }}{{ filteredSummary.avgPnL.toFixed(0) }}</div>
              <div class="text-xs text-gray-400 mt-1">Avg P&L</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-400">${{ filteredSummary.bestTrade >= 0 ? '+' : '' }}{{ filteredSummary.bestTrade.toFixed(0) }}</div>
              <div class="text-xs text-gray-400 mt-1">Best Trade</div>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
            <div>
              <span class="text-xs text-gray-500">Wins</span>
              <span class="ml-2 text-sm font-semibold text-green-400">{{ filteredSummary.wins }}</span>
            </div>
            <div>
              <span class="text-xs text-gray-500">Losses</span>
              <span class="ml-2 text-sm font-semibold text-red-400">{{ filteredSummary.losses }}</span>
            </div>
            <div>
              <span class="text-xs text-gray-500">Profit Factor</span>
              <span class="ml-2 text-sm font-semibold text-blue-400">{{ filteredSummary.profitFactor.toFixed(1) }}x</span>
            </div>
          </div>
        </div>

        <!-- Tickets List -->
        <div class="space-y-4">
          <div v-for="ticket in filteredTickets" :key="ticket.ticket" class="bg-gray-800 rounded-lg overflow-hidden">
            <!-- Ticket Header -->
            <div class="bg-gray-750 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-700" @click="toggleTicket(ticket.ticket)">
              <div class="flex items-center gap-4">
                <span class="text-sm font-mono text-blue-400">#{{ ticket.ticket }}</span>
                <span class="text-lg font-bold text-white">{{ ticket.symbol }}</span>
                <span class="text-sm text-gray-400">{{ ticket.date }}</span>
                <span class="text-xs text-gray-500">{{ ticket.strategies.length }} strategies</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="px-2 py-1 text-xs rounded" :class="getStatusClass(ticket.status)">{{ ticket.status }}</span>
                <i class="fas fa-chevron-down text-gray-400 transition-transform" :class="{ 'rotate-180': expandedTickets.has(ticket.ticket) }"></i>
              </div>
            </div>

            <!-- Strategies -->
            <div v-show="expandedTickets.has(ticket.ticket)" class="border-t border-gray-700">
              <div v-for="(strategy, sIndex) in ticket.strategies" :key="sIndex" class="border-b border-gray-700 last:border-b-0">
                <div class="bg-gray-800 px-4 py-2 cursor-pointer hover:bg-gray-750" @click="toggleStrategy(ticket.ticket, sIndex)">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i class="fas fa-chevron-right text-gray-500 text-xs transition-transform" :class="{ 'rotate-90': expandedStrategies.has(`${ticket.ticket}-${sIndex}`) }"></i>
                      <span class="text-sm font-semibold text-white">{{ strategy.name }}</span>
                      <span class="text-xs px-1.5 py-0.5 rounded" :class="strategy.debit_paid ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'">
                        {{ strategy.debit_paid ? 'LONG' : 'SHORT' }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 mt-1 ml-4 text-xs text-gray-400">
                    <span>In: <span class="text-gray-300">${{ getEntryPrice(strategy) }}</span></span>
                    <span v-if="ticket.status !== 'OPEN'">Out: <span class="text-gray-300">${{ getExitPrice(strategy) }}</span></span>
                    <span v-if="ticket.status === 'OPEN'">Held: {{ getHoldTime(strategy.entry_time) }}</span>
                    <span v-else>Held: {{ getHoldTime(strategy.entry_time, strategy.exit_time) }}</span>
                  </div>
                </div>

                <!-- Legs -->
                <div v-show="expandedStrategies.has(`${ticket.ticket}-${sIndex}`)" class="px-4 pb-3">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-750">
                      <tr>
                        <th class="px-3 py-1 text-left text-xs text-gray-400">Action</th>
                        <th class="px-3 py-1 text-left text-xs text-gray-400">Type</th>
                        <th class="px-3 py-1 text-right text-xs text-gray-400">Strike</th>
                        <th class="px-3 py-1 text-left text-xs text-gray-400">Expiry</th>
                        <th class="px-3 py-1 text-right text-xs text-gray-400">Premium</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                      <tr v-for="(leg, lIndex) in strategy.legs" :key="lIndex" class="hover:bg-gray-750">
                        <td class="px-3 py-2">
                          <span class="px-2 py-0.5 text-xs rounded" :class="leg.action === 'buy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'">
                            {{ leg.action === 'buy' ? 'LONG' : 'SHORT' }}
                          </span>
                        </td>
                        <td class="px-3 py-2 font-semibold">{{ leg.type.toUpperCase() }}</td>
                        <td class="px-3 py-2 text-right text-gray-300">${{ leg.strike }}</td>
                        <td class="px-3 py-2 text-gray-400">{{ leg.expiry }}</td>
                        <td class="px-3 py-2 text-right text-gray-300">${{ leg.premium.toFixed(2) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- P&L and Notes -->
              <div class="px-4 py-3 bg-gray-750 border-t border-gray-700">
                <div class="flex justify-between items-start">
                  <div v-if="ticket.notes" class="flex-1 text-sm text-gray-400">{{ ticket.notes }}</div>
                  <div v-if="ticket.status !== 'OPEN'" class="text-right">
                    <div class="text-xs text-gray-400">P&L</div>
                    <div class="text-xl font-bold" :class="ticket.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ ticket.pnl >= 0 ? '+' : '' }}${{ ticket.pnl.toFixed(2) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No tickets message -->
        <div v-if="filteredTickets.length === 0" class="bg-gray-800 rounded-lg p-8 text-center text-gray-500">No tickets found</div>
      </div>
    </main>

    <!-- Bottom Tab Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex">
          <button
            @click="activeTab = 'calendar'"
            :class="[
              'flex-1 py-4 text-center transition-colors',
              activeTab === 'calendar' ? 'text-green-500 border-t-2 border-green-500' : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            <i class="fas fa-calendar-alt text-xl mb-1"></i>
            <div class="text-xs">Calendar</div>
          </button>
          <button
            @click="activeTab = 'trades'"
            :class="[
              'flex-1 py-4 text-center transition-colors',
              activeTab === 'trades' ? 'text-green-500 border-t-2 border-green-500' : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            <i class="fas fa-list text-xl mb-1"></i>
            <div class="text-xs">Trades</div>
          </button>
        </div>
      </div>
    </nav>

    <!-- Add Trade Modal -->
    <TradeFormModal v-if="showAddModal" @close="showAddModal = false" @save="saveTrade" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { tradesData } from './data/trades.js'
import TradeFormModal from './components/TradeFormModal.vue'

const tickets = ref([])
const showAddModal = ref(false)
const expandedTickets = ref(new Set())
const expandedStrategies = ref(new Set())
const activeTab = ref('calendar')
const currentMonth = ref(new Date(2026, 2, 1)) // March 2026

const dateRange = ref({
  mode: null, // 'single', 'week', 'month', 'range', 'all'
  start: null,
  end: null,
  single: null
})

const filters = ref({
  symbol: '',
  status: ''
})

const sortBy = ref('ticket')

onMounted(() => {
  tickets.value = [...tradesData]
})

const filteredTickets = computed(() => {
  let filtered = tickets.value.filter(ticket => {
    const matchSymbol = !filters.value.symbol || ticket.symbol.toLowerCase().includes(filters.value.symbol.toLowerCase())
    const matchStatus = !filters.value.status || ticket.status === filters.value.status
    const matchDate = isTicketInDateRange(ticket)
    return matchSymbol && matchStatus && matchDate
  })

  switch (sortBy.value) {
    case 'ticket':
      filtered.sort((a, b) => a.ticket - b.ticket)
      break
    case 'pnl_high':
      filtered.sort((a, b) => (b.pnl || 0) - (a.pnl || 0))
      break
    case 'pnl_low':
      filtered.sort((a, b) => (a.pnl || 0) - (b.pnl || 0))
      break
    case 'date':
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
      break
  }

  return filtered
})

const stats = computed(() => {
  const closed = tickets.value.filter(t => t.status !== 'OPEN')
  const winners = closed.filter(t => t.status === 'WIN')
  const totalPnL = closed.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalStrategies = tickets.value.reduce((sum, t) => sum + t.strategies.length, 0)

  return {
    totalTickets: tickets.value.length,
    winRate: closed.length > 0 ? Math.round((winners.length / closed.length) * 100) : 0,
    totalPnL,
    totalStrategies
  }
})

const calendarDays = computed(() => {
  const days = []
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const pnlByDate = {}
  tickets.value.forEach(ticket => {
    if (ticket.pnl !== undefined) {
      const date = ticket.date
      pnlByDate[date] = (pnlByDate[date] || 0) + ticket.pnl
    }
  })

  for (let i = 0; i < firstDay; i++) {
    days.push({ date: null, dayOfMonth: '', pnl: 0 })
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({
      date,
      dayOfMonth: day,
      pnl: pnlByDate[date] || 0
    })
  }

  return days
})

// Summary stats for currently filtered trades
const filteredSummary = computed(() => {
  const filtered = filteredTickets.value
  const closed = filtered.filter(t => t.status !== 'OPEN' && t.pnl !== undefined)
  const winners = closed.filter(t => t.status === 'WIN')
  const losers = closed.filter(t => t.status === 'LOSS')

  const totalPnL = closed.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winsAmount = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const lossesAmount = losers.reduce((sum, t) => sum + (t.pnl || 0), 0)

  const profitFactor = lossesAmount !== 0 ? Math.abs(winsAmount / lossesAmount) : winsAmount > 0 ? 999 : 0
  const bestTrade = filtered.length > 0 ? Math.max(...filtered.map(t => t.pnl || 0)) : 0

  return {
    count: filtered.length,
    totalPnL,
    winRate: closed.length > 0 ? Math.round((winners.length / closed.length) * 100) : 0,
    avgPnL: closed.length > 0 ? totalPnL / closed.length : 0,
    wins: winners.length,
    losses: losers.length,
    profitFactor,
    bestTrade
  }
})

const getStatusClass = (status) => {
  const classes = {
    'WIN': 'bg-green-900 text-green-300',
    'LOSS': 'bg-red-900 text-red-300',
    'OPEN': 'bg-yellow-900 text-yellow-300'
  }
  return classes[status] || 'bg-gray-700 text-gray-300'
}

const getHoldTime = (entryTime, exitTime = null) => {
  if (!entryTime) return '-'
  const entry = new Date(entryTime)
  const exit = exitTime ? new Date(exitTime) : new Date()
  const diffMs = exit - entry
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  else if (hours > 0) return `${hours}h ${minutes}m`
  else return `${minutes}m`
}

const getEntryPrice = (strategy) => {
  if (strategy.entry_price) return strategy.entry_price.toFixed(2)
  const price = strategy.debit_paid || strategy.credit_received
  return price ? price.toFixed(2) : '-'
}

const getExitPrice = (strategy) => {
  if (strategy.exit_price) return strategy.exit_price.toFixed(2)
  if (strategy.legs && strategy.legs.length > 0) {
    const sellLegs = strategy.legs.filter(l => l.action === 'sell')
    const buyLegs = strategy.legs.filter(l => l.action === 'buy')
    const totalSell = sellLegs.reduce((sum, l) => sum + l.premium, 0)
    const totalBuy = buyLegs.reduce((sum, l) => sum + l.premium, 0)
    return (totalSell - totalBuy).toFixed(2)
  }
  return '-'
}

const toggleTicket = (id) => {
  if (expandedTickets.value.has(id)) expandedTickets.value.delete(id)
  else expandedTickets.value.add(id)
}

const toggleStrategy = (ticketId, strategyIndex) => {
  const key = `${ticketId}-${strategyIndex}`
  if (expandedStrategies.value.has(key)) expandedStrategies.value.delete(key)
  else expandedStrategies.value.add(key)
}

const selectDate = (date) => {
  if (!date) return
  dateRange.value = {
    mode: 'single',
    single: date,
    start: null,
    end: null
  }
  activeTab.value = 'trades'
}

const selectThisWeek = () => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  dateRange.value = {
    mode: 'week',
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
    single: null
  }
  activeTab.value = 'trades'
}

const selectThisMonth = () => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0)

  dateRange.value = {
    mode: 'month',
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0],
    single: null
  }
  activeTab.value = 'trades'
}

const selectAllTime = () => {
  dateRange.value = {
    mode: 'all',
    start: null,
    end: null,
    single: null
  }
  activeTab.value = 'trades'
}

const clearDateRange = () => {
  dateRange.value = {
    mode: null,
    start: null,
    end: null,
    single: null
  }
}

const isDateInRange = (date) => {
  if (!date) return false
  if (!dateRange.value.mode) return true

  switch (dateRange.value.mode) {
    case 'single':
      return date === dateRange.value.single
    case 'week':
    case 'month':
    case 'range':
      return date >= dateRange.value.start && date <= dateRange.value.end
    case 'all':
      return true
    default:
      return true
  }
}

const isTicketInDateRange = (ticket) => {
  if (!dateRange.value.mode) return true

  switch (dateRange.value.mode) {
    case 'single':
      return ticket.date === dateRange.value.single
    case 'week':
    case 'month':
    case 'range':
      return ticket.date >= dateRange.value.start && ticket.date <= dateRange.value.end
    case 'all':
      return true
    default:
      return true
  }
}

const resetFilters = () => {
  filters.value = { symbol: '', status: '' }
  sortBy.value = 'ticket'
  clearDateRange()
}

const formatMonth = (date) => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

const saveTrade = (trade) => {
  trade.ticket = Date.now()
  tickets.value.unshift(trade)
  showAddModal.value = false
}
</script>
