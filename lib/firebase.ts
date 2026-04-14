import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDXa5cJt4cdHqqk8GIy7P27RtLoc55t_Oc",
  authDomain: "waypoint-c4679.firebaseapp.com",
  projectId: "waypoint-c4679",
  storageBucket: "waypoint-c4679.firebasestorage.app",
  messagingSenderId: "248723153797",
  appId: "1:248723153797:web:75e7ace3328479f818daec"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)