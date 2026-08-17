"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Lock, Sparkles } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { useFeatureAccess } from "src/modules/subscriptions"

interface FeatureGateProps {
  slug: string
  children: ReactNode
  fallback?: ReactNode
  hideWhenLocked?: boolean
  /**
   * Where to send the user when the feature is locked. Defaults to the
   * public subscription plans catalog.
   */
  upgradeHref?: string
}

export function FeatureGate({
  slug,
  children,
  fallback,
  hideWhenLocked = false,
  upgradeHref,
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureAccess(slug)
  const locale = useLocale()
  const t = useTranslations("featureGate")

  if (loading) {
    return hideWhenLocked ? null : <>{fallback ?? <LockedCard reason="loading" />}</>
  }

  if (!enabled) {
    if (hideWhenLocked) return null
    if (fallback !== undefined) return <>{fallback}</>
    return (
      <LockedCard
        reason="locked"
        upgradeHref={upgradeHref ?? `/${locale}/subscriptions/plans`}
        title={t("locked.title")}
        description={t("locked.description")}
        upgradeLabel={t("locked.upgrade")}
        loadingTitle={t("loading.title")}
        loadingDescription={t("loading.description")}
      />
    )
  }

  return <>{children}</>
}

interface LockedCardProps {
  reason: "locked" | "loading"
  upgradeHref?: string
  title?: string
  description?: string
  upgradeLabel?: string
  loadingTitle?: string
  loadingDescription?: string
}

function LockedCard({
  reason,
  upgradeHref,
  title,
  description,
  upgradeLabel,
  loadingTitle,
  loadingDescription,
}: LockedCardProps) {
  const t = useTranslations("featureGate")
  const isLocked = reason === "locked"

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isLocked ? <Lock className="size-5" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
        </div>
        <h2 className="text-lg font-semibold tracking-tight">
          {isLocked ? title ?? t("locked.title") : loadingTitle ?? t("loading.title")}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {isLocked ? description ?? t("locked.description") : loadingDescription ?? t("loading.description")}
        </p>
        {isLocked && upgradeHref && upgradeLabel && (
          <Link href={upgradeHref} className={buttonVariants({ className: "rounded-lg" })}>
            {upgradeLabel}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}