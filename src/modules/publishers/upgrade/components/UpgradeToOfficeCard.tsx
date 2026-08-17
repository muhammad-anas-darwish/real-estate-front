"use client"

import { Building2, CheckCircle2, Clock, XCircle, Send } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

import { usePublisherUpgrade } from "../hooks"

interface UpgradeToOfficeCardProps {
  publisherType: "individual" | "office" | null | undefined
}

export function UpgradeToOfficeCard({ publisherType }: UpgradeToOfficeCardProps) {
  const t = useTranslations("publisher.upgrade")
  const isOffice = publisherType === "office"
  const { status, loading, request, requesting, error } = usePublisherUpgrade(
    isOffice
  )
  const [reason, setReason] = useState("")

  if (isOffice) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-success" aria-hidden />
            {t("approvedTitle")}
          </CardTitle>
          <CardDescription>{t("approvedDescription")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const currentStatus = status?.status ?? "none"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentStatus === "pending" && (
          <PendingNotice
            rejectionReason={status?.rejection_reason ?? null}
            t={t}
          />
        )}

        {currentStatus === "rejected" && (
          <RejectedNotice
            rejectionReason={status?.rejection_reason ?? null}
            t={t}
          />
        )}

        {currentStatus === "approved" && !isOffice ? (
          <ApprovedNotice t={t} />
        ) : null}

        {currentStatus !== "pending" && (
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const next = await request(
                reason.trim() ? { reason: reason.trim() } : undefined
              )
              if (next) {
                toast.success(t("requestSent"))
                setReason("")
              }
            }}
          >
            <div className="space-y-1.5">
              <label
                htmlFor="upgrade-reason"
                className="text-sm font-medium"
              >
                {t("reasonLabel")}
              </label>
              <Textarea
                id="upgrade-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("reasonPlaceholder")}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{t("reasonHint")}</p>
            </div>
            <Button
              type="submit"
              disabled={requesting || loading}
              className="rounded-lg"
            >
              <Send className="mr-2 size-4" aria-hidden />
              {currentStatus === "rejected"
                ? t("resubmit")
                : t("submit")}
            </Button>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}

interface NoticeProps {
  rejectionReason: string | null
  t: ReturnType<typeof useTranslations<"publisher.upgrade">>
}

function PendingNotice({ t }: NoticeProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-sm">
      <Clock className="size-5 shrink-0 text-warning" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{t("pendingTitle")}</p>
        <p className="text-muted-foreground">{t("pendingDescription")}</p>
      </div>
    </div>
  )
}

function RejectedNotice({
  rejectionReason,
  t,
}: NoticeProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm">
      <XCircle className="size-5 shrink-0 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{t("rejectedTitle")}</p>
        <p className="text-muted-foreground">{t("rejectedDescription")}</p>
        {rejectionReason && (
          <p className="rounded-md bg-background/60 px-2.5 py-1.5 text-xs">
            {rejectionReason}
          </p>
        )}
      </div>
    </div>
  )
}

function ApprovedNotice({ t }: { t: ReturnType<typeof useTranslations<"publisher.upgrade">> }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-3.5 text-sm">
      <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{t("approvedTitle")}</p>
        <p className="text-muted-foreground">{t("approvedDescription")}</p>
      </div>
    </div>
  )
}