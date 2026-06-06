'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateOrgDialog } from '@/components/layout/CreateOrgDialog'

interface EmptyOrgStateProps {
  defaultOpen?: boolean
}

export function EmptyOrgState({ defaultOpen = false }: EmptyOrgStateProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(defaultOpen)

  function handleCreated() {
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="p-4 bg-primary/10 rounded-full">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome to MEEN Data Viz</h2>
          <p className="text-muted-foreground max-w-md">
            Create your first organization to start managing materials science experiment builds.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </>
  )
}
