'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Build } from '@/types/database'

interface BuildSettingsFormProps {
    build: Build
    canEdit: boolean
}

export function BuildSettingsForm({ build, canEdit }: BuildSettingsFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [form, setForm] = useState({
        name: build.name,
        description: build.description ?? '',
        material: build.material ?? '',
        process: build.process ?? '',
    })

    function update(key: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setSuccess('')
            setForm(prev => ({ ...prev, [key]: e.target.value }))
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canEdit || !form.name.trim()) return

        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const res = await fetch(`/api/builds/${build.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    material: form.material.trim() || null,
                    process: form.process.trim() || null,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error?.message ?? 'Failed to save build settings')

            setSuccess('Build settings saved.')
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Build settings</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                    <div className="space-y-2">
                        <Label htmlFor="build-settings-name">
                            Build name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="build-settings-name"
                            value={form.name}
                            onChange={update('name')}
                            required
                            disabled={!canEdit}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="build-settings-desc">Description</Label>
                        <Textarea
                            id="build-settings-desc"
                            value={form.description}
                            onChange={update('description')}
                            rows={3}
                            disabled={!canEdit}
                            placeholder="Brief description of this experiment build..."
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="build-settings-material">Material</Label>
                            <Input
                                id="build-settings-material"
                                value={form.material}
                                onChange={update('material')}
                                disabled={!canEdit}
                                placeholder="e.g. Ti-6Al-4V"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="build-settings-process">Process</Label>
                            <Input
                                id="build-settings-process"
                                value={form.process}
                                onChange={update('process')}
                                disabled={!canEdit}
                                placeholder="e.g. LPBF, DED"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        Status: {build.status === 'complete' ? 'Complete' : 'In progress'} (derived from phase completion)
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {success && <p className="text-sm text-emerald-400">{success}</p>}

                    {canEdit ? (
                        <Button type="submit" disabled={loading || !form.name.trim()}>
                            {loading ? 'Saving...' : 'Save changes'}
                        </Button>
                    ) : (
                        <p className="text-sm text-muted-foreground">You have read-only access to this build.</p>
                    )}
                </form>
            </CardContent>
        </Card>
    )
}
