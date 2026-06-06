'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Building2, Plus, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateOrgDialog } from '@/components/layout/CreateOrgDialog'
import type { OrgWithRole } from '@/types/api'

interface OrgSwitcherProps {
  orgs: OrgWithRole[]
  activeOrgId: string | null
  onSwitch: (orgId: string) => void
}

export function OrgSwitcher({ orgs, activeOrgId, onSwitch }: OrgSwitcherProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const activeOrg = orgs.find(o => o.id === activeOrgId)

  function handleOrgCreated(orgId: string) {
    onSwitch(orgId)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 h-9 max-w-[200px] px-3 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {activeOrg?.name ?? 'Select org'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {orgs.map(org => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => {
                onSwitch(org.id)
                router.refresh()
              }}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{org.name}</span>
              {org.id === activeOrgId && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
          {orgs.length === 0 && (
            <DropdownMenuItem disabled>No organizations</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="cursor-pointer text-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleOrgCreated}
      />
    </>
  )
}
