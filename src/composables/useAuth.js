// Authentication composable for Firebase Email/Password Authentication
import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
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

  // Sign in with email and password
  const signIn = async (email, password) => {
    if (!auth) {
      return { success: false, error: 'Firebase not configured' }
    }

    try {
      isLoading.value = true
      error.value = null

      const result = await signInWithEmailAndPassword(auth, email, password)
      user.value = result.user

      return { success: true, user: result.user }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err.code)
      error.value = errorMessage
      console.error('Sign in error:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Sign up with email and password
  const signUp = async (email, password, displayName = '') => {
    if (!auth) {
      return { success: false, error: 'Firebase not configured' }
    }

    try {
      isLoading.value = true
      error.value = null

      const result = await createUserWithEmailAndPassword(auth, email, password)
      user.value = result.user

      // Update profile with display name if provided
      if (displayName && result.user) {
        await result.user.updateProfile({ displayName })
        user.value = { ...result.user, displayName }
      }

      return { success: true, user: user.value }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err.code)
      error.value = errorMessage
      console.error('Sign up error:', err)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Reset password
  const resetPassword = async (email) => {
    if (!auth) {
      return { success: false, error: 'Firebase not configured' }
    }

    try {
      isLoading.value = true
      error.value = null

      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err.code)
      error.value = errorMessage
      console.error('Password reset error:', err)
      return { success: false, error: errorMessage }
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
  const userName = computed(() => user.value?.displayName || user.value?.email?.split('@')[0] || '')
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
    signIn,
    signUp,
    signOut,
    resetPassword
  }
}

// Get user-friendly error messages from Firebase error codes
function getAuthErrorMessage(code) {
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/configuration-not-found': 'Email/Password authentication not enabled in Firebase Console',
    'auth/operation-not-allowed': 'Email/Password authentication not enabled'
  }
  return errorMessages[code] || code
}

// Export state refs for direct access
export { user as authUser, isLoading as authLoading, error as authError }
