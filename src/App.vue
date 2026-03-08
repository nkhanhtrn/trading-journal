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
        <SummaryCards :summary="stats" />

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
          <button @click="expandedSymbols = expandedSymbols.size === 0 ? new Set(groupedTrades.map(g => g.symbol)) : new Set()" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">
            {{ expandedSymbols.size === 0 ? 'Expand All' : 'Collapse All' }}
          </button>
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

        <!-- Tickets List grouped by Symbol -->
        <div class="space-y-4">
          <div v-for="group in groupedTrades" :key="group.symbol" class="bg-gray-800 rounded-lg overflow-hidden">
            <!-- Symbol Header -->
            <div class="bg-gray-750 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-700" @click="toggleSymbol(group.symbol)">
              <div class="flex items-center gap-4">
                <span class="text-xl font-bold text-white">{{ group.symbol }}</span>
                <span class="text-sm text-gray-400">{{ group.count }} trades</span>
                <span class="text-xs px-2 py-1 rounded" :class="group.totalPnL >= 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'">
                  {{ group.totalPnL >= 0 ? '+' : '' }}${{ group.totalPnL.toFixed(0) }}
                </span>
                <span class="text-xs text-gray-500">{{ group.winRate }}% win rate</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-xs text-gray-500">{{ group.wins }}W / {{ group.losses }}L</span>
                <i class="fas fa-chevron-down text-gray-400 transition-transform" :class="{ 'rotate-180': expandedSymbols.has(group.symbol) }"></i>
              </div>
            </div>

            <!-- Tickets for this Symbol -->
            <div v-show="expandedSymbols.has(group.symbol)" class="border-t border-gray-700">
              <div v-for="ticket in group.tickets" :key="ticket.ticket" class="border-b border-gray-700 last:border-b-0">
                <!-- Ticket Header -->
                <div class="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-750" @click="toggleTicket(ticket.ticket)">
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-mono text-blue-400">#{{ ticket.ticket }}</span>
                    <span class="text-sm text-gray-400">{{ ticket.date }}</span>
                    <span class="text-xs text-gray-500">{{ ticket.strategies.length }} legs</span>
                    <span v-if="ticket.strategies[0]" class="text-xs text-gray-600">
                      {{ ticket.strategies[0].legs[0]?.type.toUpperCase() }} ${{ ticket.strategies[0].legs[0]?.strike }}
                    </span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span v-if="ticket.status !== 'OPEN'" class="text-sm font-bold" :class="ticket.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ ticket.pnl >= 0 ? '+' : '' }}${{ ticket.pnl }}
                    </span>
                    <span class="px-2 py-1 text-xs rounded" :class="getStatusClass(ticket.status)">{{ ticket.status }}</span>
                    <i class="fas fa-chevron-right text-gray-500 text-xs transition-transform" :class="{ 'rotate-90': expandedTickets.has(ticket.ticket) }"></i>
                  </div>
                </div>

                <!-- Ticket Details -->
                <div v-show="expandedTickets.has(ticket.ticket)" class="px-4 pb-3 border-t border-gray-700">
                  <!-- Opening Position -->
                  <div class="mt-2">
                    <div class="text-xs text-green-400 font-semibold mb-1">Opening Position ({{ ticket.date }})</div>
                    <table class="w-full text-sm">
                      <thead class="bg-gray-750">
                        <tr>
                          <th class="px-2 py-1 text-left text-xs text-gray-400">Action</th>
                          <th class="px-2 py-1 text-left text-xs text-gray-400">Type</th>
                          <th class="px-2 py-1 text-right text-xs text-gray-400">Strike</th>
                          <th class="px-2 py-1 text-left text-xs text-gray-400">Expiry</th>
                          <th class="px-2 py-1 text-right text-xs text-gray-400">Qty</th>
                          <th class="px-2 py-1 text-right text-xs text-gray-400">Price</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-700">
                        <tr v-for="(leg, lIndex) in openingLegs(ticket)" :key="'open-' + lIndex" class="hover:bg-gray-750">
                          <td class="px-2 py-1">
                            <span class="px-2 py-0.5 text-xs rounded" :class="leg.action === 'buy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'">
                              {{ leg.action === 'buy' ? 'LONG' : 'SHORT' }}
                            </span>
                          </td>
                          <td class="px-2 py-1 text-xs font-semibold">{{ leg.type.toUpperCase() }}</td>
                          <td class="px-2 py-1 text-right text-gray-300 text-xs">${{ leg.strike }}</td>
                          <td class="px-2 py-1 text-gray-400 text-xs">{{ leg.expiry }}</td>
                          <td class="px-2 py-1 text-right text-gray-300 text-xs">{{ leg.quantity }}</td>
                          <td class="px-2 py-1 text-right text-gray-300 text-xs">${{ leg.premium.toFixed(2) }}</td>
                        </tr>
                        <tr class="bg-gray-750 font-semibold">
                          <td colspan="5" class="px-2 py-1 text-right text-xs text-gray-400">Net {{ openNetCost(ticket) >= 0 ? 'Credit' : 'Debit' }}:</td>
                          <td class="px-2 py-1 text-right text-xs" :class="openNetCost(ticket) >= 0 ? 'text-green-400' : 'text-red-400'">
                            {{ openNetCost(ticket) >= 0 ? '+' : '' }}${{ Math.abs(openNetCost(ticket)).toFixed(2) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Closing Position -->
                  <div class="mt-3">
                    <div class="text-xs text-red-400 font-semibold mb-1">Closing Position ({{ ticket.exit_date }})</div>
                    <table class="w-full text-sm">
                      <thead class="bg-gray-750">
                        <tr>
                          <th class="px-2 py-1 text-left text-xs text-gray-400">Action</th>
                          <th class="px-2 py-1 text-left text-xs text-gray-400">Type</th>
                          <th class="px-2 py-1 text-right text-xs text-gray-400">Strike</th>
                          <th class="px-2 py-1 text-left text-xs text-gray-400">Expiry</th>
                          <th class="px-2 py-1 text-right text-xs text-gray-400">Qty</th>
                          <th class="px-2 py-1 text-right text-xs text-gray-400">Price</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-700">
                        <tr v-for="(leg, lIndex) in closingLegs(ticket)" :key="'close-' + lIndex" class="hover:bg-gray-750">
                          <td class="px-2 py-1">
                            <span class="px-2 py-0.5 text-xs rounded" :class="leg.action === 'buy' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'">
                              {{ leg.action === 'buy' ? 'LONG' : 'SHORT' }}
                            </span>
                          </td>
                          <td class="px-2 py-1 text-xs font-semibold">{{ leg.type.toUpperCase() }}</td>
                          <td class="px-2 py-1 text-right text-gray-300 text-xs">${{ leg.strike }}</td>
                          <td class="px-2 py-1 text-gray-400 text-xs">{{ leg.expiry }}</td>
                          <td class="px-2 py-1 text-right text-gray-300 text-xs">{{ leg.quantity }}</td>
                          <td class="px-2 py-1 text-right text-gray-300 text-xs">${{ leg.premium.toFixed(2) }}</td>
                        </tr>
                        <tr v-if="closingLegs(ticket).length > 0" class="bg-gray-750 font-semibold">
                          <td colspan="5" class="px-2 py-1 text-right text-xs text-gray-400">Net {{ closeNetCost(ticket) >= 0 ? 'Credit' : 'Debit' }}:</td>
                          <td class="px-2 py-1 text-right text-xs" :class="closeNetCost(ticket) >= 0 ? 'text-green-400' : 'text-red-400'">
                            {{ closeNetCost(ticket) >= 0 ? '+' : '' }}${{ Math.abs(closeNetCost(ticket)).toFixed(2) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Notes -->
                  <div v-if="ticket.notes" class="mt-2 text-xs text-gray-500">{{ ticket.notes }}</div>
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
import SummaryCards from './components/SummaryCards.vue'
import TradeFormModal from './components/TradeFormModal.vue'

const tickets = ref([])
const showAddModal = ref(false)
const expandedTickets = ref(new Set())
const expandedStrategies = ref(new Set())
const expandedSymbols = ref(new Set())
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
  // Expand all symbols by default
  const symbols = [...new Set(tickets.value.map(t => t.symbol))]
  symbols.forEach(s => expandedSymbols.value.add(s))
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

  // Track P&L by date (exit date for closed trades)
  const pnlByDate = {}

  tickets.value.forEach(ticket => {
    // Show P&L on exit date for closed trades
    if (ticket.status !== 'OPEN' && ticket.exit_date && ticket.pnl !== undefined) {
      pnlByDate[ticket.exit_date] = (pnlByDate[ticket.exit_date] || 0) + ticket.pnl
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

  // Only include trades that exit within the selected time period
  let closedInPeriod = []
  if (dateRange.value.mode === 'single') {
    closedInPeriod = filtered.filter(t => t.exit_date === dateRange.value.single)
  } else if (dateRange.value.mode === 'week' || dateRange.value.mode === 'month' || dateRange.value.mode === 'range') {
    closedInPeriod = filtered.filter(t => t.exit_date >= dateRange.value.start && t.exit_date <= dateRange.value.end)
  } else if (dateRange.value.mode === 'all' || !dateRange.value.mode) {
    closedInPeriod = filtered.filter(t => t.status !== 'OPEN')
  } else {
    closedInPeriod = []
  }

  const winners = closedInPeriod.filter(t => t.status === 'WIN')
  const losers = closedInPeriod.filter(t => t.status === 'LOSS')

  const totalPnL = closedInPeriod.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winsAmount = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const lossesAmount = losers.reduce((sum, t) => sum + (t.pnl || 0), 0)

  const profitFactor = lossesAmount !== 0 ? Math.abs(winsAmount / lossesAmount) : winsAmount > 0 ? 999 : 0
  const bestTrade = closedInPeriod.length > 0 ? Math.max(...closedInPeriod.map(t => t.pnl || 0)) : 0

  return {
    count: closedInPeriod.length,
    totalPnL,
    winRate: closedInPeriod.length > 0 ? Math.round((winners.length / closedInPeriod.length) * 100) : 0,
    avgPnL: closedInPeriod.length > 0 ? totalPnL / closedInPeriod.length : 0,
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
      // Show trade if the selected date matches either entry or exit date
      return ticket.date === dateRange.value.single || ticket.exit_date === dateRange.value.single
    case 'week':
    case 'month':
    case 'range':
      // Show trade if it was active during the date range
      const entryInRange = ticket.date >= dateRange.value.start && ticket.date <= dateRange.value.end
      const exitInRange = ticket.exit_date && ticket.exit_date >= dateRange.value.start && ticket.exit_date <= dateRange.value.end
      const spansRange = ticket.date <= dateRange.value.end && (!ticket.exit_date || ticket.exit_date >= dateRange.value.start)
      return entryInRange || exitInRange || spansRange
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

// Group filtered tickets by symbol
const groupedTrades = computed(() => {
  const groups = {}
  filteredTickets.value.forEach(ticket => {
    if (!groups[ticket.symbol]) {
      groups[ticket.symbol] = []
    }
    groups[ticket.symbol].push(ticket)
  })

  // Calculate summary for each symbol
  return Object.entries(groups).map(([symbol, tickets]) => {
    const closed = tickets.filter(t => t.status !== 'OPEN')
    const totalPnL = closed.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const wins = closed.filter(t => t.status === 'WIN').length
    const losses = closed.filter(t => t.status === 'LOSS').length

    return {
      symbol,
      tickets,
      totalPnL,
      winRate: closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0,
      wins,
      losses,
      count: tickets.length
    }
  }).sort((a, b) => b.totalPnL - a.totalPnL)
})

const toggleSymbol = (symbol) => {
  if (expandedSymbols.value.has(symbol)) {
    expandedSymbols.value.delete(symbol)
  } else {
    expandedSymbols.value.add(symbol)
  }
}

// Split legs into opening (first half) and closing (second half)
// For strategies with entry and exit, legs are stored: entry legs first, then exit legs
const openingLegs = (ticket) => {
  const legs = ticket.strategies[0]?.legs || []
  // If there's an exit time, legs should contain both entry and exit
  // For 2 legs: first is entry, second is exit
  // For 4+ legs: first half is entry, second half is exit
  if (ticket.exit_date && legs.length >= 2) {
    const midPoint = Math.floor(legs.length / 2)
    return legs.slice(0, midPoint)
  }
  // Otherwise, return all legs (single order, not yet closed)
  return legs
}

const closingLegs = (ticket) => {
  const legs = ticket.strategies[0]?.legs || []
  // If there's an exit time, return the second half of legs
  if (ticket.exit_date && legs.length >= 2) {
    const midPoint = Math.floor(legs.length / 2)
    return legs.slice(midPoint)
  }
  // Otherwise, return empty (no closing position)
  return []
}

// Calculate net cost for opening position (credit = positive, debit = negative)
const openNetCost = (ticket) => {
  const legs = openingLegs(ticket)
  let total = 0
  legs.forEach(leg => {
    if (leg.action === 'sell') {
      total += leg.premium * leg.quantity
    } else {
      total -= leg.premium * leg.quantity
    }
  })
  return total
}

// Calculate net cost for closing position (credit = positive, debit = negative)
const closeNetCost = (ticket) => {
  const legs = closingLegs(ticket)
  let total = 0
  legs.forEach(leg => {
    if (leg.action === 'sell') {
      total += leg.premium * leg.quantity
    } else {
      total -= leg.premium * leg.quantity
    }
  })
  return total
}

const formatMonth = (date) => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Calculate return percentage for a trade
const calculateReturnPct = (ticket) => {
  if (!ticket.pnl || ticket.status === 'OPEN') return 0

  const legs = ticket.strategies[0]?.legs || []
  if (legs.length > 2) {
    // Multi-leg strategy - use first half (entry legs)
    const midPoint = Math.floor(legs.length / 2)
    const entryLegs = legs.slice(0, midPoint)
    let netCredit = 0
    entryLegs.forEach(leg => {
      if (leg.action === 'sell') {
        netCredit += leg.premium * leg.quantity
      } else {
        netCredit -= leg.premium * leg.quantity
      }
    })
    const investment = Math.abs(netCredit * 100) // Convert to dollars
    if (investment > 0) {
      const pct = (ticket.pnl / investment) * 100
      return pct >= 0 ? `+${pct.toFixed(1)}` : pct.toFixed(1)
    }
  }

  return ''
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
