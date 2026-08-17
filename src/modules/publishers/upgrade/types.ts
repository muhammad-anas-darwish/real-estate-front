export type PublisherUpgradeRequestStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"

export interface PublisherUpgradeStatus {
  status: PublisherUpgradeRequestStatus
  rejection_reason?: string | null
  requested_at?: string | null
  decided_at?: string | null
}