<template>
  <div v-if="show" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="onClose" @keyup.escape="onClose">
    <div :class="['bg-gray-800 rounded-lg w-full', maxWidthClass, customClass]">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 class="text-lg font-bold text-white">{{ title }}</h3>
        <button @click="onClose" class="text-gray-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Content -->
      <div :class="contentClass">
        <slot></slot>
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer" class="flex justify-end gap-2 p-4 border-t border-gray-700">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue'

const props = defineProps({
  show: Boolean,
  title: String,
  maxWidth: {
    type: String,
    default: 'md'
  },
  contentClass: {
    type: String,
    default: 'p-4 space-y-4'
  },
  customClass: String
})

const emit = defineEmits(['update:show', 'close'])

const onClose = () => {
  emit('update:show', false)
  emit('close')
}

// Handle escape key
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

const handleEscape = (e) => {
  if (e.key === 'Escape') {
    onClose()
  }
}
</script>

<script>
export default {
  computed: {
    maxWidthClass() {
      const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        full: 'max-w-full'
      }
      return sizes[this.maxWidth] || sizes.md
    }
  }
}
</script>
