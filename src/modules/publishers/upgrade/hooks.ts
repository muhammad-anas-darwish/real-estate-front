"use client"

import { useCallback, useEffect, useState } from "react"
import { ApiClientError } from "@/lib/apiClient"
import { publisherUpgradeService } from "./service"
import type { PublisherUpgradeStatus } from "./types"

export interface UsePublisherUpgradeResult {
  status: PublisherUpgradeStatus | null
  loading: boolean
  error: string | null
  request: (payload?: { reason?: string }) => Promise<PublisherUpgradeStatus | null>
  requesting: boolean
  refresh: () => Promise<void>
}

const DEFAULT_STATUS: PublisherUpgradeStatus = { status: "none" }

export function usePublisherUpgrade(
  isOffice: boolean
): UsePublisherUpgradeResult {
  const [status, setStatus] = useState<PublisherUpgradeStatus | null>(
    isOffice ? null : DEFAULT_STATUS
  )
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isOffice) {
      setStatus(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await publisherUpgradeService.status()
      setStatus(data)
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load upgrade status"
      setError(message)
      setStatus(DEFAULT_STATUS)
    } finally {
      setLoading(false)
    }
  }, [isOffice])

  useEffect(() => {
    void Promise.resolve().then(() => {
      void refresh()
    })
  }, [refresh])

  const request = useCallback(
    async (payload?: { reason?: string }) => {
      setRequesting(true)
      setError(null)
      try {
        const next = await publisherUpgradeService.request(payload)
        setStatus(next)
        return next
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Failed to send upgrade request"
        setError(message)
        return null
      } finally {
        setRequesting(false)
      }
    },
    []
  )

  return { status, loading, error, request, requesting, refresh }
}