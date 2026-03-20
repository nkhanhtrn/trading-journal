// Authentication composable for Firebase Google Sign-In
import { ref, computed } from 'vue'
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth } from '../utils/firebase'

// Global auth state (persistent across composable instances)
const user = ref(null)
const isLoading = ref(true)
const error = ref(null)

// Auth state listener (unsubscriber function)
let unsubscribe = null

export function useAuth() {
  // Initialize auth state listener (call once on app mount)
  const initialize = () => {
    if (unsubscribe) return // Already initialized

    if (!auth) {
      // Firebase not configured, set to local-only mode
      isLoading.value = false
      return
    }

    unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        user.value = currentUser
        isLoading.value = false
        error.value = null
      },
      (err) => {
        error.value = err.message
        isLoading.value = false
        console.error('Auth state change error:', err)
      }
    )
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!auth) {
      return { success: false, error: 'Firebase not configured' }
    }

    try {
      isLoading.value = true
      error.value = null

      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')

      const result = await signInWithPopup(auth, provider)
      user.value = result.user

      return { success: true, user: result.user }
    } catch (err) {
      error.value = err.message
      console.error('Sign in error:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    if (!auth) {
      return { success: true }
    }

    try {
      isLoading.value = true
      error.value = null

      await firebaseSignOut(auth)
      user.value = null

      return { success: true }
    } catch (err) {
      error.value = err.message
      console.error('Sign out error:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Computed properties
  const isAuthenticated = computed(() => user.value !== null)
  const userEmail = computed(() => user.value?.email || '')
  const userName = computed(() => user.value?.displayName || '')
  const userPhoto = computed(() => user.value?.photoURL || '')
  const userId = computed(() => user.value?.uid || '')

  return {
    // State
    user,
    isLoading,
    error,
    isAuthenticated,
    userEmail,
    userName,
    userPhoto,
    userId,
    // Methods
    initialize,
    signInWithGoogle,
    signOut
  }
}

// Export state refs for direct access
export { user as authUser, isLoading as authLoading, error as authError }
