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

        <!-- Open Positions Section -->
        <div v-if="groupedOpenPositions.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-3 cursor-pointer" @click="openPositionsCollapsed = !openPositionsCollapsed">
            <h3 class="text-sm font-semibold text-yellow-400 flex items-center gap-2">
              <i class="fas fa-exclamation-triangle"></i>
              Open Positions ({{ openPositions.length }})
            </h3>
            <i class="fas fa-chevron-down text-yellow-400 transition-transform text-xs" :class="{ 'rotate-180': openPositionsCollapsed }"></i>
          </div>

          <div v-show="!openPositionsCollapsed" class="space-y-2">
            <div v-for="group in groupedOpenPositions" :key="group.symbol + group.strategyName + group.strikes + group.expiry" class="border-b border-gray-800 last:border-0">
              <div class="flex items-center gap-4 text-sm py-2 cursor-pointer hover:bg-gray-800/50 px-2 -mx-2 rounded" @click="togglePosition(group)">
                <i class="fas fa-chevron-right text-gray-500 text-xs transition-transform" :class="{ 'rotate-90': expandedPositionKeys.has(group.symbol + group.strategyName + group.strikes + group.expiry) }"></i>
                <span class="text-gray-400 w-20">{{ group.positions.length > 1 ? group.positions.map(p => p.ticket).join(', ') : '#' + group.positions[0].ticket }}</span>
                <span class="font-semibold text-yellow-300 w-12">{{ group.symbol }}</span>
                <span class="text-gray-400 flex-1">{{ group.strategyName }} {{ group.strikes }}</span>
                <span class="text-gray-500 text-xs">{{ group.expiry }}</span>
                <span class="text-gray-500 text-xs">{{ group.totalQuantity }}c</span>
              </div>
              <div v-show="expandedPositionKeys.has(group.symbol + group.strategyName + group.strikes + group.expiry)" class="px-2 py-2 bg-gray-800/50">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">Entry: ${{ getAverageEntryPrice(group).toFixed(2) }}</span>
                  <button @click.stop="selectedPositionGroup = group" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">Details →</button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                day.pnl < 0 ? 'bg-red-900 hover:bg-red-800 text-red-300' : ''
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
        <!-- Open Positions Section -->
        <div v-if="groupedOpenPositions.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-3 cursor-pointer" @click="openPositionsCollapsed = !openPositionsCollapsed">
            <h3 class="text-sm font-semibold text-yellow-400 flex items-center gap-2">
              <i class="fas fa-exclamation-triangle"></i>
              Open Positions ({{ openPositions.length }})
            </h3>
            <i class="fas fa-chevron-down text-yellow-400 transition-transform text-xs" :class="{ 'rotate-180': openPositionsCollapsed }"></i>
          </div>

          <div v-show="!openPositionsCollapsed" class="space-y-2">
            <div v-for="group in groupedOpenPositions" :key="group.symbol + group.strategyName + group.strikes + group.expiry" class="border-b border-gray-800 last:border-0">
              <div class="flex items-center gap-4 text-sm py-2 cursor-pointer hover:bg-gray-800/50 px-2 -mx-2 rounded" @click="togglePosition(group)">
                <i class="fas fa-chevron-right text-gray-500 text-xs transition-transform" :class="{ 'rotate-90': expandedPositionKeys.has(group.symbol + group.strategyName + group.strikes + group.expiry) }"></i>
                <span class="text-gray-400 w-20">{{ group.positions.length > 1 ? group.positions.map(p => p.ticket).join(', ') : '#' + group.positions[0].ticket }}</span>
                <span class="font-semibold text-yellow-300 w-12">{{ group.symbol }}</span>
                <span class="text-gray-400 flex-1">{{ group.strategyName }} {{ group.strikes }}</span>
                <span class="text-gray-500 text-xs">{{ group.expiry }}</span>
                <span class="text-gray-500 text-xs">{{ group.totalQuantity }}c</span>
              </div>
              <div v-show="expandedPositionKeys.has(group.symbol + group.strategyName + group.strikes + group.expiry)" class="px-2 py-2 bg-gray-800/50">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">Entry: ${{ getAverageEntryPrice(group).toFixed(2) }}</span>
                  <button @click.stop="selectedPositionGroup = group" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">Details →</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Day Navigation -->
        <div class="bg-gray-800 rounded-lg p-3 mb-6 flex items-center justify-between">
          <button @click="prevDay" class="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors">
            <i class="fas fa-chevron-left"></i>
          </button>
          <div class="text-center">
            <div class="text-xs text-gray-500 mb-1">Viewing trades from</div>
            <div class="text-lg font-semibold text-white">{{ selectedTradeDate || 'All dates' }}</div>
          </div>
          <button @click="nextDay" class="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

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
          <button @click="toggleAllSymbols" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">
            {{ allSymbolsExpanded ? 'Collapse All' : 'Expand All' }}
          </button>
        </div>

        <!-- Tickets List grouped by Symbol -->
        <div class="space-y-2">
          <div v-for="symbolGroup in groupedBySymbol" :key="symbolGroup.symbol" class="bg-gray-800 rounded-lg overflow-hidden">
            <!-- Symbol Header -->
            <div class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-700" @click="toggleSymbol(symbolGroup.symbol)">
              <div class="flex items-center gap-3">
                <i class="fas fa-chevron-right text-gray-500 text-xs transition-transform" :class="{ 'rotate-90': expandedSymbols.has(symbolGroup.symbol) }"></i>
                <span class="text-lg font-bold text-white">{{ symbolGroup.symbol }}</span>
                <span class="text-xs text-gray-500">{{ symbolGroup.groups.length }} position{{ symbolGroup.groups.length > 1 ? 's' : '' }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-base font-bold" :class="symbolGroup.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ symbolGroup.totalPnL >= 0 ? '+' : '' }}${{ symbolGroup.totalPnL.toFixed(0) }}
                </span>
              </div>
            </div>

            <!-- Positions under symbol -->
            <div v-show="expandedSymbols.has(symbolGroup.symbol)" class="border-t border-gray-700">
              <div v-for="group in symbolGroup.groups" :key="group.symbol + group.strategyName + group.strikes + group.expiry" class="border-b border-gray-700 last:border-0 cursor-pointer hover:bg-gray-700/50" @click="selectedPositionGroup = group">
                <!-- Position Row with details inline -->
                <div class="px-4 py-3">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-white">{{ group.strategyName }}</span>
                      <span class="text-sm text-gray-400">{{ group.strikes }}</span>
                      <span class="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{{ group.expiry }}</span>
                      <span class="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded">{{ group.totalQuantity }}c</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <MiniCalendarDots :entry-dates="getEntryDates(group)" :exit-dates="getExitDates(group)" :expiry-dates="getExpiryDates(group)" />
                    </div>
                  </div>

                  <!-- Price details inline -->
                  <div v-if="group.openCount === 0" class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-1.5">
                      <span class="text-gray-600 text-xs">Sold</span>
                      <span class="text-white font-mono font-medium">${{ Math.abs(getAverageEntryPrice(group)).toFixed(2) }}</span>
                    </div>
                    <span class="text-gray-700">×</span>
                    <div v-if="hasClosingLegs(group)" class="flex items-center gap-1.5">
                      <span class="text-gray-600 text-xs">Bought</span>
                      <span class="text-white font-mono font-medium">${{ Math.abs(getAverageExitPrice(group)).toFixed(2) }}</span>
                    </div>
                    <div v-else class="flex items-center gap-1.5">
                      <span class="text-gray-600 text-xs">Expired</span>
                      <span class="text-yellow-400 font-mono font-medium">${{ getImpliedExitPrice(group).toFixed(2) }}</span>
                    </div>
                    <span class="text-gray-700">=</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-gray-600 text-xs">P&L</span>
                      <span class="font-mono font-bold" :class="group.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ group.totalPnL >= 0 ? '+' : '' }}${{ group.totalPnL.toFixed(0) }}
                      </span>
                    </div>
                    <span class="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded ml-auto">
                      {{ group.totalQuantity }} × 100
                    </span>
                  </div>
                  <div v-else class="flex items-center gap-2 text-sm">
                    <span class="text-gray-500 text-xs">Opening Price:</span>
                    <span class="text-white font-mono">${{ getAverageEntryPrice(group).toFixed(2) }}</span>
                    <span class="text-xs px-2 py-1 rounded bg-yellow-900 text-yellow-300 ml-auto">{{ group.openCount }} OPEN</span>
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

    <!-- Position Detail Modal -->
    <div v-if="selectedPositionGroup" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="selectedPositionGroup = null">
      <div class="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 class="text-lg font-bold text-white">{{ selectedPositionGroup.symbol }} {{ selectedPositionGroup.strategyName || 'Strategy' }} {{ selectedPositionGroup.strikes }}</h3>
          <button @click="selectedPositionGroup = null" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-4 space-y-4">
          <div class="flex items-center gap-4 text-sm text-gray-400">
            <span>Expiry: <span class="text-yellow-300 ml-1">{{ selectedPositionGroup.expiry }}</span></span>
            <span>Total: <span class="text-white ml-1">{{ selectedPositionGroup.totalQuantity }} contracts</span></span>
            <span v-if="selectedPositionGroup.openCount === 0" :class="selectedPositionGroup.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
              P&L: {{ selectedPositionGroup.totalPnL >= 0 ? '+' : '' }}${{ selectedPositionGroup.totalPnL.toFixed(0) }}
            </span>
          </div>

          <div class="border-t border-gray-700 pt-4">
            <div class="text-sm font-semibold text-gray-300 mb-3">Tickets ({{ (selectedPositionGroup.tickets || selectedPositionGroup.positions).length }})</div>
            <div v-for="pos in (selectedPositionGroup.tickets || selectedPositionGroup.positions)" :key="pos.ticket" class="bg-gray-900 rounded p-3 mb-3 last:mb-0">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="text-blue-400 font-mono">#{{ pos.ticket }}</span>
                  <span class="text-xs px-2 py-0.5 rounded" :class="getStatusClass(pos.status)">{{ pos.status }}</span>
                  <span v-if="pos.status !== 'OPEN'" class="text-sm font-bold" :class="pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ pos.pnl >= 0 ? '+' : '' }}${{ pos.pnl }}
                  </span>
                </div>
                <span class="text-gray-500 text-xs">{{ pos.date }}{{ pos.exit_date ? ' → ' + pos.exit_date : '' }}</span>
              </div>

              <div class="grid grid-cols-2 gap-4 text-xs mb-3">
                <!-- Opening Legs -->
                <div>
                  <div class="text-green-400 font-semibold mb-1">Opening</div>
                  <div v-for="leg in openingLegs(pos)" :key="'open-' + leg.strike + leg.action" class="flex items-center gap-2 mb-1">
                    <span class="px-1.5 py-0.5 rounded text-[10px]" :class="leg.action === 'buy' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'">
                      {{ leg.action === 'buy' ? 'LONG' : 'SHORT' }}
                    </span>
                    <span class="text-gray-300">{{ leg.type.toUpperCase() }} ${{ leg.strike }}</span>
                    <span class="text-gray-500">{{ leg.quantity }}c</span>
                    <span class="text-gray-500">@ ${{ leg.premium.toFixed(2) }}</span>
                  </div>
                </div>

                <!-- Closing Legs -->
                <div v-if="pos.exit_date">
                  <div class="text-red-400 font-semibold mb-1">Closing</div>
                  <div v-for="leg in closingLegs(pos)" :key="'close-' + leg.strike + leg.action" class="flex items-center gap-2 mb-1">
                    <span class="px-1.5 py-0.5 rounded text-[10px]" :class="leg.action === 'buy' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'">
                      {{ leg.action === 'buy' ? 'LONG' : 'SHORT' }}
                    </span>
                    <span class="text-gray-300">{{ leg.type.toUpperCase() }} ${{ leg.strike }}</span>
                    <span class="text-gray-500">{{ leg.quantity }}c</span>
                    <span class="text-gray-500">@ ${{ leg.premium.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <!-- P&L Breakdown for closed trades -->
              <div v-if="pos.exit_date" class="border-t border-gray-700 pt-3 mt-3">
                <div class="text-xs text-gray-500 mb-2">P&L Breakdown</div>
                <div class="flex items-center gap-3 text-sm">
                  <div class="flex items-center gap-1.5">
                    <span class="text-gray-600 text-xs">Sold</span>
                    <span class="text-white font-mono font-medium">${{ Math.abs(getTicketEntryPrice(pos)).toFixed(2) }}</span>
                  </div>
                  <span class="text-gray-700">×</span>
                  <div v-if="ticketHasClosingLegs(pos)" class="flex items-center gap-1.5">
                    <span class="text-gray-600 text-xs">Bought</span>
                    <span class="text-white font-mono font-medium">${{ Math.abs(getTicketExitPrice(pos)).toFixed(2) }}</span>
                  </div>
                  <div v-else class="flex items-center gap-1.5">
                    <span class="text-gray-600 text-xs">Expired</span>
                    <span class="text-yellow-400 font-mono font-medium">${{ getTicketImpliedExitPrice(pos).toFixed(2) }}</span>
                  </div>
                  <span class="text-gray-700">=</span>
                  <div class="flex items-center gap-1.5">
                    <span class="text-gray-600 text-xs">P&L</span>
                    <span class="font-mono font-bold" :class="pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ pos.pnl >= 0 ? '+' : '' }}${{ pos.pnl }}
                    </span>
                  </div>
                  <span class="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded ml-auto">
                    {{ getTicketContracts(pos) }} × 100
                  </span>
                </div>
              </div>

              <!-- P&L Graph -->
              <div class="border-t border-gray-700 pt-3 mt-3">
                <div class="text-xs text-gray-400 mb-3">Theoretical P&L at Expiration</div>
                <svg viewBox="0 0 320 120" class="w-full h-28 bg-gray-900/50 rounded-lg">
                  <!-- P&L Fill area -->
                  <polygon :points="getPnLGraphArea(pos)" fill="#9ca3af" fill-opacity="0.1" />

                  <!-- Zero line (breakeven) -->
                  <line x1="20" y1="60" x2="300" y2="60" stroke="#6b7280" stroke-width="1" />

                  <!-- P&L Line -->
                  <polyline :points="getPnLGraphPoints(pos)" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

                  <!-- Max Profit/Loss Labels -->
                  <g v-if="getPnLGraphData(pos).maxProfit > 0">
                    <text :x="isProfitOnLeft(pos) ? 25 : 295" y="10" :text-anchor="isProfitOnLeft(pos) ? 'start' : 'end'" class="text-[11px]" fill="#4ade80" font-family="monospace" font-weight="600">
                      +${{ formatDollarAmount(getPnLGraphData(pos).maxProfit) }}
                    </text>
                  </g>
                  <g v-if="getPnLGraphData(pos).maxLoss < 0">
                    <text :x="isProfitOnLeft(pos) ? 295 : 25" y="116" :text-anchor="isProfitOnLeft(pos) ? 'end' : 'start'" class="text-[11px]" fill="#f87171" font-family="monospace" font-weight="600">
                      -${{ formatDollarAmount(Math.abs(getPnLGraphData(pos).maxLoss)) }}
                    </text>
                  </g>

                  <!-- Strikes markers -->
                  <g v-for="strike in getPnLGraphData(pos).strikes" :key="strike">
                    <line :x1="getStrikeX(strike, getPnLGraphData(pos))" y1="20" :x2="getStrikeX(strike, getPnLGraphData(pos))" y2="100" stroke="#4b5563" stroke-width="1" stroke-dasharray="4" />
                    <text :x="getStrikeX(strike, getPnLGraphData(pos))" y="115" text-anchor="middle" class="text-[9px]" fill="#9ca3af" font-family="monospace">{{ strike }}</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { tradesData } from './data/trades.js'
import SummaryCards from './components/SummaryCards.vue'
import TradeFormModal from './components/TradeFormModal.vue'
import MiniCalendarDots from './components/MiniCalendarDots.vue'
import { fetchPrices, fetchHistoricalPrice } from './utils/priceFetcher.js'

const tickets = ref([])
const showAddModal = ref(false)
const activeTab = ref('calendar')
const currentMonth = ref(new Date(2026, 2, 1)) // March 2026
const openPositionsCollapsed = ref(false)
const expandedPositionKeys = ref(new Set())
const expandedSymbols = ref(new Set())
const equityPrices = ref({})
const loadingPrices = ref(false)

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
const selectedPositionGroup = ref(null)
const selectedTradeDate = ref(null) // For day navigation in trades view

const openPositions = computed(() => {
  return tickets.value.filter(t => t.status === 'OPEN').sort((a, b) => new Date(a.strategies[0]?.legs[0]?.expiry) - new Date(b.strategies[0]?.legs[0]?.expiry))
})

// Group open positions by symbol + strategy + strikes + expiry
const groupedOpenPositions = computed(() => {
  const groups = new Map()

  openPositions.value.forEach(pos => {
    const legs = pos.strategies[0]?.legs || []
    if (legs.length === 0) return

    const strategyName = pos.strategies[0]?.name || pos.symbol + ' Strategy'
    const uniqueStrikes = [...new Set(legs.map(l => l.strike))].sort((a, b) => a - b).join('/')
    const expiries = [...new Set(legs.map(l => l.expiry))].sort().join(',')
    const key = `${pos.symbol}|${strategyName}|${uniqueStrikes}|${expiries}`

    if (!groups.has(key)) {
      groups.set(key, {
        symbol: pos.symbol,
        strategyName,
        strikes: uniqueStrikes,
        expiry: legs[0].expiry,
        expiries,
        positions: [],
        totalQuantity: 0
      })
    }

    groups.get(key).positions.push(pos)
    groups.get(key).totalQuantity += legs[0].quantity
  })

  return Array.from(groups.values()).sort((a, b) => new Date(a.expiry) - new Date(b.expiry))
})

onMounted(() => {
  tickets.value = [...tradesData]
})

const filteredTickets = computed(() => {
  let filtered = tickets.value.filter(ticket => {
    const matchSymbol = !filters.value.symbol || ticket.symbol.toLowerCase().includes(filters.value.symbol.toLowerCase())
    const matchStatus = !filters.value.status || ticket.status === filters.value.status
    const matchDate = isTicketInDateRange(ticket)
    // Match like calendar: entry or exit date matches
    const matchSelectedDate = !selectedTradeDate.value || ticket.date === selectedTradeDate.value || ticket.exit_date === selectedTradeDate.value
    return matchSymbol && matchStatus && matchDate && matchSelectedDate
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

// Calculate P&L at expiration for a given underlying price
const calculatePnLAtPrice = (ticket, price) => {
  const legs = ticket.strategies?.[0]?.legs || []
  if (legs.length === 0) return 0

  // For closed positions, only use the opening legs (first 2 for vertical spreads)
  // The data includes both opening and closing legs for closed trades
  const legsForCalculation = legs.length > 2 ? legs.slice(0, 2) : legs

  let totalPnL = 0
  legsForCalculation.forEach(leg => {
    const intrinsicValue = leg.type === 'call'
      ? Math.max(0, price - leg.strike)
      : Math.max(0, leg.strike - price)

    const valueAtExpiry = (leg.action === 'sell' ? -1 : 1) * intrinsicValue * leg.quantity * 100
    const premiumCollected = (leg.action === 'sell' ? 1 : -1) * leg.premium * leg.quantity * 100
    totalPnL += premiumCollected + valueAtExpiry
  })

  return totalPnL
}

// Check if profit occurs on the left side (lower prices) of the graph
const isProfitOnLeft = (ticket) => {
  const data = getPnLGraphData(ticket)
  if (!data.minPrice || !data.maxPrice) return true

  const pnlAtMin = calculatePnLAtPrice(ticket, data.minPrice)
  const pnlAtMax = calculatePnLAtPrice(ticket, data.maxPrice)

  // If P&L at min price is higher than at max price, profit is on left
  return pnlAtMin > pnlAtMax
}

// Get P&L graph data
const getPnLGraphData = (ticket) => {
  const legs = ticket.strategies?.[0]?.legs || []
  if (legs.length === 0) return { strikes: [], maxProfit: 0, maxLoss: 0, breakeven: null, minPrice: 0, maxPrice: 0 }

  // For closed positions, only use the opening legs (first 2 for vertical spreads)
  const legsForCalculation = legs.length > 2 ? legs.slice(0, 2) : legs

  // Get all strikes including duplicates for display
  const allStrikes = legsForCalculation.map(l => l.strike)
  const uniqueStrikes = [...new Set(allStrikes)].sort((a, b) => a - b)
  const minStrike = uniqueStrikes[0]
  const maxStrike = uniqueStrikes[uniqueStrikes.length - 1]

  // Calculate price range (wider than just strikes)
  const strikeRange = maxStrike - minStrike || 100
  const minPrice = Math.floor(minStrike - strikeRange * 0.5)
  const maxPrice = Math.ceil(maxStrike + strikeRange * 0.5)

  // Sample P&L across the range to find actual max/min
  let maxPnL = -Infinity
  let minPnL = Infinity
  for (let price = minPrice; price <= maxPrice; price += 1) {
    const pnl = calculatePnLAtPrice(ticket, price)
    maxPnL = Math.max(maxPnL, pnl)
    minPnL = Math.min(minPnL, pnl)
  }

  const maxProfit = Math.max(maxPnL, 0)
  const maxLoss = Math.min(minPnL, 0)

  // Find breakeven point(s)
  let breakeven = null
  for (let p = minStrike; p <= maxStrike; p += 0.1) {
    if (Math.abs(calculatePnLAtPrice(ticket, p)) < 10) {
      breakeven = Math.round(p)
      break
    }
  }

  return { strikes: uniqueStrikes, maxProfit, maxLoss, breakeven, minPrice, maxPrice }
}

// Convert strike to X coordinate
const getStrikeX = (strike, data) => {
  const range = data.maxPrice - data.minPrice || 1
  return ((strike - data.minPrice) / range) * 280 + 20
}

// Generate SVG polyline points
const getPnLGraphPoints = (ticket) => {
  const data = getPnLGraphData(ticket)
  if (!data.strikes.length || data.strikes.length < 2) return '20,60 300,60'

  const range = data.maxPrice - data.minPrice || 1
  const pnlRange = Math.max(Math.abs(data.maxProfit), Math.abs(data.maxLoss), 100)

  const points = []
  for (let px = 20; px <= 300; px += 3) {
    const price = (px - 20) / 280 * range + data.minPrice
    const pnl = calculatePnLAtPrice(ticket, price)
    const py = 60 - (pnl / pnlRange) * 40
    points.push(`${px},${Math.max(20, Math.min(100, py))}`)
  }

  return points.join(' ')
}

// Generate SVG polygon area (for fill under the curve)
const getPnLGraphArea = (ticket) => {
  const linePoints = getPnLGraphPoints(ticket)
  return `20,60 ${linePoints} 300,60`
}

// Format dollar amounts for display
const formatDollarAmount = (amount) => {
  if (Math.abs(amount) >= 1000) {
    return (amount / 1000).toFixed(1) + 'k'
  }
  return amount.toFixed(0)
}

// Get X coordinate for exit point (based on the strikes that define the spread)
const getExitPointX = (ticket, data) => {
  // For vertical spreads, exit typically happens near or between strikes
  // Use the average strike as a reasonable approximation
  if (data.strikes.length >= 2) {
    return getStrikeX((data.strikes[0] + data.strikes[data.strikes.length - 1]) / 2, data)
  }
  return 150
}

// Get Y coordinate for exit point (based on actual P&L)
const getExitPointY = (ticket, data) => {
  const pnl = ticket.pnl || 0
  const maxAbsPnL = Math.max(Math.abs(data.maxProfit), Math.abs(data.maxLoss), 100)
  return 50 - (pnl / maxAbsPnL) * 40
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

const togglePosition = (group) => {
  const key = group.symbol + group.strategyName + group.strikes + group.expiry
  if (expandedPositionKeys.value.has(key)) {
    expandedPositionKeys.value.delete(key)
  } else {
    expandedPositionKeys.value.add(key)
  }
}

const toggleSymbol = (symbol) => {
  if (expandedSymbols.value.has(symbol)) {
    expandedSymbols.value.delete(symbol)
  } else {
    expandedSymbols.value.add(symbol)
  }
}

const allSymbolsExpanded = computed(() => {
  return expandedSymbols.value.size === groupedBySymbol.value.length && groupedBySymbol.value.length > 0
})

const toggleAllSymbols = () => {
  if (allSymbolsExpanded.value) {
    expandedSymbols.value.clear()
  } else {
    groupedBySymbol.value.forEach(group => {
      expandedSymbols.value.add(group.symbol)
    })
  }
}

const getAverageEntryPrice = (group) => {
  const tickets = group.tickets || group.positions || []
  let weightedSum = 0
  let totalContracts = 0

  tickets.forEach(ticket => {
    const price = getTicketEntryPrice(ticket)
    const contracts = getTicketContracts(ticket)
    weightedSum += price * contracts
    totalContracts += contracts
  })

  return totalContracts > 0 ? weightedSum / totalContracts : 0
}

const getAverageExitPrice = (group) => {
  const tickets = group.tickets || group.positions || []
  let weightedSum = 0
  let totalContracts = 0

  tickets.forEach(ticket => {
    if (ticket.exit_date) {
      const price = getTicketExitPrice(ticket)
      const contracts = getTicketContracts(ticket)
      weightedSum += price * contracts
      totalContracts += contracts
    }
  })

  return totalContracts > 0 ? weightedSum / totalContracts : 0
}

const getTicketEntryPrice = (ticket) => {
  const legs = openingLegs(ticket)
  if (legs.length === 0) return 0

  let totalNetPremium = 0
  legs.forEach(leg => {
    if (leg.action === 'sell') {
      totalNetPremium += leg.premium * leg.quantity
    } else {
      totalNetPremium -= leg.premium * leg.quantity
    }
  })

  // Use quantity from first leg (all legs in a spread have same quantity)
  const contracts = legs[0].quantity
  return totalNetPremium / contracts
}

const getTicketExitPrice = (ticket) => {
  if (!ticket.exit_date) return 0

  const legs = closingLegs(ticket)
  if (legs.length === 0) return 0

  let totalNetPremium = 0
  legs.forEach(leg => {
    if (leg.action === 'sell') {
      totalNetPremium += leg.premium * leg.quantity
    } else {
      totalNetPremium -= leg.premium * leg.quantity
    }
  })

  // Use quantity from first leg (all legs in a spread have same quantity)
  const contracts = legs[0].quantity
  return totalNetPremium / contracts
}

const getTicketImpliedExitPrice = (ticket) => {
  // For expired ITM positions, implied exit is 0 (full loss of premium)
  return 0
}

const getTicketContracts = (ticket) => {
  const legs = openingLegs(ticket)
  return legs.reduce((sum, leg) => sum + leg.quantity, 0)
}

const hasClosingLegs = (group) => {
  const tickets = group.tickets || group.positions || []
  for (const ticket of tickets) {
    if (ticket.exit_date) {
      const legs = ticket.strategies[0]?.legs || []
      // If there are more than 2 legs, we have closing legs stored
      // (2 legs = opening only, 4+ legs = opening + closing)
      if (legs.length > 2) return true
    }
  }
  return false
}

const ticketHasClosingLegs = (ticket) => {
  if (!ticket.exit_date) return false
  const legs = ticket.strategies[0]?.legs || []
  // If there are more than 2 legs, we have closing legs stored
  return legs.length > 2
}

const getImpliedExitPrice = (group) => {
  // Calculate implied exit price from P&L for expired trades
  // For credit: P&L = (Entry - Exit) × 100 × contracts
  // So: Exit = Entry - (P&L / 100 / contracts)
  const entry = getAverageEntryPrice(group)
  const pnl = group.totalPnL
  const contracts = group.totalQuantity
  return entry - (pnl / 100 / contracts)
}

const formatLegPrices = (legs) => {
  if (!legs || legs.length === 0) return '-'
  return legs.map(leg => {
    const action = leg.action === 'sell' ? '⊕' : '⊖'
    return `${action}$${leg.premium.toFixed(2)}`
  }).join(' ')
}

const getFirstEntryDate = (group) => {
  const tickets = group.tickets || group.positions || []
  if (tickets.length === 0) return null
  return tickets.reduce((earliest, t) => t.date < earliest ? t.date : earliest, tickets[0].date)
}

const getLastExitDate = (group) => {
  const tickets = group.tickets || group.positions || []
  const closedTickets = tickets.filter(t => t.exit_date)
  if (closedTickets.length === 0) return null
  return closedTickets.reduce((latest, t) => t.exit_date > latest ? t.exit_date : latest, closedTickets[0].exit_date)
}

const getHoldDuration = (group) => {
  const entry = getFirstEntryDate(group)
  const exit = getLastExitDate(group)
  if (!entry || !exit) return null

  const entryDate = new Date(entry)
  const exitDate = new Date(exit)
  const diffTime = Math.abs(exitDate - entryDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Same day'
  if (diffDays === 1) return '1 day'
  return `${diffDays} days`
}

const getEntryDates = (group) => {
  const tickets = group.tickets || group.positions || []
  return tickets.map(t => t.date).filter(d => d)
}

const getExitDates = (group) => {
  const tickets = group.tickets || group.positions || []
  return tickets.map(t => t.exit_date).filter(d => d)
}

const getExpiryDates = (group) => {
  const tickets = group.tickets || group.positions || []
  const expirySet = new Set()
  tickets.forEach(ticket => {
    const legs = ticket.strategies?.[0]?.legs || []
    legs.forEach(leg => {
      if (leg.expiry) expirySet.add(leg.expiry)
    })
  })
  return Array.from(expirySet)
}

const selectDate = (date) => {
  if (!date) return
  dateRange.value = {
    mode: 'single',
    single: date,
    start: null,
    end: null
  }
  selectedTradeDate.value = date
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
  selectedTradeDate.value = null
}

const prevDay = () => {
  // Clear date range filter when using day navigation
  dateRange.value = { mode: null, start: null, end: null, single: null }

  if (!selectedTradeDate.value) {
    // Set to latest trade date if no date selected
    const dates = [...new Set(tickets.value.map(t => t.date).filter(d => d))].sort()
    if (dates.length > 0) {
      selectedTradeDate.value = dates[dates.length - 1]
    }
  } else {
    // Go to previous calendar day
    const current = new Date(selectedTradeDate.value)
    current.setDate(current.getDate() - 1)
    selectedTradeDate.value = current.toISOString().split('T')[0]
  }
}

const nextDay = () => {
  // Clear date range filter when using day navigation
  dateRange.value = { mode: null, start: null, end: null, single: null }

  if (!selectedTradeDate.value) {
    // Set to latest trade date if no date selected
    const dates = [...new Set(tickets.value.map(t => t.date).filter(d => d))].sort()
    if (dates.length > 0) {
      selectedTradeDate.value = dates[dates.length - 1]
    }
  } else {
    // Go to next calendar day
    const current = new Date(selectedTradeDate.value)
    current.setDate(current.getDate() + 1)
    selectedTradeDate.value = current.toISOString().split('T')[0]
  }
}

// Group filtered tickets by position (symbol + strategy + strikes + expiry)
const groupedTrades = computed(() => {
  const groups = new Map()

  filteredTickets.value.forEach(ticket => {
    const legs = ticket.strategies[0]?.legs || []
    if (legs.length === 0) return

    const strategyName = ticket.strategies[0]?.name || ticket.symbol + ' Strategy'
    const uniqueStrikes = [...new Set(legs.map(l => l.strike))].sort((a, b) => a - b).join('/')
    const expiries = [...new Set(legs.map(l => l.expiry))].sort().join(',')
    const key = `${ticket.symbol}|${strategyName}|${uniqueStrikes}|${expiries}`

    if (!groups.has(key)) {
      groups.set(key, {
        symbol: ticket.symbol,
        strategyName,
        strikes: uniqueStrikes,
        expiry: legs[0].expiry, // Primary expiry for display
        expiries, // All expiries (for calendars/diagonals)
        tickets: [],
        totalPnL: 0,
        totalQuantity: 0,
        wins: 0,
        losses: 0,
        openCount: 0
      })
    }

    const group = groups.get(key)
    group.tickets.push(ticket)
    group.totalPnL += (ticket.pnl || 0)
    group.totalQuantity += legs[0].quantity

    if (ticket.status === 'WIN') group.wins++
    else if (ticket.status === 'LOSS') group.losses++
    else if (ticket.status === 'OPEN') group.openCount++
  })

  return Array.from(groups.values()).sort((a, b) => b.totalPnL - a.totalPnL)
})

// Group trades by symbol for top-level organization
const groupedBySymbol = computed(() => {
  const symbolMap = new Map()

  groupedTrades.value.forEach(group => {
    if (!symbolMap.has(group.symbol)) {
      symbolMap.set(group.symbol, {
        symbol: group.symbol,
        groups: [],
        totalPnL: 0
      })
    }
    const symbolGroup = symbolMap.get(group.symbol)
    symbolGroup.groups.push(group)
    symbolGroup.totalPnL += group.totalPnL
  })

  return Array.from(symbolMap.values()).sort((a, b) => b.totalPnL - a.totalPnL)
})

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
