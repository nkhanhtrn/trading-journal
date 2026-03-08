<template>
  <div v-if="displayMonths.length > 0" class="inline-flex items-center gap-3 px-2 py-1 bg-gray-800/50 rounded">
    <div v-for="month in displayMonths" :key="month.key" class="flex flex-col items-center">
      <span class="text-[10px] text-gray-400 mb-0.5 font-medium">{{ month.name }}</span>
      <div class="grid grid-cols-7 gap-0.5">
        <div v-for="(day, i) in month.days" :key="i" class="w-2 h-2 flex items-center justify-center">
          <div v-if="day" :class="['w-1.5 h-1.5 rounded-sm transition-colors', getDayClass(month, day, i)]"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entryDates: Array,
  exitDates: Array,
  expiryDates: Array
})

// Parse date string safely, avoiding timezone issues
const parseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const displayMonths = computed(() => {
  const entryDates = (props.entryDates || []).filter(d => d).map(parseDate)
  const exitDates = (props.exitDates || []).filter(d => d).map(parseDate)
  const expiryDates = (props.expiryDates || []).filter(d => d).map(parseDate)

  if (!entryDates.length && !exitDates.length && !expiryDates.length) return []

  // Get entry month (first entry date)
  const firstEntry = entryDates.length > 0 ? entryDates[0] : null
  const entryMonth = firstEntry ? { year: firstEntry.getFullYear(), month: firstEntry.getMonth() } : null

  // Get exit month (prioritize exit dates over expiry dates)
  let exitMonth = null
  if (exitDates.length > 0) {
    const lastExit = exitDates.sort((a, b) => b - a)[0]
    exitMonth = { year: lastExit.getFullYear(), month: lastExit.getMonth() }
  } else if (expiryDates.length > 0) {
    // For open positions, use expiry date
    const lastExpiry = expiryDates.sort((a, b) => b - a)[0]
    exitMonth = { year: lastExpiry.getFullYear(), month: lastExpiry.getMonth() }
  }

  // Collect unique months to show (entry and exit months)
  const monthsToShow = []
  if (entryMonth) monthsToShow.push(entryMonth)
  if (exitMonth && (!entryMonth || entryMonth.year !== exitMonth.year || entryMonth.month !== exitMonth.month)) {
    monthsToShow.push(exitMonth)
  }

  const months = []

  monthsToShow.forEach(({ year, month }) => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []

    const entryDatesInMonth = entryDates.filter(d => d.getFullYear() === year && d.getMonth() === month)
    const exitDatesInMonth = exitDates.filter(d => d.getFullYear() === year && d.getMonth() === month)
    const expiryDatesInMonth = expiryDates.filter(d => d.getFullYear() === year && d.getMonth() === month)

    const entryDaysSet = new Set(entryDatesInMonth.map(d => d.getDate()))
    const exitDaysSet = new Set(exitDatesInMonth.map(d => d.getDate()))
    const expiryDaysSet = new Set(expiryDatesInMonth.map(d => d.getDate()))

    // Build calendar grid (always 42 cells for equal height)
    for (let i = 0; i < firstDay; i++) days.push('')
    for (let i = 1; i <= daysInMonth; i++) days.push(i)

    // Pad to 42 cells (6 weeks) for equal height
    while (days.length < 42) days.push('')

    months.push({
      key: `${year}-${month}`,
      dateKey: `${year}-${String(month + 1).padStart(2, '0')}`,
      year,
      monthNum: month,
      name: new Date(year, month).toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      days,
      entryDaysSet,
      exitDaysSet,
      expiryDaysSet,
      allEntryDates: entryDates,
      allExitDates: exitDates,
      allExpiryDates: expiryDates
    })
  })

  return months
})

const getDayClass = (month, day, dayIndex) => {
  const isWeekend = dayIndex % 7 === 0 || dayIndex % 7 === 6

  const isEntryDay = month.entryDaysSet.has(day)
  const isExitDay = month.exitDaysSet.has(day)
  const isExpiryDay = month.expiryDaysSet.has(day)

  const dayDate = new Date(month.year, month.monthNum, day)

  // Check if day is within any (entry, exit) pair
  const isInHoldingPeriod = month.allEntryDates.some((entryDate, i) => {
    const exitDate = month.allExitDates[i]
    if (!exitDate) return false
    return dayDate >= entryDate && dayDate <= exitDate
  })

  // Check if day is between exit and expiry for any position
  const isBetweenExitAndExpiry = month.allExitDates.some((exitDate, i) => {
    if (!exitDate) return false
    const expiryDate = month.allExpiryDates[i]
    if (!expiryDate) return false
    return dayDate > exitDate && dayDate <= expiryDate
  })

  // Also check if there's an open position (entry but no exit) - day is between entry and expiry
  const isOpenPositionHolding = month.allEntryDates.some((entryDate, i) => {
    const hasExit = month.allExitDates[i]
    if (hasExit) return false
    const expiryDate = month.allExpiryDates[i]
    if (!expiryDate) return false
    return dayDate >= entryDate && dayDate <= expiryDate
  })

  // If expiry and exit are the same day, use orange
  const isExpiryAndExitSame = isExpiryDay && isExitDay

  if (isExpiryAndExitSame) {
    return isWeekend ? 'bg-orange-500 opacity-30' : 'bg-orange-500'
  } else if (isExpiryDay) {
    return isWeekend ? 'bg-red-500 opacity-30' : 'bg-red-500'
  } else if (isEntryDay || isExitDay || isInHoldingPeriod) {
    return isWeekend ? 'bg-green-500 opacity-30' : 'bg-green-500'
  } else if (isBetweenExitAndExpiry || isOpenPositionHolding) {
    return isWeekend ? 'bg-gray-400 opacity-40' : 'bg-gray-400'
  } else {
    return isWeekend ? 'bg-gray-700 opacity-50' : 'bg-gray-700'
  }
}
</script>
