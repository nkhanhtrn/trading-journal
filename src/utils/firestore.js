// Firestore database operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

// Collection names
const COLLECTIONS = {
  TICKETS: 'tickets',
  RAW_TRANSACTIONS: 'raw_transactions',
  SETTINGS: 'settings',
  USERS: 'users'
}

// Get user document path
const getUserDocPath = (userId, collectionName) => {
  return `${COLLECTIONS.USERS}/${userId}/${collectionName}`
}

// Get collection reference for user data
const getUserCollection = (userId, collectionName) => {
  return collection(db, getUserDocPath(userId, collectionName))
}

// Get document reference for user data
const getUserDoc = (userId, collectionName, docId) => {
  return doc(db, getUserDocPath(userId, collectionName), docId)
}

// ============================================================================
// TICKETS OPERATIONS
// ============================================================================

export async function getTickets(userId) {
  if (!db) return []

  try {
    const q = query(
      getUserCollection(userId, COLLECTIONS.TICKETS),
      orderBy('ticket', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.data())
  } catch (error) {
    console.error('Error getting tickets:', error)
    throw error
  }
}

export async function getTicket(userId, ticketId) {
  if (!db) return null

  try {
    const docRef = getUserDoc(userId, COLLECTIONS.TICKETS, String(ticketId))
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? snapshot.data() : null
  } catch (error) {
    console.error('Error getting ticket:', error)
    throw error
  }
}

export async function saveTicket(userId, ticket) {
  if (!db) return

  try {
    const docRef = getUserDoc(userId, COLLECTIONS.TICKETS, String(ticket.ticket))
    const data = {
      ...ticket,
      updatedAt: serverTimestamp()
    }
    await setDoc(docRef, data, { merge: true })
  } catch (error) {
    console.error('Error saving ticket:', error)
    throw error
  }
}

export async function saveTicketsBatch(userId, tickets) {
  if (!db) return

  try {
    const batch = writeBatch(db)

    tickets.forEach(ticket => {
      const docRef = getUserDoc(userId, COLLECTIONS.TICKETS, String(ticket.ticket))
      const data = {
        ...ticket,
        updatedAt: serverTimestamp()
      }
      batch.set(docRef, data, { merge: true })
    })

    await batch.commit()
  } catch (error) {
    console.error('Error saving tickets batch:', error)
    throw error
  }
}

export async function deleteTicket(userId, ticketId) {
  if (!db) return

  try {
    const docRef = getUserDoc(userId, COLLECTIONS.TICKETS, String(ticketId))
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting ticket:', error)
    throw error
  }
}

// ============================================================================
// RAW TRANSACTIONS OPERATIONS
// ============================================================================

export async function getRawTransactions(userId) {
  if (!db) return []

  try {
    const snapshot = await getDocs(getUserCollection(userId, COLLECTIONS.RAW_TRANSACTIONS))
    return snapshot.docs.map(doc => doc.data())
  } catch (error) {
    console.error('Error getting raw transactions:', error)
    throw error
  }
}

export async function saveRawTransactions(userId, transactions) {
  if (!db) return

  try {
    const batch = writeBatch(db)

    // Clear existing transactions first
    const existingSnapshot = await getDocs(getUserCollection(userId, COLLECTIONS.RAW_TRANSACTIONS))
    existingSnapshot.docs.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref)
    })

    // Add new transactions
    transactions.forEach(transaction => {
      const docId = `${transaction.symbol}_${transaction.date}_${Math.random().toString(36).substr(2, 9)}`
      const docRef = doc(db, getUserDocPath(userId, COLLECTIONS.RAW_TRANSACTIONS), docId)
      batch.set(docRef, {
        ...transaction,
        updatedAt: serverTimestamp()
      })
    })

    await batch.commit()
  } catch (error) {
    console.error('Error saving raw transactions:', error)
    throw error
  }
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

export async function getSettings(userId) {
  if (!db) return {}

  try {
    const docRef = doc(db, getUserDocPath(userId, COLLECTIONS.SETTINGS), 'user_settings')
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? snapshot.data() : {}
  } catch (error) {
    console.error('Error getting settings:', error)
    throw error
  }
}

export async function saveSettings(userId, settings) {
  if (!db) return

  try {
    const docRef = doc(db, getUserDocPath(userId, COLLECTIONS.SETTINGS), 'user_settings')
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    throw error
  }
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

export function subscribeToTickets(userId, callback) {
  if (!db) return () => {}

  const q = query(
    getUserCollection(userId, COLLECTIONS.TICKETS),
    orderBy('ticket', 'desc')
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tickets = snapshot.docs.map(doc => doc.data())
    callback(tickets)
  }, (error) => {
    console.error('Tickets subscription error:', error)
  })

  return unsubscribe
}

export function subscribeToSettings(userId, callback) {
  if (!db) return () => {}

  const docRef = doc(db, getUserDocPath(userId, COLLECTIONS.SETTINGS), 'user_settings')

  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    const settings = snapshot.exists() ? snapshot.data() : {}
    callback(settings)
  }, (error) => {
    console.error('Settings subscription error:', error)
  })

  return unsubscribe
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

export async function migrateToFirestore(userId, localData) {
  if (!db) {
    throw new Error('Firebase not configured')
  }

  try {
    const { tickets, rawTransactions, settings } = localData

    // Batch save tickets
    if (tickets && tickets.length > 0) {
      await saveTicketsBatch(userId, tickets)
    }

    // Save raw transactions
    if (rawTransactions && rawTransactions.length > 0) {
      await saveRawTransactions(userId, rawTransactions)
    }

    // Save settings
    if (settings && Object.keys(settings).length > 0) {
      await saveSettings(userId, settings)
    }

    return {
      success: true,
      ticketsMigrated: tickets?.length || 0,
      transactionsMigrated: rawTransactions?.length || 0
    }
  } catch (error) {
    console.error('Migration error:', error)
    throw error
  }
}

export async function hasExistingData(userId) {
  if (!db) return false

  try {
    const ticketsSnapshot = await getDocs(
      query(getUserCollection(userId, COLLECTIONS.TICKETS))
    )
    return !ticketsSnapshot.empty
  } catch (error) {
    console.error('Error checking existing data:', error)
    return false
  }
}

export { COLLECTIONS }
