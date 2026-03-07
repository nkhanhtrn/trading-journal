<template>
  <div class="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-gray-400 text-sm font-medium">{{ title }}</p>
        <p class="text-2xl font-bold mt-1" :class="textColorClass">{{ value }}</p>
      </div>
      <div class="w-12 h-12 rounded-full flex items-center justify-center" :class="bgColorClass">
        <i :class="['fas', icon, 'text-xl', iconColorClass]"></i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  value: [String, Number],
  icon: String,
  color: String
})

const textColorClass = computed(() => {
  const colors = {
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400'
  }
  return colors[props.color] || 'text-white'
})

const bgColorClass = computed(() => {
  const colors = {
    green: 'bg-green-900/30',
    red: 'bg-red-900/30',
    blue: 'bg-blue-900/30'
  }
  return colors[props.color] || 'bg-gray-700'
})

const iconColorClass = computed(() => {
  const colors = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500'
  }
  return colors[props.color] || 'text-white'
})
</script>
