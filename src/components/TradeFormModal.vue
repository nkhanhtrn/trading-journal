<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="fixed inset-0 bg-black/50"></div>
      <div class="relative bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700">
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 class="text-lg font-bold text-white">Add New Trade Ticket</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm text-gray-300 mb-1">Symbol</label>
              <input v-model="form.symbol" type="text" placeholder="SPY" required class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600">
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-1">Date</label>
              <input v-model="form.date" type="date" required class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600">
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-1">Status</label>
              <select v-model="form.status" required class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600">
                <option value="OPEN">Open</option>
                <option value="WIN">Win</option>
                <option value="LOSS">Loss</option>
              </select>
            </div>
          </div>

          <!-- Strategies -->
          <div class="bg-gray-700 rounded p-3">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm font-semibold">Strategies ({{ form.strategies.length }})</span>
              <button type="button" @click="addStrategy" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">+ Add</button>
            </div>

            <div v-for="(strat, i) in form.strategies" :key="i" class="bg-gray-800 rounded p-3 mb-2">
              <div class="flex justify-between items-center mb-2">
                <input v-model="strat.name" placeholder="Strategy name" class="bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600 flex-1 mr-2">
                <button type="button" @click="removeStrategy(i)" class="text-red-400 hover:text-red-300 text-xs"><i class="fas fa-trash"></i></button>
              </div>

              <!-- Legs -->
              <div class="space-y-2">
                <div v-for="(leg, j) in strat.legs" :key="j" class="flex gap-2 items-center bg-gray-750 rounded p-2">
                  <select v-model="leg.action" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
                    <option value="buy">Long</option>
                    <option value="sell">Short</option>
                  </select>
                  <select v-model="leg.type" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                  <input v-model.number="leg.strike" type="number" placeholder="Strike" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 w-20">
                  <input v-model="leg.expiry" type="date" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
                  <input v-model.number="leg.premium" type="number" step="0.01" placeholder="Prem" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 w-16">
                  <button type="button" @click="removeLeg(i, j)" class="text-red-400 text-xs"><i class="fas fa-times"></i></button>
                </div>
                <button type="button" @click="addLeg(i)" class="text-xs text-gray-400 hover:text-white">+ Add Leg</button>
              </div>

              <div class="grid grid-cols-5 gap-2 mt-2">
                <input v-model.number="strat.debit_paid" type="number" step="0.01" placeholder="Debit" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
                <input v-model.number="strat.credit_received" type="number" step="0.01" placeholder="Credit" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
                <input v-model.number="strat.entry_price" type="number" step="0.01" placeholder="Entry $:" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
                <input v-model="strat.entry_time" type="datetime-local" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
                <input v-model.number="strat.exit_price" type="number" step="0.01" placeholder="Exit $:" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600">
              </div>
              <div v-if="strat.exit_price" class="mt-2">
                <input v-model="strat.exit_time" type="datetime-local" placeholder="Exit time" class="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 w-full">
              </div>
            </div>

            <div v-if="form.strategies.length === 0" class="text-center py-4 text-gray-500 text-sm">Click "Add" to create a strategy</div>
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1">Notes</label>
            <textarea v-model="form.notes" rows="2" placeholder="Trade notes..." class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm"></textarea>
          </div>

          <div v-if="form.status !== 'OPEN'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-300 mb-1">Exit Date</label>
              <input v-model="form.exit_date" type="date" class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600">
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-1">P&L</label>
              <input v-model.number="form.pnl" type="number" step="0.01" placeholder="0.00" class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600">
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="$emit('close')" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded">Cancel</button>
            <button type="submit" :disabled="form.strategies.length === 0" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:bg-gray-600">Add Ticket</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['close', 'save'])

const form = ref({
  symbol: '',
  date: new Date().toISOString().split('T')[0],
  status: 'OPEN',
  strategies: [],
  notes: '',
  exit_date: '',
  pnl: 0
})

const addStrategy = () => {
  form.value.strategies.push({
    name: '',
    legs: [],
    debit_paid: null,
    credit_received: null,
    entry_price: null,
    entry_time: new Date().toISOString().slice(0, 16),
    exit_price: null,
    exit_time: null
  })
}

const removeStrategy = (index) => {
  form.value.strategies.splice(index, 1)
}

const addLeg = (strategyIndex) => {
  form.value.strategies[strategyIndex].legs.push({
    action: 'buy',
    type: 'call',
    strike: null,
    expiry: null,
    premium: null
  })
}

const removeLeg = (strategyIndex, legIndex) => {
  form.value.strategies[strategyIndex].legs.splice(legIndex, 1)
}

const handleSubmit = () => {
  emit('save', { ...form.value })
}
</script>
