<template>
  <div class="min-h-screen bg-gray-900 flex flex-col">
    <!-- Main Content -->
    <main class="flex-1 max-w-6xl mx-auto px-4 py-6 pb-16 overflow-auto">
      <!-- Calendar Tab -->
      <div v-if="activeTab === 'calendar'" class="w-[630px] max-w-full mx-auto">
        <!-- Monthly P&L Dashboard -->
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold" :class="monthlySummary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ monthlySummary.totalPnL >= 0 ? '+' : '' }}${{ monthlySummary.totalPnL.toFixed(0) }}
              </div>
              <div class="text-xs text-gray-500">Month P&L</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{{ monthlySummary.count }}</div>
              <div class="text-xs text-gray-500">Trades Closed</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-400">{{ monthlySummary.winRate }}%</div>
              <div class="text-xs text-gray-500">Win Rate</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-400">{{ monthlySummary.profitFactor.toFixed(1) }}x</div>
              <div class="text-xs text-gray-500">Profit Factor</div>
            </div>
          </div>
        </div>

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
              <h2 class="text-lg font-semibold text-white w-32 text-center">{{ formatMonth(currentMonth) }}</h2>
              <button @click="nextMonth" class="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">
                <i class="fas fa-chevron-right"></i>
              </button>
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
          <div class="grid grid-cols-7 grid-rows-5 gap-1">
            <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="text-center text-xs text-gray-500 py-2">
              {{ day }}
            </div>
            <div
              v-for="day in calendarDays"
              :key="day.date"
              @click="selectDate(day.date)"
              :class="[
                'p-2 text-center rounded cursor-pointer text-sm transition-colors h-16 flex flex-col justify-center',
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
        </div>
      </div>

      <!-- Trades Tab -->
      <div v-if="activeTab === 'trades'" class="w-[630px] max-w-full mx-auto">
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

        <!-- Day Navigation with P&L Dashboard -->
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <!-- P&L Dashboard -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center">
              <div class="text-2xl font-bold" :class="tradeSummary?.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ tradeSummary?.totalPnL >= 0 ? '+' : '' }}${{ (tradeSummary?.totalPnL || 0).toFixed(0) }}
              </div>
              <div class="text-xs text-gray-500">P&L</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{{ tradeSummary?.count || 0 }}</div>
              <div class="text-xs text-gray-500">Trades</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-400">{{ tradeSummary?.winRate || 0 }}%</div>
              <div class="text-xs text-gray-500">Win Rate</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-400">{{ (tradeSummary?.profitFactor || 0).toFixed(1) }}x</div>
              <div class="text-xs text-gray-500">Profit Factor</div>
            </div>
          </div>
          <!-- Date Navigation -->
          <div class="flex items-center justify-between">
            <button @click="prevDay" class="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors">
              <i class="fas fa-chevron-left"></i>
            </button>
            <div class="flex-1 text-center">
              <input ref="datePickerInput" type="text" readonly :value="tradeDateDisplay" class="bg-transparent text-base font-semibold text-white text-center cursor-pointer hover:bg-gray-700 px-4 py-1 rounded focus:outline-none">
            </div>
            <button @click="nextDay" class="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800 rounded-lg p-3 mb-6 flex gap-3 flex-wrap items-center">
          <input v-model="filters.symbol" type="text" placeholder="Search symbol..." class="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm flex-1 min-w-40">
          <select v-model="filters.status" class="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm">
            <option value="">All Status</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
          </select>
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
                      <span class="text-gray-600 text-xs">P&L</span>
                      <span class="font-mono font-bold text-base" :class="group.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ group.totalPnL >= 0 ? '+' : '' }}${{ group.totalPnL.toFixed(0) }}
                      </span>
                    </div>
                    <span class="text-gray-700">=</span>
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

      <!-- Dashboard Tab -->
      <div v-if="activeTab === 'dashboard'" class="w-[630px] max-w-full mx-auto">
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <!-- Year Selector -->
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-white">Yearly P&L Dashboard</h2>
            <select v-model="selectedDashboardYear" class="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600">
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold" :class="yearlySummary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ yearlySummary.totalPnL >= 0 ? '+' : '' }}${{ yearlySummary.totalPnL.toFixed(0) }}
              </div>
              <div class="text-xs text-gray-500">Total P&L</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{{ yearlySummary.totalTrades }}</div>
              <div class="text-xs text-gray-500">Total Trades</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-400">{{ yearlySummary.winRate }}%</div>
              <div class="text-xs text-gray-500">Win Rate</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-400">{{ yearlySummary.profitFactor.toFixed(1) }}x</div>
              <div class="text-xs text-gray-500">Profit Factor</div>
            </div>
          </div>
        </div>

        <!-- Monthly P&L Calendar -->
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 class="text-sm font-semibold text-gray-300 mb-3">Monthly P&L ({{ selectedDashboardYear }})</h3>
          <div class="grid grid-cols-3 md:grid-cols-4 gap-2">
            <div
              v-for="month in yearlySummary.allMonthsData"
              :key="month.month"
              :class="[
                'p-3 rounded cursor-pointer transition-colors min-h-20 flex flex-col justify-center',
                month.count === 0 ? 'bg-gray-700/30 text-gray-600' : 'bg-gray-700/50 hover:bg-gray-700',
                month.pnl > 0 ? 'hover:bg-green-900/30' : month.pnl < 0 ? 'hover:bg-red-900/30' : ''
              ]"
            >
              <div class="text-sm font-semibold mb-1">{{ month.name }}</div>
              <div v-if="month.count > 0" class="font-mono font-bold text-base" :class="month.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ month.pnl >= 0 ? '+' : '' }}${{ month.pnl.toFixed(0) }}
              </div>
              <div v-else class="text-xs text-gray-600">No trades</div>
              <div v-if="month.count > 0" class="text-xs text-gray-500 mt-1">{{ month.count }} trade{{ month.count !== 1 ? 's' : '' }}</div>
            </div>
          </div>
        </div>

        <!-- Performance by Strategy -->
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 class="text-sm font-semibold text-gray-300 mb-3">Performance by Strategy</h3>
          <div class="space-y-2 max-h-80 overflow-y-auto">
            <div v-for="strat in yearlySummary.strategyPerformance" :key="strat.strategy" class="bg-gray-700/50 rounded overflow-hidden">
              <div class="px-4 py-3 flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1">
                  <span class="text-base font-bold text-white flex-1">{{ strat.strategy }}</span>
                  <span class="text-xs text-gray-500">{{ strat.totalTrades }} trade{{ strat.totalTrades !== 1 ? 's' : '' }}</span>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <div class="text-xs text-gray-500">Win Rate</div>
                    <div class="text-sm font-semibold" :class="strat.winRate >= 50 ? 'text-green-400' : 'text-red-400'">{{ strat.winRate }}%</div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-gray-500">P&L</div>
                    <div class="font-mono font-bold text-base" :class="strat.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ strat.totalPnL >= 0 ? '+' : '' }}${{ strat.totalPnL.toFixed(0) }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="px-4 pb-2 flex items-center gap-4 text-xs text-gray-400">
                <span>{{ strat.wins }}W / {{ strat.losses }}L</span>
                <span>Avg Win: ${{ strat.avgWin.toFixed(0) }}</span>
                <span>Avg Loss: ${{ strat.avgLoss.toFixed(0) }}</span>
                <span>PF: {{ strat.profitFactor.toFixed(1) }}x</span>
              </div>
            </div>
          </div>
        </div>

        <!-- All Options Trades for Year -->
        <div class="bg-gray-800 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-gray-300 mb-3">All Options Trades ({{ selectedDashboardYear }})</h3>
          <!-- Search Input -->
          <div class="mb-3">
            <input
              v-model="dashboardSearchQuery"
              type="text"
              placeholder="Search symbols..."
              class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            >
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div v-for="symbolGroup in filteredDashboardSymbols" :key="symbolGroup.symbol" class="bg-gray-700/50 rounded overflow-hidden">
              <!-- Symbol Header -->
              <div class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-700" @click="toggleDashboardSymbol(symbolGroup.symbol)">
                <div class="flex items-center gap-3">
                  <i class="fas fa-chevron-right text-gray-500 text-xs transition-transform" :class="{ 'rotate-90': expandedDashboardSymbols.has(symbolGroup.symbol) }"></i>
                  <span class="text-lg font-bold text-white">{{ symbolGroup.displaySymbol }}</span>
                  <span class="text-xs text-gray-500">{{ symbolGroup.trades.length }} trade{{ symbolGroup.trades.length > 1 ? 's' : '' }}</span>
                </div>
                <span class="font-mono font-bold text-base" :class="symbolGroup.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ symbolGroup.totalPnL >= 0 ? '+' : '' }}${{ symbolGroup.totalPnL.toFixed(0) }}
                </span>
              </div>
              <!-- Trades under symbol -->
              <div v-show="expandedDashboardSymbols.has(symbolGroup.symbol)" class="border-t border-gray-600">
                <div v-for="trade in symbolGroup.trades" :key="trade.id" class="px-4 py-2 flex items-center justify-between hover:bg-gray-700/50 cursor-pointer border-b border-gray-600/50 last:border-0" @click="selectedPositionGroup = trade.positionGroup">
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-500 w-20">{{ trade.exitDate }}</span>
                    <span class="text-sm text-gray-400">{{ trade.strategy }} {{ trade.strikes }}</span>
                    <span class="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">{{ trade.expiry }}</span>
                  </div>
                  <span class="font-mono font-bold text-sm" :class="trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ trade.pnl >= 0 ? '+' : '' }}${{ trade.pnl.toFixed(0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Tab Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex">
          <button
            @click="navigateTo('calendar')"
            :class="[
              'flex-1 py-2 text-center transition-colors',
              activeTab === 'calendar' ? 'text-green-500 border-t-2 border-green-500' : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            <i class="fas fa-calendar-alt text-lg"></i>
            <div class="text-xs">Calendar</div>
          </button>
          <button
            @click="navigateTo('trades')"
            :class="[
              'flex-1 py-2 text-center transition-colors',
              activeTab === 'trades' ? 'text-green-500 border-t-2 border-green-500' : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            <i class="fas fa-list text-lg"></i>
            <div class="text-xs">Trades</div>
          </button>
          <button
            @click="navigateTo('dashboard')"
            :class="[
              'flex-1 py-2 text-center transition-colors',
              activeTab === 'dashboard' ? 'text-green-500 border-t-2 border-green-500' : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            <i class="fas fa-chart-line text-lg"></i>
            <div class="text-xs">Dashboard</div>
          </button>
          <button
            @click="openCsvPicker"
            :disabled="isUploading"
            :class="[
              'flex-1 py-2 text-center transition-colors relative',
              isUploading ? 'text-gray-600 cursor-wait' : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            <i class="fas fa-upload text-lg"></i>
            <div class="text-xs">Upload ({{ tickets.length }})</div>
            <div v-if="uploadMessage" class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {{ uploadMessage }}
            </div>
          </button>
          <button
            @click="showSettingsModal = true"
            class="flex-1 py-2 text-center text-gray-400 hover:text-gray-300 transition-colors"
          >
            <i class="fas fa-cog text-lg"></i>
            <div class="text-xs">Settings</div>
          </button>
        </div>
      </div>
    </nav>

    <!-- Hidden file input for CSV upload -->
    <input
      ref="csvInputRef"
      type="file"
      accept=".csv"
      @change="handleCsvUpload"
      class="hidden"
    >

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

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="showSettingsModal = false">
      <div class="bg-gray-800 rounded-lg max-w-md w-full">
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 class="text-lg font-bold text-white">Settings</h3>
          <button @click="showSettingsModal = false" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-4 space-y-4">
          <!-- Proxy URL Section -->
          <div>
            <h4 class="text-sm font-medium text-gray-300 mb-2">API Proxy</h4>
            <label class="block text-xs text-gray-500 mb-1">Custom proxy URL (optional)</label>
            <input
              v-model="settings.proxyUrl"
              type="text"
              placeholder="https://your-proxy.com/fetchJson?url={url}"
              class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            >
            <p class="text-xs text-gray-500 mt-1">Use {url} as placeholder for the target URL. Required for fetching prices.</p>
          </div>

          <!-- Backup Section -->
          <div class="border-t border-gray-700 pt-4">
            <h4 class="text-sm font-medium text-gray-300 mb-2">Backup & Restore</h4>
            <div class="flex gap-2 mb-2">
              <button
                @click="exportBackup"
                class="flex-1 text-sm bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded transition-colors"
              >
                <i class="fas fa-download mr-1"></i> Export Backup
              </button>
              <button
                @click="triggerImportBackup"
                class="flex-1 text-sm bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded transition-colors"
              >
                <i class="fas fa-upload mr-1"></i> Import Backup
              </button>
            </div>
            <input
              ref="backupFileInput"
              type="file"
              accept=".json"
              @change="importBackup"
              class="hidden"
            >
            <p class="text-xs text-gray-500 mt-1">Export all trades and settings, or restore from a backup file</p>
          </div>

          <!-- Data Management Section -->
          <div class="border-t border-gray-700 pt-4">
            <h4 class="text-sm font-medium text-gray-300 mb-2">Data Management</h4>
            <div class="flex gap-2">
              <button
                @click="clearPriceCache"
                class="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded transition-colors"
              >
                Clear Price Cache
              </button>
              <button
                @click="clearAllData"
                class="flex-1 text-sm bg-red-900/50 hover:bg-red-900/70 text-red-300 px-3 py-2 rounded transition-colors"
              >
                Clear All Trading Data
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">Clear cached prices or permanently delete all data</p>
          </div>
        </div>

        <div class="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            @click="showSettingsModal = false"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            Close
          </button>
          <button
            @click="saveSettings"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SummaryCards from './components/SummaryCards.vue'
import { detectStrategy, getStrategyDisplayName } from './utils/strategyDetector.js'
import TradeFormModal from './components/TradeFormModal.vue'
import MiniCalendarDots from './components/MiniCalendarDots.vue'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'
import 'flatpickr/dist/themes/dark.css'

const router = useRouter()
const route = useRoute()

// Local storage keys
const STORAGE_KEY = 'trading_journal_tickets'
const RAW_TRANSACTIONS_KEY = 'trading_journal_raw_transactions'

const tickets = ref([])
const rawTransactions = ref([])  // Store all raw CSV transactions for re-matching
const showAddModal = ref(false)
const showSettingsModal = ref(false)

// Active tab state - synced with route
const activeTab = ref(route.name || 'calendar')

// Navigate to a tab and update URL
const navigateTo = (tab) => {
  activeTab.value = tab
  router.push({ name: tab })
}

// Watch route changes and update active tab
watch(() => route.name, (newName) => {
  if (newName && ['calendar', 'trades', 'dashboard'].includes(newName)) {
    activeTab.value = newName
  }
})

// Settings
const SETTINGS_KEY = 'trading_journal_settings'
const settings = ref({})

// Load settings from localStorage
const loadSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      settings.value = JSON.parse(saved)
    }
  } catch {
    // Ignore errors
  }
}

// Save settings to localStorage
const saveSettings = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
    showSettingsModal.value = false
    uploadMessage.value = 'Settings saved'
    setTimeout(() => uploadMessage.value = '', 2000)
  } catch {
    uploadMessage.value = 'Failed to save settings'
    setTimeout(() => uploadMessage.value = '', 2000)
  }
}

// Clear price cache
const clearPriceCache = () => {
  try {
    localStorage.removeItem(PRICE_CACHE_KEY)
    uploadMessage.value = 'Price cache cleared'
    setTimeout(() => uploadMessage.value = '', 2000)
  } catch {
    uploadMessage.value = 'Failed to clear cache'
    setTimeout(() => uploadMessage.value = '', 2000)
  }
}

// Backup file input ref
const backupFileInput = ref(null)

// Export all data to JSON backup file
const exportBackup = () => {
  try {
    const backup = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      tickets: tickets.value,
      rawTransactions: rawTransactions.value,
      settings: settings.value
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trading-journal-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    uploadMessage.value = 'Backup exported successfully'
    setTimeout(() => uploadMessage.value = '', 2000)
  } catch (err) {
    uploadMessage.value = 'Failed to export backup'
    setTimeout(() => uploadMessage.value = '', 2000)
  }
}

// Trigger the file input for import
const triggerImportBackup = () => {
  backupFileInput.value?.click()
}

// Import data from JSON backup file
const importBackup = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target?.result)
      if (!backup.tickets || !Array.isArray(backup.tickets)) {
        throw new Error('Invalid backup file')
      }

      // Confirm with user
      if (confirm(`Import backup from ${new Date(backup.exportDate).toLocaleDateString()}?\n\nThis will replace all current data. Continue?`)) {
        tickets.value = backup.tickets || []
        rawTransactions.value = backup.rawTransactions || []
        if (backup.settings) {
          settings.value = { ...settings.value, ...backup.settings }
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.value))
        localStorage.setItem(RAW_TRANSACTIONS_KEY, JSON.stringify(rawTransactions.value))
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))

        uploadMessage.value = 'Backup imported successfully'
        setTimeout(() => uploadMessage.value = '', 2000)
        showSettingsModal.value = false
      }
    } catch {
      uploadMessage.value = 'Failed to import backup: invalid file'
      setTimeout(() => uploadMessage.value = '', 2000)
    }
  }
  reader.readAsText(file)
  // Reset file input
  event.target.value = ''
}

const csvInputRef = ref(null)
const isUploading = ref(false)
const uploadMessage = ref('')

// Load tickets from localStorage on mount
const loadTicketsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      tickets.value = JSON.parse(stored)
    }
  } catch (e) {
    console.error('Error loading tickets from storage:', e)
  }
}

// Load raw transactions from localStorage
const loadRawTransactions = () => {
  try {
    const stored = localStorage.getItem(RAW_TRANSACTIONS_KEY)
    if (stored) {
      rawTransactions.value = JSON.parse(stored)
    }
  } catch (e) {
    console.error('Error loading raw transactions from storage:', e)
  }
}

// Save tickets to localStorage
const saveTicketsToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.value))
  } catch (e) {
    console.error('Error saving tickets to storage:', e)
  }
}

// Save raw transactions to localStorage
const saveRawTransactions = () => {
  try {
    localStorage.setItem(RAW_TRANSACTIONS_KEY, JSON.stringify(rawTransactions.value))
  } catch (e) {
    console.error('Error saving raw transactions to storage:', e)
  }
}

// Handle CSV file upload
const handleCsvUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  isUploading.value = true
  uploadMessage.value = 'Processing...'

  try {
    const text = await file.text()

    // Find the maximum ticket ID to avoid conflicts
    const maxTicketId = tickets.value.length > 0 ? Math.max(...tickets.value.map(t => t.ticket)) : 999

    const parsedTickets = await parseCSV(text, maxTicketId + 1)

    if (parsedTickets.length === 0) {
      uploadMessage.value = 'No valid tickets found in CSV'
      setTimeout(() => uploadMessage.value = '', 3000)
      return
    }

    // Check for auto-generated tickets that can be updated with real exit data
    let updatedCount = 0
    const autoGeneratedTickets = tickets.value.filter(t => t.isAutoGenerated && t.originalTicketId)

    for (const newTicket of parsedTickets) {
      // Only check closed tickets (with exit_date)
      if (!newTicket.exit_date) continue

      // Try to find matching auto-generated ticket
      for (const autoTicket of autoGeneratedTickets) {
        if (autoTicket.symbol !== newTicket.symbol) continue
        if (autoTicket.date !== newTicket.date) continue

        // Check if legs match (same strikes, types, expiry)
        const autoLegs = autoTicket.strategies[0].legs
        const newLegs = newTicket.strategies[0].legs

        // For closed tickets, legs contain both entry and exit - take only first half
        const entryLegsCount = autoLegs.length
        const newEntryLegs = newLegs.slice(0, entryLegsCount)

        if (newEntryLegs.length !== entryLegsCount) continue

        const legsMatch = autoLegs.every((al, i) => {
          const nl = newEntryLegs[i]
          return al.strike === nl.strike &&
                 al.type === nl.type &&
                 al.expiry === nl.expiry &&
                 al.quantity === nl.quantity
        })

        if (legsMatch) {
          // Found a match! Update the auto-generated ticket with real exit data
          autoTicket.status = newTicket.status
          autoTicket.exit_date = newTicket.exit_date
          autoTicket.pnl = newTicket.pnl
          autoTicket.strategies[0].exit_time = newTicket.strategies[0].exit_time
          autoTicket.strategies[0].exit_price = newTicket.strategies[0].exit_price
          autoTicket.notes = newTicket.notes
          delete autoTicket.isAutoGenerated  // No longer auto-generated
          delete autoTicket.originalTicketId
          updatedCount++
          break
        }
      }
    }

    // Check for OPEN tickets that can be closed with new exit data
    const openTickets = tickets.value.filter(t => t.status === 'OPEN')

    for (const newTicket of parsedTickets) {
      // Only check closed tickets (with exit_date)
      if (!newTicket.exit_date) continue

      // Skip if already matched as auto-generated
      let alreadyMatched = false
      for (const autoTicket of autoGeneratedTickets) {
        if (!autoTicket.isAutoGenerated && autoTicket.ticket === newTicket.ticket) {
          alreadyMatched = true
          break
        }
      }
      if (alreadyMatched) continue

      // Try to find matching OPEN ticket
      for (const openTicket of openTickets) {
        if (openTicket.symbol !== newTicket.symbol) continue

        // Check if legs match (same strikes, types, expiry) - don't compare entry dates!
        const openLegs = openTicket.strategies[0].legs
        const newLegs = newTicket.strategies[0].legs

        // For closed tickets, legs contain both entry and exit - take only first half
        const entryLegsCount = openLegs.length
        const newEntryLegs = newLegs.slice(0, entryLegsCount)

        if (newEntryLegs.length !== entryLegsCount) continue

        const legsMatch = openLegs.every((ol, i) => {
          const nl = newEntryLegs[i]
          return ol.strike === nl.strike &&
                 ol.type === nl.type &&
                 ol.expiry === nl.expiry &&
                 ol.action === nl.action &&
                 ol.quantity === nl.quantity
        })

        if (legsMatch) {
          // Found a match! Update the OPEN ticket with exit data
          openTicket.status = newTicket.status
          openTicket.exit_date = newTicket.exit_date
          openTicket.pnl = newTicket.pnl
          openTicket.strategies[0].exit_time = newTicket.strategies[0].exit_time
          openTicket.strategies[0].exit_price = newTicket.strategies[0].exit_price
          // Update legs to include exit legs
          openTicket.strategies[0].legs = newLegs
          updatedCount++
          // Mark this new ticket as already handled (don't add to tickets)
          newTicket._skip = true
          break
        }
      }
    }

    // Helper function to create a unique key for a ticket
    const getTicketKey = (ticket) => {
      const legs = ticket.strategies[0].legs
      const legsKey = legs.map(l =>
        `${l.action}|${l.type}|${l.strike}|${l.expiry}|${l.quantity}`
      ).sort().join('||')
      return `${ticket.symbol}|${ticket.date}|${ticket.exit_date || ''}|${legsKey}`
    }

    // Get existing ticket keys to prevent duplicates
    const existingTicketKeys = new Set(tickets.value.map(t => getTicketKey(t)))
    const existingTicketIds = new Set(tickets.value.map(t => t.ticket))

    // Filter out duplicates and skipped tickets
    const newTickets = []
    let duplicateCount = 0

    for (const t of parsedTickets) {
      if (t._skip) continue // Already handled by cross-file matching
      if (existingTicketIds.has(t.ticket)) continue // Skip exact ID matches

      const key = getTicketKey(t)
      if (existingTicketKeys.has(key)) {
        duplicateCount++
        continue
      }

      newTickets.push(t)
      existingTicketKeys.add(key)
    }

    // Merge new tickets with existing ones
    tickets.value = [...tickets.value, ...newTickets].sort((a, b) => a.ticket - b.ticket)

    // Save to storage
    saveTicketsToStorage()

    // Show message
    let message = `Loaded ${newTickets.length} new ticket${newTickets.length !== 1 ? 's' : ''}`
    if (updatedCount > 0) {
      const autoUpdated = autoGeneratedTickets.filter(t => !t.isAutoGenerated).length
      const openClosed = updatedCount - autoUpdated
      const parts = []
      if (autoUpdated > 0) parts.push(`${autoUpdated} auto-generated`)
      if (openClosed > 0) parts.push(`${openClosed} open`)
      message += ` (updated ${parts.join(' + ')} ticket${updatedCount > 1 ? 's' : ''} with exit data)`
    }
    if (duplicateCount > 0) {
      message += ` (${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} skipped)`
    }
    uploadMessage.value = message
    setTimeout(() => uploadMessage.value = '', 3000)

  } catch (e) {
    console.error('Error parsing CSV:', e)
    uploadMessage.value = 'Error parsing CSV file'
    setTimeout(() => uploadMessage.value = '', 3000)
  } finally {
    isUploading.value = false
    // Reset input
    if (csvInputRef.value) {
      csvInputRef.value.value = ''
    }
  }
}

// Open file picker
const openCsvPicker = () => {
  const input = csvInputRef.value
  if (input) {
    input.click()
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split(' ')[0].split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
  return dateStr
}

function compareDates(timeA, timeB) {
  const dateA = timeA ? new Date(timeA) : new Date(0)
  const dateB = timeB ? new Date(timeB) : new Date(0)
  return dateA.getTime() - dateB.getTime()
}

function parseOptionSymbol(symbol) {
  if (!symbol) return null
  const match = symbol.match(/^([A-Z]+)2?(\d{2})(\d{2})(\d{2})([CP])(\d+)$/)
  if (match) {
    const [, underlying, year, month, day, type, strike] = match
    return { underlying, year: `20${year}`, month, day, date: `20${year}-${month}-${day}`, type: type === 'C' ? 'call' : 'put', strike: parseInt(strike) / 1000 }
  }
  return null
}

function generateSingleOptionName(opt) {
  const capitalType = opt.type.charAt(0).toUpperCase() + opt.type.slice(1)
  const expiryMonth = opt.date.substring(5, 7) + '/' + opt.date.substring(8, 10)
  return `${opt.underlying} ${capitalType} $${opt.strike} ${expiryMonth}`
}

// =====================================================
// CATEGORIZATION
// =====================================================

function categorizeRow(row) {
  const { name, symbol, side, status, filled } = row

  // Skip cancelled orders
  if (status !== 'Filled' || filled === 0) return null

  // Single options: when name equals symbol
  if (name && symbol && name === symbol) {
    const opt = parseOptionSymbol(symbol)
    if (!opt) return null
    if (opt.type === 'call') return side === 'Buy' ? 'long_call' : 'short_call'
    else return side === 'Buy' ? 'long_put' : 'short_put'
  }

  // Multi-leg strategies (header row: has name, no symbol)
  if (name && !symbol) {
    const nameLower = name.toLowerCase()
    // Skip diagonal spreads - treat legs as individual single options
    if (nameLower.includes('diagonal')) return null
    if (nameLower.includes('vertical') || nameLower.includes('spread')) return 'vertical_spread'
    if (nameLower.includes('iron condor') || nameLower.includes('condor')) return 'iron_condor'
    if (nameLower.includes('straddle')) return 'straddle'
    if (nameLower.includes('strangle')) return 'strangle'
    return 'vertical_spread' // Default multi-leg to vertical
  }

  // Single options (has symbol, no name)
  if (symbol && !name) {
    const opt = parseOptionSymbol(symbol)
    if (!opt) return null
    if (opt.type === 'call') return side === 'Buy' ? 'long_call' : 'short_call'
    else return side === 'Buy' ? 'long_put' : 'short_put'
  }

  return null
}

function categorizeAllRows(rows) {
  const categorized = { vertical_spread: [], iron_condor: [], straddle: [], strangle: [], long_call: [], short_call: [], long_put: [], short_put: [] }
  let currentHeader = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Single option: name equals symbol
    if (row.name && row.symbol && row.name === row.symbol) {
      currentHeader = null
      const bucket = categorizeRow(row)
      if (bucket) categorized[bucket].push(row)
      continue
    }

    // Header row (has name, no symbol)
    if (row.name && !row.symbol) {
      currentHeader = { ...row, legs: [] }
      const bucket = categorizeRow(row)
      // Skip diagonal headers - don't create a spread ticket
      if (bucket) {
        const nameLower = row.name.toLowerCase()
        if (!nameLower.includes('diagonal')) {
          categorized[bucket].push(currentHeader)
        }
      }
      continue
    }

    // Leg row (has symbol, no name, and we have a header)
    if (row.symbol && !row.name && currentHeader) {
      // For diagonals, treat legs as single options
      const headerNameLower = currentHeader.name?.toLowerCase() || ''
      if (headerNameLower.includes('diagonal')) {
        currentHeader = null
        const bucket = categorizeRow(row)
        if (bucket) categorized[bucket].push(row)
        continue
      }
      currentHeader.legs.push(row)
      continue
    }

    // Single option (no header, has symbol)
    if (row.symbol && !row.name) {
      currentHeader = null
      const bucket = categorizeRow(row)
      if (bucket) categorized[bucket].push(row)
    }
  }

  return categorized
}

// =====================================================
// STRATEGY PROCESSORS
// =====================================================

function processVerticalSpread(header) {
  if (!header.legs || header.legs.length < 2) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processIronCondor(header) {
  if (!header.legs || header.legs.length < 4) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processStraddle(header) {
  if (!header.legs || header.legs.length < 2) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processStrangle(header) {
  if (!header.legs || header.legs.length < 2) return []

  return [{
    ticketName: header.name,
    side: header.side,
    status: header.status,
    filledTime: header.filledTime,
    legs: header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)
  }]
}

function processSingleOption(row) {
  const opt = parseOptionSymbol(row.symbol)
  if (!opt) return []

  return [{
    ticketName: generateSingleOptionName(opt),
    side: row.side,
    status: row.status,
    filledTime: row.filledTime,
    legs: [{ ...opt, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
  }]
}

// =====================================================
// MATCHING FUNCTIONS
// =====================================================

function matchMultiLeg(tradesList, startTicketId) {
  const tickets = []
  let ticketId = startTicketId

  // Group by leg signature
  const sigGroups = {}
  for (const t of tradesList) {
    const sig = t.legs.map(l => `${l.strike}-${l.type}-${l.date}`).sort().join('|')
    if (!sigGroups[sig]) sigGroups[sig] = []
    sigGroups[sig].push(t)
  }

  for (const group of Object.values(sigGroups)) {
    group.sort((a, b) => compareDates(a.filledTime, b.filledTime))
    const openPositions = []

    for (const trade of group) {
      const isCredit = trade.side === 'Sell'
      const qty = trade.legs[0].quantity

      if (isCredit) {
        let remaining = qty
        for (let i = 0; i < openPositions.length && remaining > 0; i++) {
          const pos = openPositions[i]
          if (!pos.isCredit && pos.remaining > 0) {
            const closeQty = Math.min(remaining, pos.remaining)
            const pnl = calcPnL(pos.trade, trade, closeQty)
            tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
            pos.remaining -= closeQty
            remaining -= closeQty
            if (pos.remaining <= 0) { openPositions.splice(i, 1); i-- }
          }
        }
        if (remaining > 0) openPositions.push({ trade, remaining, isCredit: true })
      } else {
        let remaining = qty
        for (let i = 0; i < openPositions.length && remaining > 0; i++) {
          const pos = openPositions[i]
          if (pos.isCredit && pos.remaining > 0) {
            const closeQty = Math.min(remaining, pos.remaining)
            const pnl = calcPnL(pos.trade, trade, closeQty)
            tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
            pos.remaining -= closeQty
            remaining -= closeQty
            if (pos.remaining <= 0) { openPositions.splice(i, 1); i-- }
          }
        }
        if (remaining > 0) openPositions.push({ trade, remaining, isCredit: false })
      }
    }

    for (const pos of openPositions) {
      if (pos.remaining > 0) {
        tickets.push(createOpenTicket(pos.trade, pos.remaining, ticketId++))
      }
    }
  }

  return tickets
}

function matchSingleOptions(tradesList, startTicketId) {
  const tickets = []
  let ticketId = startTicketId

  // Group by symbol
  const symbolGroups = {}
  for (const t of tradesList) {
    const sym = t.ticketName
    if (!symbolGroups[sym]) symbolGroups[sym] = []
    symbolGroups[sym].push(t)
  }

  for (const [symbol, group] of Object.entries(symbolGroups)) {
    group.sort((a, b) => compareDates(a.filledTime, b.filledTime))

    const openPositions = []

    for (const trade of group) {
      const isLong = trade.side === 'Buy'
      const qty = trade.legs[0].quantity
      let remaining = qty

      // Try to close opposite positions
      for (let i = 0; i < openPositions.length && remaining > 0; i++) {
        const pos = openPositions[i]
        if (pos.isLong !== isLong && pos.remaining > 0) {
          const closeQty = Math.min(remaining, pos.remaining)
          let pnl = 0
          if (pos.isLong) {
            pnl = (trade.legs[0].premium - pos.trade.legs[0].premium) * closeQty * 100
          } else {
            pnl = (pos.trade.legs[0].premium - trade.legs[0].premium) * closeQty * 100
          }
          tickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, ticketId++))
          pos.remaining -= closeQty
          remaining -= closeQty
          if (pos.remaining <= 0) { openPositions.splice(i, 1); i-- }
        }
      }

      if (remaining > 0) {
        openPositions.push({ trade, remaining, isLong })
      }
    }

    for (const pos of openPositions) {
      if (pos.remaining > 0) {
        tickets.push(createOpenTicket(pos.trade, pos.remaining, ticketId++))
      }
    }
  }

  return tickets
}

// =====================================================
// P&L CALCULATION
// =====================================================

function calcPnL(open, close, qty) {
  let pnl = 0
  for (const ol of open.legs) {
    const cl = close.legs.find(l => l.strike === ol.strike && l.type === ol.type && l.date === ol.date)
    if (cl) {
      if (ol.side === 'Buy') pnl += (cl.premium - ol.premium) * qty * 100
      else pnl -= (cl.premium - ol.premium) * qty * 100
    }
  }
  return pnl
}

// =====================================================
// TICKET CREATION
// =====================================================

function createClosedTicket(openTrade, closeTrade, qty, pnl, num) {
  const isOpen = compareDates(openTrade.filledTime, closeTrade.filledTime) < 0
  const first = isOpen ? openTrade : closeTrade
  const second = isOpen ? closeTrade : openTrade
  const legs = []

  for (const l of first.legs) legs.push({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() })
  for (const l of second.legs) legs.push({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() })

  return { ticket: num, date: formatDate(first.filledTime), symbol: first.legs[0]?.underlying || first.ticketName.split(' ')[0], status: pnl >= 0 ? 'WIN' : 'LOSS', exit_date: formatDate(second.filledTime), pnl: Math.round(pnl), strategies: [{ name: first.ticketName, legs, entry_time: first.filledTime || first.placedTime || '', entry_price: null, exit_time: second.filledTime || second.placedTime || '', exit_price: null }], notes: first.ticketName }
}

function createOpenTicket(trade, qty, num) {
  const legs = trade.legs.map(l => ({ type: l.type, strike: l.strike, expiry: l.date, premium: l.premium, quantity: qty, action: l.side.toLowerCase() }))
  return { ticket: num, date: formatDate(trade.filledTime), symbol: trade.legs[0]?.underlying || trade.ticketName.split(' ')[0], status: 'OPEN', exit_date: null, pnl: 0, strategies: [{ name: trade.ticketName, legs, entry_time: trade.filledTime || trade.placedTime || '', entry_price: null, exit_time: '', exit_price: null }], notes: trade.ticketName }
}

// =====================================================
// STRATEGY PARSING FUNCTIONS
// =====================================================

function parseVerticalSpreads(verticalSpreadArray, startTicketId) {
  const tradesData = []

  for (const header of verticalSpreadArray) {
    if (!header.legs || header.legs.length < 2) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)

    if (parsedLegs.length >= 2) {
      tradesData.push({
        ticketName: header.name,
        side: header.side,
        status: header.status,
        filledTime: header.filledTime,
        legs: parsedLegs
      })
    }
  }

  return matchMultiLeg(tradesData, startTicketId)
}

function parseIronCondors(ironCondorArray, startTicketId) {
  const tradesData = []

  for (const header of ironCondorArray) {
    if (!header.legs || header.legs.length < 4) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)

    if (parsedLegs.length >= 4) {
      tradesData.push({
        ticketName: header.name,
        side: header.side,
        status: header.status,
        filledTime: header.filledTime,
        legs: parsedLegs
      })
    }
  }

  return matchMultiLeg(tradesData, startTicketId)
}

function parseStraddles(straddleArray, startTicketId) {
  const tradesData = []

  for (const header of straddleArray) {
    if (!header.legs || header.legs.length < 2) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)

    if (parsedLegs.length >= 2) {
      tradesData.push({
        ticketName: header.name,
        side: header.side,
        status: header.status,
        filledTime: header.filledTime,
        legs: parsedLegs
      })
    }
  }

  return matchMultiLeg(tradesData, startTicketId)
}

function parseStrangles(strangleArray, startTicketId) {
  const tradesData = []

  for (const header of strangleArray) {
    if (!header.legs || header.legs.length < 2) continue

    const parsedLegs = header.legs.map(l => {
      const opt = parseOptionSymbol(l.symbol)
      return { ...opt, side: l.side, quantity: l.filled, premium: l.avgPrice, filledTime: l.filledTime }
    }).filter(l => l.underlying)

    if (parsedLegs.length >= 2) {
      tradesData.push({
        ticketName: header.name,
        side: header.side,
        status: header.status,
        filledTime: header.filledTime,
        legs: parsedLegs
      })
    }
  }

  return matchMultiLeg(tradesData, startTicketId)
}

function parseSingleOptions(longArray, shortArray, startTicketId) {
  const longTrades = longArray.map(row => {
    const opt = parseOptionSymbol(row.symbol)
    if (!opt) return null
    return {
      ticketName: generateSingleOptionName(opt),
      side: row.side,
      status: row.status,
      filledTime: row.filledTime,
      legs: [{ ...opt, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
    }
  }).filter(t => t !== null)

  const shortTrades = shortArray.map(row => {
    const opt = parseOptionSymbol(row.symbol)
    if (!opt) return null
    return {
      ticketName: generateSingleOptionName(opt),
      side: row.side,
      status: row.status,
      filledTime: row.filledTime,
      legs: [{ ...opt, side: row.side, quantity: row.filled, premium: row.avgPrice, filledTime: row.filledTime }]
    }
  }).filter(t => t !== null)

  return matchSingleOptions([...longTrades, ...shortTrades], startTicketId)
}

// =====================================================
// EXPIRED POSITION HANDLING
// =====================================================

// Yahoo Finance API for historical prices (no API key required)
const PRICE_CACHE_KEY = 'trading_journal_price_cache'

// Symbol mapping for Yahoo Finance (uses ^ for indices)
const SYMBOL_MAP = {
  'VIXW': '^VIX',
  'SPXW': '^SPX',
  'VIX': '^VIX',
  'SPX': '^SPX',
  'NDX': '^NDX',
  'RUT': '^RUT'
}

function getYahooSymbol(symbol) {
  return SYMBOL_MAP[symbol] || symbol
}

// Get price from localStorage cache
function getCachedPrice(symbol, date) {
  try {
    const cache = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}')
    const key = `${symbol}_${date}`
    if (cache[key] !== undefined) {
      return cache[key]
    }
  } catch {
    return null
  }
  return null
}

// Save price to localStorage cache
function setCachedPrice(symbol, date, price) {
  try {
    const cache = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}')
    cache[`${symbol}_${date}`] = price
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore cache errors
  }
}

// Fetch historical price from Yahoo Finance API (no API key required)
async function getHistoricalPrice(symbol, dateStr) {
  const yahooSymbol = getYahooSymbol(symbol)

  // Check cache first
  const cached = getCachedPrice(yahooSymbol, dateStr)
  if (cached !== null) {
    return cached
  }

  try {
    // Convert date string to Unix timestamps
    const targetDate = new Date(dateStr)
    const startDate = new Date(targetDate)
    startDate.setDate(startDate.getDate() - 7)
    const endDate = new Date(targetDate)
    endDate.setDate(endDate.getDate() + 7)

    const period1 = Math.floor(startDate.getTime() / 1000)
    const period2 = Math.floor(endDate.getTime() / 1000)

    // Use CORS proxy for Yahoo Finance API
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d`

    // Use custom proxy URL from settings
    const customProxy = settings.value.proxyUrl?.trim()
    if (!customProxy) {
      throw new Error('No proxy URL configured. Please set a proxy URL in Settings.')
    }

    // Replace {url} placeholder with actual encoded URL
    const url = customProxy.replace('{url}', encodeURIComponent(yahooUrl))

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close &&
        data.chart?.result?.[0]?.timestamp) {
      const closes = data.chart.result[0].indicators.quote[0].close
      const timestamps = data.chart.result[0].timestamp

      // Find closest date to target
      const targetTimestamp = Math.floor(targetDate.getTime() / 1000)
      let closestDiff = Infinity
      let closestPrice = null

      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null) {
          const diff = Math.abs(timestamps[i] - targetTimestamp)
          if (diff < closestDiff) {
            closestDiff = diff
            closestPrice = closes[i]
          }
        }
      }

      if (closestPrice !== null) {
        const priceInCents = Math.round(closestPrice * 100)
        setCachedPrice(yahooSymbol, dateStr, priceInCents)
        return priceInCents
      }
    }

    setCachedPrice(yahooSymbol, dateStr, null)
    return null
  } catch (error) {
    console.error(`Error fetching price for ${yahooSymbol} on ${dateStr}:`, error.message)
    setCachedPrice(yahooSymbol, dateStr, null)
    return null
  }
}

function calculateIntrinsicValue(type, strike, stockPrice) {
  if (!stockPrice) return null
  stockPrice = stockPrice / 100
  if (type === 'call') return Math.max(0, stockPrice - strike)
  else return Math.max(0, strike - stockPrice)
}

async function processExpiredTickets(tickets, startTicketId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiredTickets = []
  const stillOpenTickets = []
  let ticketId = startTicketId

  for (const ticket of tickets) {
    if (ticket.status !== 'OPEN') {
      continue
    }

    const legs = ticket.strategies[0].legs
    if (legs.length === 0) {
      stillOpenTickets.push(ticket)
      continue
    }

    const expiryDateStr = legs[0].expiry
    if (!expiryDateStr) {
      stillOpenTickets.push(ticket)
      continue
    }

    const expiryDate = new Date(expiryDateStr)
    expiryDate.setHours(0, 0, 0, 0)

    if (expiryDate < today) {
      const symbol = ticket.symbol
      const stockPrice = await getHistoricalPrice(symbol, expiryDateStr)

      let pnl = 0
      let hasValidPrices = stockPrice !== null

      for (const leg of legs) {
        const intrinsicValue = calculateIntrinsicValue(leg.type, leg.strike, stockPrice)
        if (intrinsicValue === null) {
          hasValidPrices = false
          break
        }
        if (leg.action === 'buy') pnl += (intrinsicValue - leg.premium) * leg.quantity * 100
        else pnl += (leg.premium - intrinsicValue) * leg.quantity * 100
      }

      if (!hasValidPrices) {
        // Fallback: assume expired worthless
        pnl = 0
        for (const leg of legs) {
          if (leg.action === 'buy') pnl -= leg.premium * leg.quantity * 100
          else pnl += leg.premium * leg.quantity * 100
        }
      }

      expiredTickets.push({
        ticket: ticketId++,
        date: ticket.date,
        symbol: ticket.symbol,
        status: pnl >= 0 ? 'WIN' : 'LOSS',
        exit_date: expiryDateStr,
        pnl: Math.round(pnl),
        strategies: [{
          name: ticket.strategies[0].name,
          legs: legs.map(l => ({ ...l })),
          entry_time: ticket.strategies[0].entry_time,
          entry_price: null,
          exit_time: '',
          exit_price: stockPrice !== null ? (stockPrice / 100).toFixed(2) : null
        }],
        notes: ticket.notes + (stockPrice !== null ? ` (Expired @ $${(stockPrice / 100).toFixed(2)})` : ' (Expired - no price data)'),
        isAutoGenerated: true,  // Mark as auto-generated from expiration
        originalTicketId: ticket.ticket  // Reference to original opening ticket
      })
    } else {
      stillOpenTickets.push(ticket)
    }
  }

  return { expired: expiredTickets, open: stillOpenTickets, nextTicketId: ticketId }
}

// =====================================================
// MAIN ENTRY POINT - Parse Webull CSV
// =====================================================

// Browser-compatible CSV row parser (same as parseCsvRow in parse-webull.js)
function parseCsvRow(row) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current || null); current = '' }
    else { current += char }
  }
  result.push(current || null)
  return result
}

const parseCSV = async (csvText, startTicketId = 1000) => {
  const lines = csvText.split('\n').filter(line => line.trim())

  // Parse all rows using the same logic as parse-webull.js
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parsed = parseCsvRow(lines[i])
    if (parsed && parsed.length >= 11) {
      const [name, symbol, side, status, filled, totalQty, price, avgPrice, tif, placedTime, filledTime] = parsed
      rows.push({ name: name?.trim() || null, symbol: symbol?.trim() || null, side: side?.trim() || null, status: status?.trim() || null, filled: status === 'Filled' ? parseInt(filled) || 0 : 0, totalQty: parseInt(totalQty) || 0, price: price ? parseFloat(price.replace('@', '')) || 0 : 0, avgPrice: parseFloat(avgPrice) || 0, placedTime: placedTime?.trim() || null, filledTime: filledTime?.trim() || null })
    }
  }

  // STEP 1: Categorize into strategy arrays
  const categorized = categorizeAllRows(rows)

  // STEP 2: Process each strategy array independently
  const allTickets = []
  let currentTicketId = startTicketId

  // Multi-leg strategies
  const vt = parseVerticalSpreads(categorized.vertical_spread, currentTicketId)
  allTickets.push(...vt)
  currentTicketId += vt.length

  const ic = parseIronCondors(categorized.iron_condor, currentTicketId)
  allTickets.push(...ic)
  currentTicketId += ic.length

  const sd = parseStraddles(categorized.straddle, currentTicketId)
  allTickets.push(...sd)
  currentTicketId += sd.length

  const sg = parseStrangles(categorized.strangle, currentTicketId)
  allTickets.push(...sg)
  currentTicketId += sg.length

  // Single options - combine long/short for proper matching
  const calls = parseSingleOptions(categorized.long_call, categorized.short_call, currentTicketId)
  allTickets.push(...calls)
  currentTicketId += calls.length

  const puts = parseSingleOptions(categorized.long_put, categorized.short_put, currentTicketId)
  allTickets.push(...puts)
  currentTicketId += puts.length

  // STEP 3: Process expired positions
  const { expired, open: stillOpen } = await processExpiredTickets(allTickets, currentTicketId)

  // Combine closed, expired, and still-open tickets
  const finalTickets = [...allTickets.filter(t => t.status !== 'OPEN'), ...expired, ...stillOpen]

  // Sort by ticket number
  finalTickets.sort((a, b) => a.ticket - b.ticket)

  return finalTickets
}

// Clear all data
const clearAllData = () => {
  if (confirm('Are you sure you want to clear all trading data?')) {
    tickets.value = []
    localStorage.removeItem(STORAGE_KEY)
    uploadMessage.value = 'All data cleared'
    setTimeout(() => uploadMessage.value = '', 2000)
  }
}
const currentMonth = ref(new Date(2026, 2, 1)) // March 2026
const openPositionsCollapsed = ref(true)
const expandedPositionKeys = ref(new Set())
const expandedSymbols = ref(new Set())
const expandedDashboardSymbols = ref(new Set())
const equityPrices = ref({})
const loadingPrices = ref(false)

const dateRange = ref({
  mode: null, // 'single', 'week', 'month', 'range', 'all'
  start: null,
  end: null,
  single: null
})

// Trade view date picker state
const datePickerInput = ref(null)

// No default filter - show all trades initially
const tradeDateRangeStart = ref(null)
const tradeDateRangeEnd = ref(null)

// Store pending date to set after flatpickr initializes
const pendingDatePickerValue = ref(null)

let fp = null

// Initialize flatpickr date picker
const initDatePicker = () => {
  if (!datePickerInput.value) return
  if (fp) return // Already initialized

  // Clear input value to prevent Flatpickr from parsing invalid display text like "All dates"
  datePickerInput.value.value = ''

  fp = flatpickr(datePickerInput.value, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    theme: 'dark',
    inline: false,
    clickOpens: true,
    allowInput: false,
    onChange: function(selectedDates, dateStr, instance) {
      if (selectedDates.length === 2) {
        tradeDateRangeStart.value = formatFPDate(selectedDates[0])
        tradeDateRangeEnd.value = formatFPDate(selectedDates[1])
        selectedTradeDate.value = null
      } else if (selectedDates.length === 1) {
        tradeDateRangeStart.value = formatFPDate(selectedDates[0])
        tradeDateRangeEnd.value = null
        selectedTradeDate.value = null
      }
    }
  })

  // Apply any pending date value (only if valid date string)
  if (pendingDatePickerValue.value && /^\d{4}-\d{2}-\d{2}$/.test(pendingDatePickerValue.value)) {
    try {
      fp.setDate(pendingDatePickerValue.value)
    } catch (e) {
      console.warn('Failed to set date on picker:', e)
    }
  }
  pendingDatePickerValue.value = null
}

// Format flatpickr date to YYYY-MM-DD
const formatFPDate = (date) => {
  if (!date) return null
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

// Clear trade date filter
const clearTradeDateFilter = () => {
  tradeDateRangeStart.value = null
  tradeDateRangeEnd.value = null
  selectedTradeDate.value = null
  if (fp) {
    fp.clear()
  }
}

const filters = ref({
  symbol: '',
  status: ''
})

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
  loadSettings()
  loadTicketsFromStorage()
  loadRawTransactions()
})

// Watch for trades tab to initialize/cleanup date picker
watch(activeTab, (newTab, oldTab) => {
  if (oldTab === 'trades' && fp) {
    // Cleanup Flatpickr when leaving trades tab
    fp.destroy()
    fp = null
  }
  if (newTab === 'trades') {
    nextTick(() => {
      initDatePicker()
    })
  }
})

const filteredTickets = computed(() => {
  let filtered = tickets.value.filter(ticket => {
    const matchSymbol = !filters.value.symbol || ticket.symbol.toLowerCase().includes(filters.value.symbol.toLowerCase())
    const matchStatus = !filters.value.status || ticket.status === filters.value.status
    const matchDate = isTicketInDateRange(ticket)
    // Match trade date picker filter
    let matchTradeDateFilter = true
    if (tradeDateRangeStart.value) {
      const end = tradeDateRangeEnd.value || tradeDateRangeStart.value
      const entryInRange = ticket.date >= tradeDateRangeStart.value && ticket.date <= end
      const exitInRange = ticket.exit_date && ticket.exit_date >= tradeDateRangeStart.value && ticket.exit_date <= end
      const spansRange = ticket.date <= end && (!ticket.exit_date || ticket.exit_date >= tradeDateRangeStart.value)
      matchTradeDateFilter = entryInRange || exitInRange || spansRange
    }
    // Match legacy selectedTradeDate for day navigation
    const matchSelectedDate = !selectedTradeDate.value || ticket.date === selectedTradeDate.value || ticket.exit_date === selectedTradeDate.value
    return matchSymbol && matchStatus && matchDate && matchSelectedDate && matchTradeDateFilter
  })

  console.log('Total tickets:', tickets.value.length, 'Filtered tickets:', filtered.length)
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

// Computed display for trade date filter
const tradeDateDisplay = computed(() => {
  if (tradeDateRangeStart.value && tradeDateRangeEnd.value) {
    return `${tradeDateRangeStart.value} → ${tradeDateRangeEnd.value}`
  } else if (tradeDateRangeStart.value) {
    return `${tradeDateRangeStart.value} → ...`
  }
  return selectedTradeDate.value || 'All dates'
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

// Monthly summary for the currently viewed month
const monthlySummary = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0)

  const closedInMonth = tickets.value.filter(t => {
    return t.status !== 'OPEN' && t.exit_date &&
      t.exit_date >= startOfMonth.toISOString().split('T')[0] &&
      t.exit_date <= endOfMonth.toISOString().split('T')[0]
  })

  const winners = closedInMonth.filter(t => t.status === 'WIN')
  const losers = closedInMonth.filter(t => t.status === 'LOSS')

  const totalPnL = closedInMonth.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winsAmount = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const lossesAmount = losers.reduce((sum, t) => sum + (t.pnl || 0), 0)

  const profitFactor = lossesAmount !== 0 ? Math.abs(winsAmount / lossesAmount) : winsAmount > 0 ? 999 : 0

  return {
    count: closedInMonth.length,
    totalPnL,
    winRate: closedInMonth.length > 0 ? Math.round((winners.length / closedInMonth.length) * 100) : 0,
    profitFactor
  }
})

// Trade summary for currently filtered trades
const tradeSummary = computed(() => {
  const filtered = filteredTickets.value.filter(t => t.status !== 'OPEN')

  const winners = filtered.filter(t => t.status === 'WIN')
  const losers = filtered.filter(t => t.status === 'LOSS')

  const totalPnL = filtered.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winsAmount = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const lossesAmount = losers.reduce((sum, t) => sum + (t.pnl || 0), 0)

  const profitFactor = lossesAmount !== 0 ? Math.abs(winsAmount / lossesAmount) : winsAmount > 0 ? 999 : 0

  return {
    count: filtered.length,
    totalPnL,
    winRate: filtered.length > 0 ? Math.round((winners.length / filtered.length) * 100) : 0,
    profitFactor
  }
})

// Dashboard state
const selectedDashboardYear = ref(new Date().getFullYear())
const dashboardSearchQuery = ref('')

const filteredDashboardSymbols = computed(() => {
  const query = dashboardSearchQuery.value.toLowerCase().trim()
  if (!query) return yearlySummary.value.tradesBySymbol
  return yearlySummary.value.tradesBySymbol.filter(symbolGroup =>
    symbolGroup.displaySymbol.toLowerCase().includes(query) ||
    symbolGroup.symbol.toLowerCase().includes(query)
  )
})

const availableYears = computed(() => {
  const years = new Set()
  tickets.value.forEach(t => {
    if (t.exit_date) {
      years.add(new Date(t.exit_date).getFullYear())
    }
  })
  return Array.from(years).sort((a, b) => b - a)
})

// Get position group for a ticket
const getPositionGroupForTicket = (ticket) => {
  const legs = ticket.strategies?.[0]?.legs || []
  if (legs.length === 0) return null

  // Use only opening legs for strategy detection (closed positions have entry+exit legs)
  const entryLegs = openingLegs(ticket)
  if (entryLegs.length === 0) return null

  const strikes = entryLegs.map(l => l.strike).sort((a, b) => a - b).join('/')
  const expiry = entryLegs[0]?.expiry || ''
  const detectedStrategy = detectStrategy(entryLegs)
  const strategyName = getStrategyDisplayName(detectedStrategy)

  return {
    symbol: ticket.symbol,
    strategyName,
    strikes,
    expiry,
    totalQuantity: legs.reduce((sum, l) => sum + l.quantity, 0),
    positions: [ticket]
  }
}

// Yearly summary for dashboard
const yearlySummary = computed(() => {
  const year = selectedDashboardYear.value
  const yearTickets = tickets.value.filter(t => {
    if (!t.exit_date || t.status === 'OPEN') return false
    return new Date(t.exit_date).getFullYear() === year
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Group by month
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthTickets = yearTickets.filter(t => {
      return new Date(t.exit_date).getMonth() === i
    })

    const wins = monthTickets.filter(t => t.status === 'WIN').length

    return {
      month: i + 1,
      name: monthNames[i],
      pnl: monthTickets.reduce((sum, t) => sum + (t.pnl || 0), 0),
      count: monthTickets.length,
      wins
    }
  }).filter(m => m.count > 0)

  // All 12 months data for calendar view (including months with no trades)
  const allMonthsData = Array.from({ length: 12 }, (_, i) => {
    const monthTickets = yearTickets.filter(t => {
      return new Date(t.exit_date).getMonth() === i
    })

    const wins = monthTickets.filter(t => t.status === 'WIN').length

    return {
      month: i + 1,
      name: monthNames[i],
      pnl: monthTickets.reduce((sum, t) => sum + (t.pnl || 0), 0),
      count: monthTickets.length,
      wins
    }
  })

  // Build trades list with position groups
  const trades = yearTickets.map(t => {
    const legs = t.strategies?.[0]?.legs || []
    // Use only opening legs for strategy detection (closed positions have entry+exit legs)
    const entryLegs = openingLegs(t)
    const detectedStrategy = detectStrategy(entryLegs)
    return {
      id: t.id,
      symbol: t.symbol,
      exitDate: t.exit_date,
      strategy: getStrategyDisplayName(detectedStrategy),
      strikes: entryLegs.map(l => l.strike).sort((a, b) => a - b).join('/') || '',
      expiry: entryLegs[0]?.expiry || '',
      pnl: t.pnl || 0,
      positionGroup: getPositionGroupForTicket(t)
    }
  })

  // Group trades by symbol (with weekly grouping)
  const tradesBySymbol = []
  const symbolMap = new Map()

  // Normalize symbol to group weekly variants with their base
  const normalizeSymbol = (symbol) => {
    if (symbol === 'VIXW' || symbol === 'VIX') return 'VIX'
    if (symbol === 'SPXW' || symbol === 'SPX') return 'SPX'
    return symbol
  }

  // Display symbol name (prefer base symbol, but show combined if both exist)
  const getDisplaySymbol = (symbol) => {
    const base = normalizeSymbol(symbol)
    if (base === 'VIX') return 'VIX'
    if (base === 'SPX') return 'SPX'
    return symbol
  }

  trades.forEach(trade => {
    const normalizedSymbol = normalizeSymbol(trade.symbol)

    if (!symbolMap.has(normalizedSymbol)) {
      symbolMap.set(normalizedSymbol, {
        symbol: normalizedSymbol,
        displaySymbol: getDisplaySymbol(trade.symbol),
        trades: [],
        totalPnL: 0
      })
    }
    const group = symbolMap.get(normalizedSymbol)
    group.trades.push(trade)
    group.totalPnL += trade.pnl
  })

  // Convert to array and sort by P&L descending
  tradesBySymbol.push(...Array.from(symbolMap.values()).sort((a, b) => b.totalPnL - a.totalPnL))

  // Group trades by strategy
  const strategyMap = new Map()
  trades.forEach(trade => {
    const strategy = trade.strategy || 'Unknown'
    if (!strategyMap.has(strategy)) {
      strategyMap.set(strategy, {
        strategy,
        trades: [],
        totalPnL: 0,
        wins: 0,
        losses: 0
      })
    }
    const group = strategyMap.get(strategy)
    group.trades.push(trade)
    group.totalPnL += trade.pnl
    if (trade.pnl > 0) group.wins++
    else if (trade.pnl < 0) group.losses++
  })

  // Calculate strategy performance metrics
  const strategyPerformance = Array.from(strategyMap.values()).map(s => {
    const totalTrades = s.wins + s.losses
    const winRate = totalTrades > 0 ? Math.round((s.wins / totalTrades) * 100) : 0
    const avgWin = s.wins > 0 ? s.trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / s.wins : 0
    const avgLoss = s.losses > 0 ? Math.abs(s.trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)) / s.losses : 0
    const profitFactor = avgLoss > 0 ? (avgWin * s.wins) / (avgLoss * s.losses) : s.wins > 0 ? 999 : 0

    return {
      strategy: s.strategy,
      totalPnL: s.totalPnL,
      totalTrades,
      wins: s.wins,
      losses: s.losses,
      winRate,
      avgWin: avgWin || 0,
      avgLoss: avgLoss || 0,
      profitFactor
    }
  }).sort((a, b) => b.totalPnL - a.totalPnL)

  const totalPnL = yearTickets.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winners = yearTickets.filter(t => t.status === 'WIN')
  const losers = yearTickets.filter(t => t.status === 'LOSS')
  const winsAmount = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const lossesAmount = losers.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const profitFactor = lossesAmount !== 0 ? Math.abs(winsAmount / lossesAmount) : winsAmount > 0 ? 999 : 0

  return {
    totalPnL,
    totalTrades: yearTickets.length,
    winRate: yearTickets.length > 0 ? Math.round((winners.length / yearTickets.length) * 100) : 0,
    profitFactor,
    monthlyData,
    allMonthsData,
    tradesBySymbol,
    strategyPerformance
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

const toggleDashboardSymbol = (symbol) => {
  if (expandedDashboardSymbols.value.has(symbol)) {
    expandedDashboardSymbols.value.delete(symbol)
  } else {
    expandedDashboardSymbols.value.add(symbol)
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
  tradeDateRangeStart.value = date
  tradeDateRangeEnd.value = null
  pendingDatePickerValue.value = date
  activeTab.value = 'trades'
}

const selectAllTime = () => {
  dateRange.value = {
    mode: 'all',
    start: null,
    end: null,
    single: null
  }
  tradeDateRangeStart.value = null
  tradeDateRangeEnd.value = null
  if (fp) fp.clear()
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

const prevDay = () => {
  // Clear date range filter when using day navigation
  dateRange.value = { mode: null, start: null, end: null, single: null }
  tradeDateRangeStart.value = null
  tradeDateRangeEnd.value = null

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
  tradeDateRangeStart.value = null
  tradeDateRangeEnd.value = null

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

  // Sort groups by P&L (highest first)
  return Array.from(groups.values()).sort((a, b) => b.totalPnL - a.totalPnL)
})

// Group trades by symbol for top-level organization
const groupedBySymbol = computed(() => {
  const symbolMap = new Map()

  // Normalize symbol to group weekly variants with their base
  const normalizeSymbol = (symbol) => {
    if (symbol === 'VIXW' || symbol === 'VIX') return 'VIX'
    if (symbol === 'SPXW' || symbol === 'SPX') return 'SPX'
    return symbol
  }

  groupedTrades.value.forEach(group => {
    const normalizedSymbol = normalizeSymbol(group.symbol)

    if (!symbolMap.has(normalizedSymbol)) {
      symbolMap.set(normalizedSymbol, {
        symbol: normalizedSymbol,
        groups: [],
        totalPnL: 0
      })
    }
    const symbolGroup = symbolMap.get(normalizedSymbol)
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
  saveTicketsToStorage()
  showAddModal.value = false
}
</script>
