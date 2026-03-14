import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'calendar',
    // Use a simple component that just renders based on route name
    component: { template: '<div></div>' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: { template: '<div></div>' }
  }
]

const router = createRouter({
  history: createWebHistory('/trading-journal/'),
  routes
})

export default router
