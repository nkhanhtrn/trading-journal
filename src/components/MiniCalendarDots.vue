<template>
  <div v-if="displayMonths.length > 0" class="inline-flex items-center gap-3 px-2 py-1 bg-gray-800/50 rounded">
    <div v-for="month in displayMonths" :key="month.key" class="flex flex-col items-center">
      <span class="text-[10px] text-gray-400 mb-0.5 font-medium">{{ month.name }}</span>
      <div class="grid grid-cols-7 gap-0.5">
        <div v-for="(day, i) in month.days" :key="i" class="w-2 h-2 flex items-center justify-center">
          <div v-if="day" :class="['w-1.5 h-1.5 rounded-sm', month.activeDays.has(month.dateKey + '-' + String(day).padStart(2, '0')) ? 'bg-cyan-400' : 'bg-gray-700', (i % 7 === 0 || i % 7 === 6) ? 'opacity-20' : '']"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entryDates: Array,
  exitDates: Array
})

const displayMonths = computed(() => {
  const all = [...(props.entryDates || []), ...(props.exitDates || [])].filter(d => d)
  if (!all.length) return []

  const sorted = [...all].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const months = []
  const current = new Date(first)
  const end = new Date(last)

  while (current <= end) {
    const year = current.getFullYear()
    const month = current.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    const activeDays = new Set()

    // Highlight all dates in range (entry to exit)
    const rangeStart = new Date(first)
    const rangeEnd = new Date(last)
    const checkDate = new Date(rangeStart)
    while (checkDate <= rangeEnd) {
      activeDays.add(checkDate.toISOString().split('T')[0])
      checkDate.setDate(checkDate.getDate() + 1)
    }

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
      activeDays
    })

    current.setMonth(month + 1)
    current.setDate(1)
  }

  return months.slice(0, 2)
})
</script>
