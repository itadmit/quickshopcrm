"use client"

import { ScriptInjector } from "./ScriptInjector"

interface ScriptInjectorWrapperProps {
  shopId?: string
  companyId?: string
}

export function ScriptInjectorWrapper({ shopId, companyId }: ScriptInjectorWrapperProps) {
  return (
    <>
      <ScriptInjector shopId={shopId} companyId={companyId} location="HEAD" />
      <ScriptInjector shopId={shopId} companyId={companyId} location="BODY_START" />
      <ScriptInjector shopId={shopId} companyId={companyId} location="BODY_END" />
    </>
  )
}

