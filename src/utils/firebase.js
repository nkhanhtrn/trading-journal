// Firebase initialization module - CLOUD SAVING DISABLED
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase configuration set to null to disable cloud saving
const firebaseConfig = {
  apiKey: null,
  authDomain: null,
  projectId: null,
  storageBucket: null,
  messagingSenderId: null,
  appId: null
}

// Firebase explicitly disabled - local-only mode
const app = null
const auth = null
const db = null

console.log('Cloud saving DISABLED - running in local-only mode')

export { app, auth, db }
export default app
