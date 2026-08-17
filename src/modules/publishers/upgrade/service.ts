import {
  apiClient,
  ApiClientError,
  getApiData,
  type ApiResponse,
} from "@/lib/apiClient"
import type { PublisherUpgradeStatus } from "./types"

export { ApiClientError as PublisherUpgradeServiceError }

/**
 * Publisher office-upgrade flow.
 *
 * OpenAPI:
 * - POST `/api/publisher/upgrade-request` — submit an upgrade request.
 * - GET  `/api/publisher/upgrade-status` — check current request status.
 */
export const publisherUpgradeService = {
  async request(payload?: {
    reason?: string
  }): Promise<PublisherUpgradeStatus> {
    const response = await apiClient.post<ApiResponse<PublisherUpgradeStatus>>(
      "/publisher/upgrade-request",
      payload ?? {}
    )
    return getApiData(response)
  },

  async status(): Promise<PublisherUpgradeStatus> {
    const response = await apiClient.get<ApiResponse<PublisherUpgradeStatus>>(
      "/publisher/upgrade-status",
      { silent: true }
    )
    return getApiData(response)
  },
}