<template>
  <div class="h-screen bg-gray-900 flex flex-col overflow-hidden">
    <!-- Main Content -->
    <div class="pl-14 flex-1 flex flex-col min-h-0 overflow-y-auto sm:overflow-hidden">
      <main class="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-6 overflow-hidden sm:overflow-hidden">
      <!-- Calendar & Dashboard Merged View -->
      <div v-if="activeTab === 'calendar' || activeTab === 'dashboard'" class="h-full grid grid-rows-[auto_1fr] gap-3 sm:gap-4 overflow-auto sm:overflow-hidden">
        <!-- Header: Month Selector + Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 sm:gap-4">
          <!-- Month Selector -->
          <div class="bg-gray-800 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
            <h2 class="text-base sm:text-lg font-semibold text-white">Dashboard</h2>
            <div class="flex items-center gap-1.5 sm:gap-2">
              <button @click="prevMonth" class="text-gray-400 hover:text-white px-1.5 sm:px-2 py-1 rounded hover:bg-gray-700">
                <i class="fas fa-chevron-left text-sm sm:text-base"></i>
              </button>
              <span class="text-white font-medium w-24 sm:w-28 text-center text-sm sm:text-base">{{ formatMonth(currentMonth) }}</span>
              <button @click="nextMonth" class="text-gray-400 hover:text-white px-1.5 sm:px-2 py-1 rounded hover:bg-gray-700">
                <i class="fas fa-chevron-right text-sm sm:text-base"></i>
              </button>
            </div>
          </div>
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div class="bg-gray-800 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-center">
              <div class="text-lg sm:text-xl font-bold" :class="monthlySummary.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ monthlySummary.totalPnL >= 0 ? '+' : '' }}${{ monthlySummary.totalPnL.toFixed(0) }}
              </div>
              <div class="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-0">P&L</div>
            </div>
            <div class="bg-gray-800 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-center">
              <div class="text-lg sm:text-xl font-bold text-white">{{ monthlySummary.count }}</div>
              <div class="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-0">Trades</div>
            </div>
            <div class="bg-gray-800 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-center">
              <div class="text-lg sm:text-xl font-bold text-green-400">{{ monthlySummary.winRate }}%</div>
              <div class="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-0">Win Rate</div>
            </div>
            <div class="bg-gray-800 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-center">
              <div class="text-lg sm:text-xl font-bold text-blue-400">{{ monthlySummary.profitFactor.toFixed(1) }}x</div>
              <div class="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-0">PF</div>
            </div>
          </div>
        </div>

        <!-- Main Content: Calendar + Dashboard -->
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3 sm:gap-4 min-h-0 min-w-0">
          <!-- Left Column: Tabbed Content + Charts -->
          <div class="grid grid-rows-[2fr_1fr] sm:grid-rows-[1.5fr_1fr] gap-3 sm:gap-4 min-h-0 min-w-0">
            <!-- Tabbed Content -->
            <div class="bg-gray-800 rounded-lg flex flex-col min-h-0">
              <!-- Tabs -->
              <div class="flex">
                <button
                  @click="calendarLeftTab = 'calendar'"
                  :class="[
                    'flex-1 py-2 px-3 rounded-t text-sm font-medium transition-colors',
                    calendarLeftTab === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
                  ]"
                >
                  Calendar
                </button>
                <button
                  @click="calendarLeftTab = 'monthly'"
                  :class="[
                    'flex-1 py-2 px-3 rounded-t text-sm font-medium transition-colors',
                    calendarLeftTab === 'monthly' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
                  ]"
                >
                  Monthly
                </button>
              </div>

              <!-- Tab Content -->
              <div class="flex-1 overflow-auto p-3 min-w-0">
                <!-- Calendar Tab -->
                <div v-show="calendarLeftTab === 'calendar'" class="h-full flex flex-col gap-1">
                  <!-- Day labels -->
                  <div class="grid grid-cols-7 gap-1 shrink-0">
                    <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="text-center text-xs text-gray-500 h-4 flex items-center justify-center">
                      {{ day }}
                    </div>
                  </div>
                  <!-- Calendar grid -->
                  <div class="grid grid-cols-7 gap-1 flex-1" :style="{ gridAutoRows: `calc((100% - ${(calendarRowCount - 1) * 4}px) / ${calendarRowCount})` }">
                    <div
                      v-for="day in calendarDays"
                      :key="day.date"
                      @click="selectDate(day.date)"
                      :class="[
                        'p-1 rounded cursor-pointer text-xs transition-colors relative overflow-hidden',
                        !day.date ? 'pointer-events-none' : '',
                        day.date === selectedTradeDate ? 'ring-2 ring-white' : '',
                        day.isSaturday && day.weeklyPnl > 0 ? 'bg-emerald-800/90 hover:bg-emerald-700/90' : '',
                        day.isSaturday && day.weeklyPnl < 0 ? 'bg-rose-900/90 hover:bg-rose-800/90' : '',
                        day.isSaturday && day.weeklyPnl === 0 ? 'bg-cyan-900/70 hover:bg-cyan-800/70' : '',
                        !day.isSaturday && day.pnl === 0 ? 'text-gray-600' : '',
                        !day.isSaturday && day.pnl > 0 ? 'bg-green-900 hover:bg-green-800 text-green-300' : '',
                        !day.isSaturday && day.pnl < 0 ? 'bg-red-900 hover:bg-red-800 text-red-300' : ''
                      ]"
                    >
                      <!-- Saturday: Show weekly P&L with distinct styling -->
                      <template v-if="day.isSaturday && day.date">
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                          <div class="text-[9px] text-gray-400 mb-0.5">WEEK</div>
                          <div class="font-mono font-bold text-sm" :class="day.weeklyPnl > 0 ? 'text-emerald-200' : day.weeklyPnl < 0 ? 'text-rose-200' : 'text-cyan-200'">
                            {{ day.weeklyPnl >= 0 ? '+' : '' }}${{ day.weeklyPnl.toFixed(0) }}
                          </div>
                        </div>
                        <div class="absolute bottom-0.5 right-1 text-[9px] opacity-50">{{ day.dayOfMonth }}</div>
                      </template>
                      <!-- Other days: Show daily P&L -->
                      <template v-else>
                        <div v-if="day.date && day.pnl !== 0" class="absolute bottom-0.5 right-1 text-[10px] opacity-60">{{ day.dayOfMonth }}</div>
                        <div v-if="day.pnl !== 0" class="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs" :class="day.pnl >= 0 ? 'text-green-300' : 'text-red-300'">
                          {{ day.pnl >= 0 ? '+' : '' }}${{ day.pnl.toFixed(0) }}
                        </div>
                        <div v-if="day.pnl === 0 && day.date" class="absolute inset-0 flex items-center justify-center text-sm opacity-40">{{ day.dayOfMonth }}</div>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Monthly P&L Tab -->
                <div v-show="calendarLeftTab === 'monthly'" class="h-full overflow-y-auto">
                  <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
                    <div
                      v-for="month in yearlySummary.allMonthsData"
                      :key="month.month"
                      @click="selectMonth(month.month)"
                      :class="[
                        'p-2 rounded cursor-pointer transition-colors flex flex-col justify-center',
                        month.count === 0 ? 'bg-gray-700/30 text-gray-600' : 'bg-gray-700/50 hover:bg-gray-700',
                        month.pnl > 0 ? 'hover:bg-green-900/30' : month.pnl < 0 ? 'hover:bg-red-900/30' : ''
                      ]"
                    >
                      <div class="text-xs font-semibold mb-0.5">{{ month.name }}</div>
                      <div v-if="month.count > 0" class="font-mono font-bold text-sm" :class="month.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ month.pnl >= 0 ? '+' : '' }}${{ month.pnl.toFixed(0) }}
                      </div>
                      <div v-else class="text-xs text-gray-600">--</div>
                      <div v-if="month.count > 0" class="text-xs text-gray-500">{{ month.count }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Charts -->
            <DashboardCharts :yearly-summary="filteredYearlySummary" :full-year-summary="yearlySummary" :tickets="filteredTickets" :all-tickets="tickets" :selected-date="selectedTradeDate" />
          </div>

          <!-- Right Column: Trades List + Strategies -->
          <div class="bg-gray-800 rounded-lg flex flex-col min-h-0 min-w-0 overflow-hidden">
            <!-- Tabs -->
            <div class="flex">
              <button
                @click="calendarRightTab = 'trades'"
                :class="[
                  'flex-1 py-2 px-4 rounded-t text-sm font-medium transition-colors',
                  calendarRightTab === 'trades' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
                ]"
              >
                Trades
              </button>
              <button
                @click="calendarRightTab = 'strategies'"
                :class="[
                  'flex-1 py-2 px-4 rounded-t text-sm font-medium transition-colors',
                  calendarRightTab === 'strategies' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
                ]"
              >
                Strategies
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-hidden mt-3">
              <!-- Trades Tab -->
              <div v-show="calendarRightTab === 'trades'" class="h-full flex flex-col">
                <!-- Filters -->
            <div class="p-3 border-b border-gray-700 flex gap-2 flex-wrap items-center">
              <input v-model="filters.symbol" type="text" placeholder="Search..." class="bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 text-sm flex-1 min-w-32">
              <select v-model="filters.status" class="bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 text-sm">
                <option value="">All</option>
                <option value="WIN">Win</option>
                <option value="LOSS">Loss</option>
              </select>
              <button v-if="tradesViewMode === 'list'" @click="toggleAllSymbols" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">
                {{ allSymbolsExpanded ? 'Collapse' : 'Expand' }}
              </button>
              <button @click="tradesViewMode = tradesViewMode === 'list' ? 'square' : 'list'" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm" :title="tradesViewMode === 'list' ? 'Square view' : 'List view'">
                <i :class="tradesViewMode === 'list' ? 'fas fa-th' : 'fas fa-list'"></i>
              </button>
            </div>

            <!-- Trades List -->
            <div class="flex-1 overflow-y-auto p-2">
              <!-- List View -->
              <div v-if="tradesViewMode === 'list'" class="space-y-2">
                <div v-for="symbolGroup in groupedBySymbol" :key="symbolGroup.symbol" class="bg-gray-700/50 rounded overflow-hidden">
                  <div class="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-700" @click="toggleSymbol(symbolGroup.symbol)">
                    <div class="flex items-center gap-2">
                      <i class="fas fa-chevron-right text-gray-500 text-xs transition-transform" :class="{ 'rotate-90': expandedSymbols.has(symbolGroup.symbol) }"></i>
                      <span class="text-sm font-bold text-white">{{ symbolGroup.symbol }}</span>
                      <span class="text-xs text-gray-500">{{ symbolGroup.groups.length }}</span>
                    </div>
                    <span class="font-mono font-bold text-sm" :class="symbolGroup.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                      {{ symbolGroup.totalPnL >= 0 ? '+' : '' }}${{ symbolGroup.totalPnL.toFixed(0) }}
                    </span>
                  </div>
                  <div v-show="expandedSymbols.has(symbolGroup.symbol)" class="border-t border-gray-600">
                    <div v-for="group in symbolGroup.groups" :key="group.tickets[0]?.ticket || group.symbol + group.strategyName + group.strikes + group.expiry" class="border-b border-gray-600/50 last:border-0 cursor-pointer hover:bg-gray-700/50 p-2" @click="selectedPositionGroup = group">
                      <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-medium text-white">{{ group.strategyName }}</span>
                          <span class="text-xs text-gray-500">{{ group.strikes }}</span>
                          <span class="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">{{ group.expiry }}</span>
                          <span v-if="group.tickets.length > 1" class="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">{{ group.tickets.length }}</span>
                          <span v-if="getGroupPositionDirectionLabel(group)" class="text-xs text-gray-400">{{ getGroupPositionDirectionLabel(group) }}</span>
                        </div>
                        <MiniCalendarDots :entry-dates="getEntryDates(group)" :exit-dates="getExitDates(group)" :expiry-dates="getExpiryDates(group)" />
                      </div>
                      <div v-if="group.openCount === 0" class="flex items-center gap-2 text-xs">
                        <span class="font-mono font-bold" :class="group.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                          {{ group.totalPnL >= 0 ? '+' : '' }}${{ group.totalPnL.toFixed(0) }}
                        </span>
                        <span class="text-gray-500">=</span>
                        <span class="text-gray-400">Sold ${{ Math.abs(getAverageEntryPrice(group)).toFixed(2) }}</span>
                        <span v-if="hasClosingLegs(group)" class="text-gray-400">Bought ${{ Math.abs(getAverageExitPrice(group)).toFixed(2) }}</span>
                      </div>
                      <div v-else class="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-0.5 rounded">
                        {{ group.openCount }} OPEN
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Square View -->
              <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <div
                  v-for="trade in flattenedTrades"
                  :key="trade.tickets[0]?.ticket || trade.symbol + trade.strategyName + trade.strikes + trade.expiry"
                  :class="['rounded-lg p-3 cursor-pointer transition-all hover:scale-105 hover:shadow-lg flex flex-col', getEquityColor(trade.symbol)]"
                  @click="selectedPositionGroup = trade"
                >
                  <div class="flex flex-col h-full">
                    <!-- Symbol -->
                    <div class="text-sm font-bold text-white mb-1">{{ trade.symbol }}</div>

                    <!-- Strategy + Strike (symbol removed from strategyName) -->
                    <div class="flex items-center gap-1.5 mb-1">
                      <span class="text-xs text-gray-300">{{ trade.strategyName.replace(new RegExp(`^${trade.symbol}\\s+`, 'i'), '') }} {{ trade.strikes }}</span>
                      <span v-if="trade.tickets.length > 1" class="text-xs bg-blue-900/50 text-blue-300 px-1 py-0.5 rounded">{{ trade.tickets.length }}</span>
                    </div>

                    <!-- Position Direction -->
                    <div v-if="getGroupPositionDirectionLabel(trade)" class="text-xs text-gray-500 mb-2">{{ getGroupPositionDirectionLabel(trade) }}</div>

                    <!-- Mini Calendar -->
                    <div class="mb-2">
                      <MiniCalendarDots :entry-dates="getEntryDates(trade)" :exit-dates="getExitDates(trade)" :expiry-dates="getExpiryDates(trade)" :compact="true" />
                    </div>

                    <!-- Profit & Expiration -->
                    <div class="mt-auto flex items-center justify-between">
                      <span v-if="trade.openCount > 0" class="text-xs bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded">OPEN</span>
                      <span v-else class="font-mono text-sm font-bold" :class="trade.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                        ${{ trade.totalPnL.toFixed(0) }}
                      </span>
                      <span class="text-xs text-gray-400">{{ formatExpiryShort(trade.expiry) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="filteredTickets.length === 0" class="text-center text-gray-500 py-8">No trades found</div>
            </div>
              </div>

              <!-- Strategies Tab -->
              <div v-show="calendarRightTab === 'strategies'" class="h-full overflow-y-auto p-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div v-for="strat in filteredStrategies" :key="strat.strategy" class="bg-gray-700/50 rounded p-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-bold text-white">{{ strat.strategy }}</span>
                      <span class="font-mono font-bold text-base" :class="strat.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'">
                        {{ strat.totalPnL >= 0 ? '+' : '' }}${{ strat.totalPnL.toFixed(0) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-400">
                      <span>{{ strat.totalTrades }} trades</span>
                      <span :class="strat.winRate >= 50 ? 'text-green-400' : 'text-red-400'">{{ strat.winRate }}%</span>
                      <span class="text-gray-500">{{ strat.wins }}W/{{ strat.losses }}L</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    </div>

    <!-- Left Sidebar Navigation -->
    <nav class="fixed left-0 top-0 bottom-0 w-14 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2 z-50">
      <!-- User Profile Button -->
      <button
        @click="handleAuthModalClick"
        class="w-10 h-10 rounded-full flex items-center justify-center transition-colors mb-2"
        :class="isAuthenticated ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
        :title="isAuthenticated ? userName : 'Sign In'"
      >
        <img v-if="isAuthenticated && userPhoto" :src="userPhoto" class="w-10 h-10 rounded-full object-cover">
        <span v-else-if="isAuthenticated" class="text-white font-medium">{{ userName.charAt(0) }}</span>
        <i v-else class="fas fa-user text-gray-400"></i>
      </button>

      <button
        @click="navigateTo('dashboard')"
        :class="[
          'w-10 h-10 flex flex-col items-center justify-center rounded transition-colors',
          activeTab === 'calendar' || activeTab === 'dashboard' ? 'bg-gray-700 text-green-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
        ]"
        title="Dashboard"
      >
        <i class="fas fa-list"></i>
      </button>
      <button
        @click="openCsvPicker"
        :disabled="isUploading"
        :class="[
          'w-10 h-10 flex flex-col items-center justify-center rounded transition-colors relative',
          isUploading ? 'text-gray-600 cursor-wait' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
        ]"
        title="Upload"
      >
        <i class="fas fa-upload"></i>
        <div v-if="uploadMessage" class="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {{ uploadMessage }}
        </div>
      </button>
      <div class="flex-1"></div>
      <button
        @click="showSettingsModal = true"
        class="w-10 h-10 flex flex-col items-center justify-center rounded text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors"
        title="Settings"
      >
        <i class="fas fa-cog"></i>
      </button>
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
    <!-- Trade Detail Modal -->
    <BaseModal
      v-model:show="tradeDetailModalOpen"
      :max-width="modalMaxWidth"
      :content-class="modalContentClass"
      :custom-class="modalCustomClass"
    >
      <template v-if="selectedPositionGroup" #title>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-white font-bold">{{ selectedSymbolTickets[currentPositionIndex]?.symbol || selectedPositionGroup.symbol }}</span>
          <span class="text-gray-500">·</span>
          <span class="px-2 py-0.5 rounded text-sm font-medium" :class="getPositionDirectionClass()">{{ getPositionDirectionLabel() }}</span>
          <span class="text-gray-500">·</span>
          <span class="text-white font-bold">{{ (selectedSymbolTickets[currentPositionIndex]?.strategies?.[0]?.name || selectedPositionGroup.strategyName || 'Strategy') }} {{ selectedPositionGroup.strikes }}</span>
          <span class="text-gray-500">·</span>
          <span class="text-lg font-bold" :class="(selectedSymbolTickets[currentPositionIndex]?.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'">
            {{ (selectedSymbolTickets[currentPositionIndex]?.pnl || 0) >= 0 ? '+' : '' }}${{ (selectedSymbolTickets[currentPositionIndex]?.pnl || 0).toFixed(0) }}
          </span>
          <!-- Navigation indicator -->
          <span v-if="selectedSymbolTickets.length > 1" class="ml-auto flex items-center gap-2 text-sm">
            <button @click.stop="currentPositionIndex = Math.max(0, currentPositionIndex - 1)" :disabled="currentPositionIndex === 0" class="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span class="text-gray-400 font-mono">{{ currentPositionIndex + 1 }} / {{ selectedSymbolTickets.length }}</span>
            <button @click.stop="currentPositionIndex = Math.min(selectedSymbolTickets.length - 1, currentPositionIndex + 1)" :disabled="currentPositionIndex >= selectedSymbolTickets.length - 1" class="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
              <i class="fas fa-chevron-right"></i>
            </button>
          </span>
        </div>
      </template>
      <template v-if="selectedPositionGroup">
        <!-- Tab Navigation -->
        <div class="flex gap-1 border-b border-gray-700 mb-4">
          <button
            @click="tradeDetailTab = 'chart'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-t transition-colors',
              tradeDetailTab === 'chart'
                ? 'bg-gray-800 text-white border-t border-x border-gray-700 -mb-px'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            ]"
          >
            <i class="fas fa-chart-line mr-1.5"></i>Chart
          </button>
          <button
            @click="tradeDetailTab = 'details'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-t transition-colors',
              tradeDetailTab === 'details'
                ? 'bg-gray-800 text-white border-t border-x border-gray-700 -mb-px'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            ]"
          >
            <i class="fas fa-info-circle mr-1.5"></i>Details
          </button>
          <button
            @click="tradeDetailTab = 'news'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-t transition-colors',
              tradeDetailTab === 'news'
                ? 'bg-gray-800 text-white border-t border-x border-gray-700 -mb-px'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            ]"
          >
            <i class="fas fa-newspaper mr-1.5"></i>News
          </button>
        </div>

        <!-- Chart Tab -->
        <div v-show="tradeDetailTab === 'chart'" class="h-[480px] overflow-y-auto">
          <!-- Intraday Charts -->
          <IntradayChart
            :positions="selectedSymbolTickets"
            :symbol="selectedPositionGroup.symbol"
            :show-entry="true"
            :show-exit="true"
            :model-index="currentPositionIndex"
            :proxy-url="settings.proxyUrl || ''"
            :user-id="userId"
            @update:model-index="currentPositionIndex = $event"
          />
        </div>

        <!-- Details Tab -->
        <div v-show="tradeDetailTab === 'details'" class="h-[480px] overflow-y-auto">
          <!-- Only show current ticket that's being displayed in the graph -->
          <div v-for="pos in selectedSymbolTickets.slice(currentPositionIndex, currentPositionIndex + 1)" :key="pos.ticket" class="bg-gray-900 rounded p-3 mb-3 last:mb-0">
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

            <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
              <!-- Left Column: Details -->
              <div class="space-y-3 pr-4">
                <!-- Opening Legs -->
                <div>
                  <div class="text-green-400 font-semibold text-xs mb-2">Opening</div>
                  <div v-for="leg in openingLegs(pos)" :key="'open-' + leg.strike + leg.action" class="flex items-center gap-2 mb-1.5 text-xs">
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
                  <div class="text-red-400 font-semibold text-xs mb-2">Closing</div>
                  <div v-for="leg in closingLegs(pos)" :key="'close-' + leg.strike + leg.action" class="flex items-center gap-2 mb-1.5 text-xs">
                    <span class="px-1.5 py-0.5 rounded text-[10px]" :class="leg.action === 'buy' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'">
                      {{ leg.action === 'buy' ? 'LONG' : 'SHORT' }}
                    </span>
                    <span class="text-gray-300">{{ leg.type.toUpperCase() }} ${{ leg.strike }}</span>
                    <span class="text-gray-500">{{ leg.quantity }}c</span>
                    <span class="text-gray-500">@ ${{ leg.premium.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <!-- Right Column: P&L Graph -->
              <div class="border-t border-gray-700 md:border-t-0 md:pt-0 pt-3 md:w-80 shrink-0">
                <div class="text-xs text-gray-400 mb-3">Theoretical P&L</div>
                <svg viewBox="0 0 320 120" class="w-full h-28 bg-gray-900/50 rounded-lg">
                  <!-- P&L Fill areas -->
                  <polygon v-for="(area, i) in getPnLGraphSegments(pos).lossAreas" :key="'loss-area-' + i" :points="area" fill="#ef4444" fill-opacity="0.15" />
                  <polygon v-for="(area, i) in getPnLGraphSegments(pos).profitAreas" :key="'profit-area-' + i" :points="area" fill="#22c55e" fill-opacity="0.15" />

                  <!-- Zero line (breakeven) -->
                  <line x1="20" y1="60" x2="300" y2="60" stroke="#6b7280" stroke-width="1" />

                  <!-- P&L Lines -->
                  <polyline v-for="(line, i) in getPnLGraphSegments(pos).lossLines" :key="'loss-line-' + i" :points="line" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <polyline v-for="(line, i) in getPnLGraphSegments(pos).profitLines" :key="'profit-line-' + i" :points="line" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />

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

            <!-- P&L Breakdown for closed trades -->
            <div v-if="pos.exit_date" class="border-t border-gray-700 pt-3">
              <div class="text-xs text-gray-500 mb-2 text-center">P&L Breakdown</div>
              <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
                <!-- Determine if opening is long (buy) or short (sell) -->
                <template v-if="isOpeningLong(pos)">
                  <div class="flex items-center gap-1.5">
                    <span class="text-gray-600 text-xs">Bought</span>
                    <span class="text-white font-mono font-medium">${{ Math.abs(getTicketEntryPrice(pos)).toFixed(2) }}</span>
                  </div>
                  <span class="text-gray-700">×</span>
                  <div v-if="ticketHasClosingLegs(pos)" class="flex items-center gap-1.5">
                    <span class="text-gray-600 text-xs">Sold</span>
                    <span class="text-white font-mono font-medium">${{ Math.abs(getTicketExitPrice(pos)).toFixed(2) }}</span>
                  </div>
                  <div v-else class="flex items-center gap-1.5">
                    <span class="text-gray-600 text-xs">Expired</span>
                    <span class="text-yellow-400 font-mono font-medium">${{ getTicketImpliedExitPrice(pos).toFixed(2) }}</span>
                  </div>
                </template>
                <template v-else>
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
                </template>
                <span class="text-gray-700">=</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-600 text-xs">P&L</span>
                  <span class="font-mono font-bold" :class="pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ pos.pnl >= 0 ? '+' : '' }}${{ pos.pnl }}
                  </span>
                </div>
                <span class="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
                  {{ getTicketContracts(pos) }} × 100
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- News Tab -->
        <div v-show="tradeDetailTab === 'news'" class="h-[480px] overflow-y-auto space-y-4">
          <div v-for="pos in selectedSymbolTickets.slice(currentPositionIndex, currentPositionIndex + 1)" :key="'news-' + pos.ticket">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-blue-400 font-mono text-sm">#{{ pos.ticket }}</span>
              <span class="text-xs text-gray-500">{{ pos.date }}</span>
              <span v-if="loadingNews[pos.ticket]" class="text-xs text-blue-400">
                <i class="fas fa-spinner fa-spin mr-1"></i>Loading news...
              </span>
            </div>
            <div v-if="pos.news && pos.news.length > 0" class="space-y-2 pr-1">
              <a
                v-for="(article, idx) in pos.news.slice(0, 10)"
                :key="idx"
                :href="article.url"
                target="_blank"
                rel="noopener noreferrer"
                class="block bg-gray-800/50 hover:bg-gray-800 rounded p-3 transition-colors"
              >
                <div class="flex items-start gap-3">
                  <img
                    v-if="article.imageUrl"
                    :src="article.imageUrl"
                    class="w-20 h-20 rounded object-cover flex-shrink-0"
                    loading="lazy"
                  >
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-200 line-clamp-2 leading-snug mb-2">{{ article.title }}</div>
                    <div v-if="article.description" class="text-xs text-gray-400 line-clamp-2 mb-2">{{ article.description }}</div>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-gray-500">{{ article.source }}</span>
                      <span class="text-[10px] text-gray-600">{{ formatNewsDate(article.publishedAt) }}</span>
                    </div>
                  </div>
                </div>
              </a>
            </div>
            <div v-else-if="loadingNews[pos.ticket]" class="text-center py-8 text-gray-500 text-sm">
              <i class="fas fa-spinner fa-spin mr-2"></i>Loading market news for {{ pos.symbol }}...
            </div>
            <div v-else-if="!settings.newsApiKey" class="text-center py-8">
              <div class="text-gray-500 text-sm mb-2">No NewsAPI key configured</div>
              <div class="text-gray-600 text-xs">Add a free API key from <a href="https://newsapi.org/register" target="_blank" class="text-blue-400 hover:underline">newsapi.org</a> in Settings to auto-fetch market news</div>
            </div>
            <div v-else class="text-center py-8 text-gray-500 text-sm">
              No news found for {{ pos.symbol }} around {{ pos.date }}
            </div>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- Settings Modal -->
    <BaseModal
      v-model:show="showSettingsModal"
      title="Settings"
      max-width="md"
    >
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

      <!-- News API Section -->
      <div class="border-t border-gray-700 pt-4">
        <h4 class="text-sm font-medium text-gray-300 mb-2">Market News</h4>
        <label class="block text-xs text-gray-500 mb-1">NewsAPI.org Key (optional)</label>
        <input
          v-model="settings.newsApiKey"
          type="password"
          placeholder="Enter your NewsAPI.org key"
          class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        >
        <p class="text-xs text-gray-500 mt-1">
          Get free API key at <a href="https://newsapi.org/register" target="_blank" class="text-blue-400 hover:underline">newsapi.org</a>.
          Auto-fetches market news when saving trades.
        </p>
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
        <div class="flex gap-2 mb-2">
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
        <div class="flex gap-2">
          <button
            @click="rematchAllTickets"
            :disabled="isRematching"
            class="w-full text-sm bg-blue-900/50 hover:bg-blue-900/70 text-blue-300 px-3 py-2 rounded transition-colors disabled:opacity-50"
          >
            {{ isRematching ? 'Re-matching...' : 'Re-match All Tickets' }}
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">Match BUY/SELL tickets that should close each other</p>
      </div>

      <template #footer>
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
      </template>
    </BaseModal>

    <!-- Auth Landing Page -->
    <AuthLanding
      v-if="showAuthLanding && !isAuthenticated && !authLoading"
      @open-login="handleAuthModalClick; showAuthLanding = false"
      @use-local="useLocalStorageOnly"
    />

    <!-- Login Modal -->
    <LoginModal
      ref="loginModalRef"
      :show="showLoginModal"
      @close="showLoginModal = false"
      @success="handleAuth"
    />

    <!-- Account Modal (for signed-in users) -->
    <AccountModal
      :show="showAccountModal"
      :user-name="userName"
      :user-email="userEmail"
      :is-synced="!isSyncing"
      :stats="userStats"
      @close="showAccountModal = false"
      @sign-out="handleSignOut"
    />

    <!-- Migration Modal -->
    <MigrationModal
      :show="showMigrationModal"
      :local-data="localDataForMigration"
      @close="showMigrationModal = false"
      @migrate="handleMigration"
      @skip="skipMigration"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import SummaryCards from './components/SummaryCards.vue'
import DashboardCharts from './components/DashboardCharts.vue'
import IntradayChart from './components/IntradayChart.vue'
import { detectStrategy, getStrategyDisplayName } from './utils/strategyDetector.js'
import { parseCSV as parseWebullCSV, parseOptionSymbol, formatDate, compareDates, generateSingleOptionName } from './utils/parseWebull.js'
import TradeFormModal from './components/TradeFormModal.vue'
import MiniCalendarDots from './components/MiniCalendarDots.vue'
import BaseModal from './components/BaseModal.vue'
import LoginModal from './components/LoginModal.vue'
import AccountModal from './components/AccountModal.vue'
import MigrationModal from './components/MigrationModal.vue'
import AuthLanding from './components/AuthLanding.vue'
import UserProfile from './components/UserProfile.vue'
import { useAuth } from './composables/useAuth'
import {
  getTickets,
  saveTicketsBatch,
  getRawTransactions,
  saveRawTransactions as saveRawTransactionsToFirestore,
  getSettings,
  saveSettings as saveSettingsToFirestore,
  subscribeToTickets,
  subscribeToSettings,
  migrateToFirestore,
  hasExistingData
} from './utils/firestore'
import { syncIntradayFromFirestore } from './utils/priceFetcher.js'
import { fetchMarketNews } from './utils/newsFetcher.js'
import { Line, Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, ScatterController } from 'chart.js'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'
import 'flatpickr/dist/themes/dark.css'

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, ScatterController)
import 'flatpickr/dist/themes/dark.css'

// Local storage keys
const STORAGE_KEY = 'trading_journal_tickets'
const RAW_TRANSACTIONS_KEY = 'trading_journal_raw_transactions'

const tickets = ref([])
const rawTransactions = ref([])  // Store all raw CSV transactions for re-matching
const showAddModal = ref(false)
const showSettingsModal = ref(false)
const loadingNews = ref({})  // Track loading state for news fetching per ticket

// Firebase Auth state
const showLoginModal = ref(false)
const showAccountModal = ref(false)
const showMigrationModal = ref(false)
const showAuthLanding = ref(false)
const isSyncing = ref(false)
const syncError = ref(null)

// Initialize auth composable
const {
  initialize: initializeAuth,
  signIn,
  signUp,
  signOut,
  resetPassword,
  user,
  isLoading: authLoading,
  isAuthenticated,
  userEmail,
  userName,
  userPhoto,
  userId
} = useAuth()

// Login modal ref for accessing child methods
const loginModalRef = ref(null)

// Real-time sync unsubscribers
let ticketsUnsubscribe = null
let settingsUnsubscribe = null

// Active tab state
const activeTab = ref('dashboard')

// Navigate to a tab
const navigateTo = (tab) => {
  activeTab.value = tab
}

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

// Save settings to localStorage and Firestore
const saveSettings = async () => {
  try {
    // Save to localStorage
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))

    // Also save to Firestore if authenticated
    if (isAuthenticated.value && userId.value) {
      await saveSettingsToFirestore(userId.value, settings.value)
    }

    showSettingsModal.value = false
    uploadMessage.value = 'Settings saved'
    setTimeout(() => uploadMessage.value = '', 2000)
  } catch {
    uploadMessage.value = 'Failed to save settings'
    setTimeout(() => uploadMessage.value = '', 2000)
  }
}

// ============================================================================
// FIREBASE AUTH HANDLERS
// ============================================================================

// Sign in/up handler
const handleAuth = async (data) => {
  const { action, email, password, displayName } = data

  let result
  if (action === 'signIn') {
    result = await signIn(email, password)
  } else if (action === 'signUp') {
    result = await signUp(email, password, displayName)
  } else if (action === 'resetPassword') {
    result = await resetPassword(email)
    if (result.success) {
      // Show success message in modal
      loginModalRef.value?.handleResetSuccess()
    }
    return
  }

  if (result.success) {
    showLoginModal.value = false
    // Check for migration needed
    await checkAndPromptMigration()
  } else {
    // Show error in modal
    loginModalRef.value?.setError(result.error)
  }
}

// Sign out handler
const handleSignOut = async () => {
  const result = await signOut()
  if (result.success) {
    // Clear data and reload from localStorage
    tickets.value = []
    rawTransactions.value = []
    await loadTicketsFromStorage()
    loadRawTransactions()
  }
}

// Handle auth modal click - show account modal if authenticated, login modal otherwise
const handleAuthModalClick = () => {
  if (isAuthenticated.value) {
    showAccountModal.value = true
  } else {
    showLoginModal.value = true
  }
}

// User stats for account modal
const userStats = computed(() => {
  const totalTrades = tickets.value.length

  // Calculate stats by year
  const yearlyStatsByYear = {}
  const closedTrades = tickets.value.filter(t => t.status !== 'OPEN')

  tickets.value.forEach(t => {
    const year = new Date(t.date).getFullYear()
    if (!yearlyStatsByYear[year]) {
      yearlyStatsByYear[year] = { pnl: 0, trades: 0, wins: 0, total: 0 }
    }
    yearlyStatsByYear[year].pnl += t.pnl || 0
    yearlyStatsByYear[year].trades += 1
    if (t.status !== 'OPEN') {
      yearlyStatsByYear[year].total += 1
      if (t.pnl > 0) {
        yearlyStatsByYear[year].wins += 1
      }
    }
  })

  // Calculate win rate for each year
  Object.keys(yearlyStatsByYear).forEach(year => {
    const stats = yearlyStatsByYear[year]
    stats.winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0
  })

  return {
    totalTrades,
    yearlyStatsByYear
  }
})

// Check if user needs data migration
const checkAndPromptMigration = async () => {
  if (!isAuthenticated.value || !userId.value) return

  // Check if user has existing Firestore data
  const hasData = await hasExistingData(userId.value)

  if (!hasData) {
    // Check for localStorage data
    const localTickets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const localTransactions = JSON.parse(localStorage.getItem(RAW_TRANSACTIONS_KEY) || '[]')

    if (localTickets.length > 0 || localTransactions.length > 0) {
      // Show migration modal
      showMigrationModal.value = true
    } else {
      // No local data, load empty from Firestore
      loadUserData()
    }
  } else {
    // Load data from Firestore
    loadUserData()
  }
}

// Migration handler
const handleMigration = async ({ onProgress, onSuccess, onError }) => {
  try {
    isSyncing.value = true

    // Gather localStorage data
    const localTickets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const localTransactions = JSON.parse(localStorage.getItem(RAW_TRANSACTIONS_KEY) || '[]')
    const localSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')

    onProgress(10)

    // Perform migration
    const result = await migrateToFirestore(userId.value, {
      tickets: localTickets,
      rawTransactions: localTransactions,
      settings: localSettings
    })

    onProgress(100)
    onSuccess(result.ticketsMigrated)

    // Load data from Firestore after migration
    setTimeout(() => {
      loadUserData()
      showMigrationModal.value = false
    }, 1500)

  } catch (err) {
    console.error('Migration error:', err)
    onError(err)
  } finally {
    isSyncing.value = false
  }
}

// Skip migration
const skipMigration = async () => {
  showMigrationModal.value = false
  // Load empty state from Firestore
  loadUserData()
}

// Load user data from Firestore
const loadUserData = async () => {
  if (!isAuthenticated.value || !userId.value) return

  try {
    isSyncing.value = true
    syncError.value = null

    // Load tickets
    const loadedTickets = await getTickets(userId.value)
    tickets.value = loadedTickets

    // Load raw transactions
    const loadedTransactions = await getRawTransactions(userId.value)
    rawTransactions.value = loadedTransactions

    // Load settings
    const loadedSettings = await getSettings(userId.value)
    if (Object.keys(loadedSettings).length > 0) {
      settings.value = { ...settings.value, ...loadedSettings }
    }

    // Note: Market data is NOT synced in bulk - it's fetched on-demand
    // When you view a chart, it checks: localStorage -> Firestore -> Yahoo API

  } catch (err) {
    console.error('Error loading user data:', err)
    syncError.value = err.message
  } finally {
    isSyncing.value = false
  }
}

// Setup real-time sync when authenticated
watch(isAuthenticated, (newValue) => {
  if (newValue && userId.value) {
    // Subscribe to real-time updates
    ticketsUnsubscribe = subscribeToTickets(userId.value, (updatedTickets) => {
      tickets.value = updatedTickets
    })

    settingsUnsubscribe = subscribeToSettings(userId.value, (updatedSettings) => {
      settings.value = { ...settings.value, ...updatedSettings }
    })
  } else {
    // Unsubscribe when logged out
    if (ticketsUnsubscribe) {
      ticketsUnsubscribe()
      ticketsUnsubscribe = null
    }
    if (settingsUnsubscribe) {
      settingsUnsubscribe()
      settingsUnsubscribe = null
    }
  }
})

// Use local storage only (skip auth)
const useLocalStorageOnly = async () => {
  showAuthLanding.value = false
  await loadTicketsFromStorage()
  loadRawTransactions()
}

// Local data for migration modal
const localDataForMigration = computed(() => {
  return {
    tickets: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
    rawTransactions: JSON.parse(localStorage.getItem(RAW_TRANSACTIONS_KEY) || '[]')
  }
})

// Clear price cache
const clearPriceCache = async () => {
  try {
    localStorage.removeItem(PRICE_CACHE_KEY)
    // Also clear intraday cache from both local and Firestore
    await clearIntradayCache(userId.value)
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
const isRematching = ref(false)
const uploadMessage = ref('')

// Load tickets from localStorage on mount
const loadTicketsFromStorage = async () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      tickets.value = JSON.parse(stored)
    } else {
      // Fallback: load from trades.js if localStorage is empty
      try {
        const { tradesData } = await import('./data/trades.js')
        tickets.value = tradesData
      } catch (e) {
        console.warn('Could not load trades.js:', e)
      }
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

// Save tickets to localStorage and Firestore
const saveTicketsToStorage = async () => {
  try {
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.value))

    // Also save to Firestore if authenticated
    if (isAuthenticated.value && userId.value) {
      await saveTicketsBatch(userId.value, tickets.value)
    }
  } catch (e) {
    console.error('Error saving tickets to storage:', e)
  }
}

// Save raw transactions to localStorage and Firestore
const saveRawTransactions = async () => {
  try {
    // Save to localStorage
    localStorage.setItem(RAW_TRANSACTIONS_KEY, JSON.stringify(rawTransactions.value))

    // Also save to Firestore if authenticated
    if (isAuthenticated.value && userId.value) {
      await saveRawTransactionsToFirestore(userId.value, rawTransactions.value)
    }
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
                 // Note: Don't compare action - for closing trades, actions are opposite (sell to open, buy to close)
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
    // For closed tickets, only use entry legs (first half) for duplicate detection
    const getTicketKey = (ticket) => {
      const legs = ticket.strategies[0].legs
      let legsForKey = legs

      // For closed tickets, only use entry legs (first half) for the key
      // A closed ticket has legs.length that is even (entry legs + exit legs)
      if (ticket.exit_date && legs.length % 2 === 0) {
        legsForKey = legs.slice(0, legs.length / 2)
      }

      const legsKey = legsForKey.map(l =>
        `${l.action}|${l.type}|${l.strike}|${l.expiry}|${l.quantity}`
      ).sort().join('||')
      // Don't include exit_date in key - allows matching open tickets with closed versions
      return `${ticket.symbol}|${ticket.date}|${legsKey}`
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

    // Automatically re-match tickets after upload
    await rematchAllTickets(true)

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

// formatDate, compareDates, parseOptionSymbol, generateSingleOptionName are now imported from parseWebull.js

// Format ISO date string to readable format (e.g., "Mar 15")
function formatNewsDate(isoDateStr) {
  if (!isoDateStr) return ''
  const date = new Date(isoDateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}`
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
  // Parse CSV using the shared parser module
  const allTickets = await parseWebullCSV(csvText, startTicketId)

  // Process expired positions (app-specific feature)
  const { expired, open: stillOpen } = await processExpiredTickets(allTickets, startTicketId + allTickets.length)

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

// Re-match all tickets - match BUY/SELL pairs that should close each other
const rematchAllTickets = async (skipConfirm = false) => {
  if (!skipConfirm && !confirm('Re-match all tickets? This will match BUY and SELL positions that should close each other.')) {
    return
  }

  isRematching.value = true
  uploadMessage.value = 'Re-matching tickets...'

  try {
    // Convert tickets back to trade format for matching
    const trades = []
    let nextTicketId = Math.max(...tickets.value.map(t => t.ticket), 0) + 1

    for (const ticket of tickets.value) {
      const legs = ticket.strategies[0]?.legs || []
      if (legs.length === 0) continue

      // For OPEN tickets, extract entry trade
      if (ticket.status === 'OPEN') {
        const side = legs[0].action === 'buy' ? 'Buy' : 'Sell'
        trades.push({
          ticketName: ticket.strategies[0]?.name || ticket.symbol,
          side,
          status: ticket.status,
          filledTime: ticket.strategies[0]?.entry_time || ticket.date,
          legs: legs.map(l => ({
            strike: l.strike,
            type: l.type,
            date: l.expiry,
            side: l.action === 'buy' ? 'Buy' : 'Sell',
            quantity: l.quantity,
            premium: l.premium,
            filledTime: ticket.strategies[0]?.entry_time || ticket.date
          }))
        })
      } else {
        // For CLOSED tickets, we could extract both entry and exit
        // For now, skip closed tickets as they're already matched
        continue
      }
    }

    // Group trades by leg signature and match them
    const sigGroups = {}
    for (const t of trades) {
      const sig = t.legs.map(l => `${l.strike}-${l.type}-${l.date}`).sort().join('|')
      if (!sigGroups[sig]) sigGroups[sig] = []
      sigGroups[sig].push(t)
    }

    const newTickets = []
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
              newTickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, nextTicketId++))
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
              newTickets.push(createClosedTicket(pos.trade, trade, closeQty, pnl, nextTicketId++))
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
          newTickets.push(createOpenTicket(pos.trade, pos.remaining, nextTicketId++))
        }
      }
    }

    // Add back closed tickets that weren't re-matched
    const unchangedClosed = tickets.value.filter(t => t.status !== 'OPEN')
    tickets.value = [...unchangedClosed, ...newTickets].sort((a, b) => a.ticket - b.ticket)

    // Save to storage
    saveTicketsToStorage()

    const closedCount = newTickets.filter(t => t.status !== 'OPEN').length
    const openCount = newTickets.filter(t => t.status === 'OPEN').length

    uploadMessage.value = `Re-matched: ${closedCount} closed, ${openCount} still open`
    setTimeout(() => uploadMessage.value = '', 3000)
  } catch (e) {
    console.error('Error re-matching tickets:', e)
    uploadMessage.value = 'Error re-matching tickets'
    setTimeout(() => uploadMessage.value = '', 3000)
  } finally {
    isRematching.value = false
  }
}
const currentMonth = ref(new Date(2026, 2, 1)) // March 2026
const calendarLeftTab = ref('calendar') // 'calendar' or 'monthly'
const calendarRightTab = ref('trades') // 'trades' or 'strategies'
const openPositionsCollapsed = ref(true)
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

// Trade view date picker state
const datePickerInput = ref(null)

// Default to today's date
const today = new Date().toISOString().split('T')[0]
const tradeDateRangeStart = ref(today)
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
const ticketsExpanded = ref(true) // Details tab expanded by default
const currentPositionIndex = ref(0) // Track which ticket is displayed in the graph
const tradeDetailTab = ref('chart') // Trade detail modal tab: 'chart', 'details', 'news' - chart first
const selectedTradeDate = ref(new Date().toISOString().split('T')[0]) // For day navigation in trades view - default to today

// Trades view mode: 'list' or 'square'
const tradesViewMode = ref('square')

// Color palette for equity symbols
const equityColors = [
  'bg-red-900/40', 'bg-blue-900/40', 'bg-green-900/40', 'bg-yellow-900/40',
  'bg-purple-900/40', 'bg-pink-900/40', 'bg-indigo-900/40', 'bg-orange-900/40',
  'bg-teal-900/40', 'bg-cyan-900/40', 'bg-emerald-900/40', 'bg-rose-900/40',
  'bg-violet-900/40', 'bg-amber-900/40', 'bg-lime-900/40', 'bg-sky-900/40'
]

const equityColorMap = ref(new Map())

const getEquityColor = (symbol) => {
  if (!equityColorMap.value.has(symbol)) {
    const usedColors = Array.from(equityColorMap.value.values())
    const availableColors = equityColors.filter(c => !usedColors.includes(c))
    const color = availableColors.length > 0 ? availableColors[0] : equityColors[equityColorMap.value.size % equityColors.length]
    equityColorMap.value.set(symbol, color)
  }
  return equityColorMap.value.get(symbol)
}

// Format expiry date as short format (e.g., "Mar 15")
const formatExpiryShort = (expiryStr) => {
  if (!expiryStr) return ''
  const [year, month, day] = expiryStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Flattened trades for square view (all position groups flat, still merged)
const flattenedTrades = computed(() => {
  const trades = []
  groupedBySymbol.value.forEach(symbolGroup => {
    symbolGroup.groups.forEach(group => {
      trades.push({ ...group, symbol: symbolGroup.symbol })
    })
  })
  return trades.sort((a, b) => {
    // Sort by exit date (most recent first)
    const dateA = a.positions?.[0]?.exit_date || a.positions?.[0]?.date || ''
    const dateB = b.positions?.[0]?.exit_date || b.positions?.[0]?.date || ''
    return new Date(dateB) - new Date(dateA)
  })
})

// Computed for modal open state
const tradeDetailModalOpen = computed({
  get: () => selectedPositionGroup.value !== null,
  set: (value) => {
    if (!value) selectedPositionGroup.value = null
  }
})

// All tickets in the selected group (for navigation)
const selectedSymbolTickets = computed(() => {
  return selectedPositionGroup.value?.tickets || []
})

// Reset position index when modal opens
watch(() => tradeDetailModalOpen.value, (isOpen) => {
  if (isOpen) {
    // Reset to first ticket in the group
    currentPositionIndex.value = 0
    // Auto-fetch news on modal open if API key configured
    fetchNewsForCurrentPosition()
  }
})

// Get equivalent symbols for news reuse (SPX/SPXW/SPY share news, VIX/VIXW share news)
const getEquivalentSymbols = (symbol) => {
  const equivalents = {
    'SPX': ['SPX', 'SPXW', 'SPY'],
    'SPXW': ['SPX', 'SPXW', 'SPY'],
    'SPY': ['SPX', 'SPXW', 'SPY'],
    'VIX': ['VIX', 'VIXW'],
    'VIXW': ['VIX', 'VIXW'],
  }
  return equivalents[symbol] || [symbol]
}

// Fetch news for current position when modal opens
const fetchNewsForCurrentPosition = async () => {
  if (!settings.value.newsApiKey?.trim()) return

  const currentPos = selectedSymbolTickets.value[currentPositionIndex.value]

  // Don't fetch if already has news or currently loading
  if (!currentPos || currentPos.news?.length > 0 || loadingNews.value[currentPos.ticket]) return

  // Get equivalent symbols for news reuse
  const equivalentSymbols = getEquivalentSymbols(currentPos.symbol)

  // Check if any ticket has news for the same equivalent symbol + date (reuse existing news)
  const existingNewsTicket = tickets.value.find(t =>
    equivalentSymbols.includes(t.symbol) &&
    t.date === currentPos.date &&
    t.news?.length > 0 &&
    t.ticket !== currentPos.ticket
  )

  if (existingNewsTicket) {
    console.log(`Reusing ${existingNewsTicket.news.length} existing news articles for ${currentPos.symbol} on ${currentPos.date}`)
    currentPos.news = existingNewsTicket.news
    await saveTicketsToStorage()
    return
  }

  loadingNews.value[currentPos.ticket] = true

  try {
    const news = await fetchMarketNews(currentPos.symbol, currentPos.date, settings.value.newsApiKey, settings.value.proxyUrl)

    if (news.length > 0) {
      currentPos.news = news
      await saveTicketsToStorage()
      console.log(`Fetched ${news.length} news articles for ${currentPos.symbol}`)
    }
  } catch (error) {
    console.error('Failed to fetch news:', error)
  } finally {
    loadingNews.value[currentPos.ticket] = false
  }
}

// Computed for modal max width - consistent across all tabs
const modalMaxWidth = computed(() => {
  // Always use the same width for all tabs
  return '3xl'
})

// Computed for modal content class (consistent height)
const modalContentClass = computed(() => {
  // Fixed height for consistent tab appearance, no scroll
  return 'p-4 overflow-hidden'
})

// Computed for modal custom class (height constraint)
const modalCustomClass = computed(() => {
  return 'max-h-[90vh]'
})

// Tickets summary for the collapsible header
const ticketsSummary = computed(() => {
  const tickets = selectedPositionGroup.value?.tickets || selectedPositionGroup.value?.positions || []
  const closedTickets = tickets.filter(t => t.status !== 'OPEN')
  const winCount = closedTickets.filter(t => t.status === 'WIN').length
  const lossCount = closedTickets.filter(t => t.status === 'LOSS').length
  const totalPnL = closedTickets.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winRate = closedTickets.length > 0 ? Math.round((winCount / closedTickets.length) * 100) : 0

  // Get current ticket's individual P&L (synced with graph)
  const currentTicket = tickets[currentPositionIndex.value] || tickets[0]
  const currentPnL = currentTicket?.pnl || 0

  return {
    totalPnL: Math.round(currentPnL),
    winCount,
    lossCount,
    winRate,
    ticketCount: tickets.length
  }
})

// Get position direction label (LONG/SHORT + PUT/CALL)
function getPositionDirectionLabel() {
  const tickets = selectedPositionGroup.value?.tickets || selectedPositionGroup.value?.positions || []
  if (tickets.length === 0) return ''

  const ticket = tickets[0]
  const legs = ticket.strategies?.[0]?.legs || []
  if (legs.length === 0) return ''

  // Determine if long or short based on first leg action
  const firstLeg = legs[0]
  const direction = firstLeg.action === 'buy' ? 'LONG' : 'SHORT'

  // Determine the option type(s) involved
  const types = [...new Set(legs.map(l => l.type.toUpperCase()))]

  // For single leg or same type
  if (types.length === 1) {
    return `${direction} ${types[0]}`
  }

  // For mixed types (spreads), show both
  return `${direction} ${types.join('/')}`
}

// Get position direction label for any group
function getGroupPositionDirectionLabel(group) {
  const tickets = group.tickets || group.positions || []
  if (tickets.length === 0) return ''

  const ticket = tickets[0]
  const legs = ticket.strategies?.[0]?.legs || []
  if (legs.length === 0) return ''

  // Determine if long or short based on first leg action
  const firstLeg = legs[0]
  const direction = firstLeg.action === 'buy' ? 'LONG' : 'SHORT'

  // Determine the option type(s) involved
  const types = [...new Set(legs.map(l => l.type.toUpperCase()))]

  // For single leg or same type
  if (types.length === 1) {
    return `${direction} ${types[0]}`
  }

  // For mixed types (spreads), show both
  return `${direction} ${types.join('/')}`
}

// Get position direction class for color coding
function getPositionDirectionClass() {
  const tickets = selectedPositionGroup.value?.tickets || selectedPositionGroup.value?.positions || []
  if (tickets.length === 0) return 'bg-gray-700/30 text-gray-300'

  const ticket = tickets[0]
  const legs = ticket.strategies?.[0]?.legs || []
  if (legs.length === 0) return 'bg-gray-700/30 text-gray-300'

  // Base color on direction (long/short)
  const firstLeg = legs[0]
  if (firstLeg.action === 'buy') {
    return 'bg-green-900/30 text-green-300'
  } else {
    return 'bg-red-900/30 text-red-300'
  }
}

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
  // Initialize auth first
  initializeAuth()

  // Load settings (always from localStorage initially)
  loadSettings()

  // Wait for auth state to load, then decide what to show
  if (!authLoading.value) {
    // Auth already loaded
    if (isAuthenticated.value) {
      loadUserData()
    } else {
      showAuthLanding.value = true
    }
  }
})

// Watch for auth state changes
watch([authLoading, isAuthenticated], ([loading, authenticated]) => {
  // Only proceed after auth loading is complete
  if (!loading) {
    if (authenticated) {
      // User is logged in, hide auth landing and load data
      showAuthLanding.value = false
      if (!tickets.value.length) {
        loadUserData()
      }
    } else if (!showAuthLanding.value) {
      // User not logged in and auth landing not shown yet
      showAuthLanding.value = true
    }
  }
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
    // Match legacy selectedTradeDate for day navigation (only when a specific date is selected)
    let matchSelectedDate = true
    if (selectedTradeDate.value) {
      matchSelectedDate = ticket.date === selectedTradeDate.value || ticket.exit_date === selectedTradeDate.value
    }
    return matchSymbol && matchStatus && matchDate && matchSelectedDate && matchTradeDateFilter
  })

  return filtered
})

// Filtered strategies for calendar view based on selected date
const filteredStrategies = computed(() => {
  const closedFiltered = filteredTickets.value.filter(t => t.status !== 'OPEN')

  // Group trades by strategy
  const strategyMap = new Map()
  closedFiltered.forEach(ticket => {
    const entryLegs = openingLegs(ticket)
    const detectedStrategy = detectStrategy(entryLegs)
    const strategy = getStrategyDisplayName(detectedStrategy) || 'Unknown'

    if (!strategyMap.has(strategy)) {
      strategyMap.set(strategy, {
        strategy,
        tickets: [],
        totalPnL: 0,
        wins: 0,
        losses: 0
      })
    }
    const group = strategyMap.get(strategy)
    group.tickets.push(ticket)
    group.totalPnL += (ticket.pnl || 0)
    if (ticket.status === 'WIN') group.wins++
    else if (ticket.status === 'LOSS') group.losses++
  })

  // Calculate strategy performance metrics
  return Array.from(strategyMap.values()).map(s => {
    const totalTrades = s.wins + s.losses
    const winRate = totalTrades > 0 ? Math.round((s.wins / totalTrades) * 100) : 0
    const avgWin = s.wins > 0 ? s.tickets.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / s.wins : 0
    const avgLoss = s.losses > 0 ? Math.abs(s.tickets.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)) / s.losses : 0
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
})

// Filtered yearly summary for charts based on selected date
const filteredYearlySummary = computed(() => {
  const closedFiltered = filteredTickets.value.filter(t => t.status !== 'OPEN')

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Group by month (using filtered tickets)
  const allMonthsData = Array.from({ length: 12 }, (_, i) => {
    const monthTickets = closedFiltered.filter(t => {
      const date = t.exit_date || t.date
      return new Date(date).getMonth() === i
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

  // Calculate totals
  const totalPnL = closedFiltered.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winners = closedFiltered.filter(t => t.status === 'WIN')
  const losers = closedFiltered.filter(t => t.status === 'LOSS')
  const winsAmount = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const lossesAmount = losers.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const profitFactor = lossesAmount !== 0 ? Math.abs(winsAmount / lossesAmount) : winsAmount > 0 ? 999 : 0

  return {
    totalPnL,
    totalTrades: closedFiltered.length,
    winRate: closedFiltered.length > 0 ? Math.round((winners.length / closedFiltered.length) * 100) : 0,
    profitFactor,
    monthlyData: allMonthsData.filter(m => m.count > 0),
    allMonthsData,
    tradesBySymbol: [], // Not used in filtered view
    strategyPerformance: filteredStrategies.value
  }
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

  // Track trade count by date
  const tradeCountByDate = {}
  tickets.value.forEach(ticket => {
    if (ticket.exit_date) {
      tradeCountByDate[ticket.exit_date] = (tradeCountByDate[ticket.exit_date] || 0) + 1
    }
  })

  for (let i = 0; i < firstDay; i++) {
    days.push({ date: null, dayOfMonth: '', pnl: 0, tradeCount: 0, weeklyPnl: 0, isSaturday: false })
  }

  // Calculate weekly P&L for each week
  let currentWeekPnl = 0
  let weekStartIndex = firstDay

  for (let day = 1; day <= totalDays; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayPnl = pnlByDate[date] || 0
    currentWeekPnl += dayPnl

    const dayOfWeek = (firstDay + day - 1) % 7
    const isSaturday = dayOfWeek === 6

    days.push({
      date,
      dayOfMonth: day,
      pnl: dayPnl,
      tradeCount: tradeCountByDate[date] || 0,
      weeklyPnl: isSaturday ? currentWeekPnl : 0,
      isSaturday: isSaturday
    })

    // Reset week P&L after Saturday
    if (isSaturday) {
      currentWeekPnl = 0
    }
  }

  // Add trailing empty cells to complete the last row
  const totalCells = firstDay + totalDays
  const remainingCells = (7 - (totalCells % 7)) % 7
  for (let i = 0; i < remainingCells; i++) {
    days.push({ date: null, dayOfMonth: '', pnl: 0, tradeCount: 0, weeklyPnl: 0, isSaturday: false })
  }

  return days
})

const calendarRowCount = computed(() => {
  return Math.max(5, Math.ceil(calendarDays.value.length / 7))
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

// Year filter for yearly summary
const selectedDashboardYear = ref(new Date().getFullYear())

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
  const legs = openingLegs(ticket)
  if (legs.length === 0) return 0

  let totalPnL = 0
  legs.forEach(leg => {
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
  const legs = openingLegs(ticket)
  if (legs.length === 0) return { strikes: [], maxProfit: 0, maxLoss: 0, breakeven: null, minPrice: 0, maxPrice: 0 }

  // Get all strikes including duplicates for display
  const allStrikes = legs.map(l => l.strike)
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
  if (!data.strikes.length) return '20,60 300,60'

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

// Generate colored segments for profit (green) and loss (red)
const getPnLGraphSegments = (ticket) => {
  const data = getPnLGraphData(ticket)
  if (!data.strikes.length) return { profitLines: [], lossLines: [], profitAreas: [], lossAreas: [] }

  const range = data.maxPrice - data.minPrice || 1
  const pnlRange = Math.max(Math.abs(data.maxProfit), Math.abs(data.maxLoss), 100)

  // Collect all points
  const points = []
  for (let px = 20; px <= 300; px += 3) {
    const price = (px - 20) / 280 * range + data.minPrice
    const pnl = calculatePnLAtPrice(ticket, price)
    const py = 60 - (pnl / pnlRange) * 40
    const clampedPy = Math.max(20, Math.min(100, py))
    points.push({ x: px, y: clampedPy, isProfit: pnl > 0 })
  }

  // Group into segments (consecutive points of same type)
  const profitSegments = []
  const lossSegments = []
  let currentSegment = null

  for (const point of points) {
    const segmentType = point.isProfit ? 'profit' : 'loss'
    const targetArray = point.isProfit ? profitSegments : lossSegments

    if (!currentSegment || currentSegment.type !== segmentType) {
      if (currentSegment) {
        currentSegment.array.push(currentSegment.points)
      }
      currentSegment = { type: segmentType, array: targetArray, points: [point] }
    } else {
      currentSegment.points.push(point)
    }
  }
  if (currentSegment) {
    currentSegment.array.push(currentSegment.points)
  }

  // Convert segments to SVG polylines
  const profitLines = profitSegments.map(seg => seg.map(p => `${p.x},${p.y}`).join(' '))
  const lossLines = lossSegments.map(seg => seg.map(p => `${p.x},${p.y}`).join(' '))

  // Create fill areas for each segment
  const profitAreas = profitSegments.map(seg => {
    const line = seg.map(p => `${p.x},${p.y}`).join(' ')
    return `${seg[0].x},60 ${line} ${seg[seg.length - 1].x},60`
  })
  const lossAreas = lossSegments.map(seg => {
    const line = seg.map(p => `${p.x},${p.y}`).join(' ')
    return `${seg[0].x},60 ${line} ${seg[seg.length - 1].x},60`
  })

  return { profitLines, lossLines, profitAreas, lossAreas }
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
  const openLegs = openingLegs(ticket)
  // If there are more legs than the opening legs, we have closing legs stored
  return legs.length > openLegs.length
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
  // Only switch to dashboard tab if not already in calendar/dashboard view
  if (activeTab.value !== 'calendar' && activeTab.value !== 'dashboard') {
    activeTab.value = 'dashboard'
  }
}

const selectMonth = (month) => {
  if (!month) return
  const year = selectedDashboardYear.value
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

  dateRange.value = {
    mode: 'range',
    single: null,
    start: startOfMonth,
    end: endOfMonth
  }
  selectedTradeDate.value = null
  tradeDateRangeStart.value = startOfMonth
  tradeDateRangeEnd.value = endOfMonth
  pendingDatePickerValue.value = startOfMonth
  // Only switch to dashboard tab if not already in calendar/dashboard view
  if (activeTab.value !== 'calendar' && activeTab.value !== 'dashboard') {
    activeTab.value = 'dashboard'
  }
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
  activeTab.value = 'dashboard'
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

// Group tickets by symbol + strategy + strikes + expiry
// Tickets with identical characteristics are merged into one group
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
        expiry: legs[0]?.expiry || null,
        expiries,
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
    group.totalPnL += ticket.pnl || 0
    group.totalQuantity += legs[0]?.quantity || 0
    if (ticket.status === 'WIN') group.wins++
    if (ticket.status === 'LOSS') group.losses++
    if (ticket.status === 'OPEN') group.openCount++
  })

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

  const result = Array.from(symbolMap.values()).sort((a, b) => b.totalPnL - a.totalPnL)

  // Debug logging
  console.log('=== groupedBySymbol ===')
  result.forEach(s => {
    console.log(`Symbol: ${s.symbol}, Groups: ${s.groups.length}`)
    s.groups.forEach(g => {
      console.log(`  Ticket: ${g.tickets[0]?.ticket}, Strikes: ${g.strikes}, Entry: ${g.tickets[0]?.strategies[0]?.entry_time}`)
    })
  })

  return result
})

// Split legs into opening (first half) and closing (second half)
// For strategies with entry and exit, legs are stored: entry legs first, then exit legs
const openingLegs = (ticket) => {
  const legs = ticket.strategies[0]?.legs || []
  if (legs.length === 0) return legs

  // If there's an exit time, legs should contain both entry and exit
  if (ticket.exit_date) {
    // Multi-leg strategies like strangles have 4 legs (2 entry + 2 exit)
    // Single-leg strategies have 2 legs (1 entry + 1 exit)
    // We need to identify which case we're in
    const uniqueStrikes = new Set(legs.map(l => l.strike))
    const uniqueTypes = new Set(legs.map(l => l.type))

    // If we have 2 different strikes or both put/call, it's a multi-leg strategy
    if (uniqueStrikes.size > 1 || uniqueTypes.size > 1) {
      // Multi-leg: 4 legs total, first 2 are entry
      if (legs.length === 4) return legs.slice(0, 2)
      // Fallback: assume first half
      const midPoint = Math.floor(legs.length / 2)
      return legs.slice(0, midPoint)
    } else {
      // Single-leg: first is entry, second is exit
      return legs.slice(0, 1)
    }
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

// Check if opening position is long (buy to open)
const isOpeningLong = (ticket) => {
  const legs = openingLegs(ticket)
  if (legs.length === 0) return false
  // Check the first leg - if it's a buy, it's a long position
  return legs[0].action === 'buy'
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

const saveTrade = async (trade) => {
  trade.ticket = Date.now()
  tickets.value.unshift(trade)
  saveTicketsToStorage()

  // Auto-fetch market news if API key is configured
  if (settings.value.newsApiKey?.trim() && trade.symbol && trade.date) {
    // Get equivalent symbols for news reuse
    const equivalentSymbols = getEquivalentSymbols(trade.symbol)

    // Check if any existing ticket has news for the same equivalent symbol + date
    const existingNewsTicket = tickets.value.find(t =>
      t.ticket !== trade.ticket &&
      equivalentSymbols.includes(t.symbol) &&
      t.date === trade.date &&
      t.news?.length > 0
    )

    if (existingNewsTicket) {
      console.log(`Reusing ${existingNewsTicket.news.length} existing news articles for ${trade.symbol} on ${trade.date}`)
      trade.news = existingNewsTicket.news
      saveTicketsToStorage()
    } else {
      // Fetch new news
      fetchMarketNews(trade.symbol, trade.date, settings.value.newsApiKey, settings.value.proxyUrl)
        .then(news => {
          if (news.length > 0) {
            trade.news = news
            saveTicketsToStorage()
            console.log(`Fetched ${news.length} news articles for ${trade.symbol}`)
          }
        })
        .catch(err => {
          console.error('Failed to fetch news:', err)
        })
    }
  }

  showAddModal.value = false
}

// Fetch news for an existing ticket
const fetchNewsForTicket = async (ticket) => {
  if (!settings.value.newsApiKey?.trim()) {
    alert('Please add a NewsAPI key in Settings first')
    return
  }

  if (!ticket.symbol || !ticket.date) {
    alert('Ticket must have a symbol and date')
    return
  }

  // Get equivalent symbols for news reuse
  const equivalentSymbols = getEquivalentSymbols(ticket.symbol)

  // Check if any existing ticket has news for the same equivalent symbol + date (reuse existing news)
  const existingNewsTicket = tickets.value.find(t =>
    t.ticket !== ticket.ticket &&
    equivalentSymbols.includes(t.symbol) &&
    t.date === ticket.date &&
    t.news?.length > 0
  )

  if (existingNewsTicket) {
    console.log(`Reusing ${existingNewsTicket.news.length} existing news articles for ${ticket.symbol} on ${ticket.date}`)
    ticket.news = existingNewsTicket.news
    await saveTicketsToStorage()
    alert(`Reused ${existingNewsTicket.news.length} existing news articles for ${ticket.symbol}`)
    return
  }

  loadingNews.value[ticket.ticket] = true

  try {
    const news = await fetchMarketNews(ticket.symbol, ticket.date, settings.value.newsApiKey, settings.value.proxyUrl)

    if (news.length > 0) {
      ticket.news = news
      await saveTicketsToStorage()
      console.log(`Fetched ${news.length} news articles for ${ticket.symbol}`)
      alert(`Fetched ${news.length} news articles for ${ticket.symbol}`)
    } else {
      alert(`No news found for ${ticket.symbol} around ${ticket.date}`)
    }
  } catch (error) {
    console.error('Failed to fetch news:', error)
    alert('Failed to fetch news. Check console for details.')
  } finally {
    loadingNews.value[ticket.ticket] = false
  }
}
</script>
