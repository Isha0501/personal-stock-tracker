'use client'

import { useEffect, useState } from 'react'
import { hasData } from '@/lib/storage'
import Dashboard from '@/components/Dashboard'
import UploadScreen from '@/components/UploadScreen'

export default function Home() {
  const [ready, setReady] = useState(false)
  const [hasUploaded, setHasUploaded] = useState(false)

  useEffect(() => {
    setHasUploaded(hasData())
    setReady(true)
  }, [])

  if (!ready) return null

  if (!hasUploaded) {
    return <UploadScreen onComplete={() => setHasUploaded(true)} />
  }

  return <Dashboard onReset={() => setHasUploaded(false)} />
}
