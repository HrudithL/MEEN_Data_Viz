'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2, UserCog, Mail, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { OrgRole } from '@/types/database'

interface Member {
    user_id: string
    role: OrgRole
    joined_at: string
    profile?: {
        email: string
        display_name: string | null
    }
}

interface OrgSettingsClientProps {
    orgId: string
    orgName: string
    currentUserId: string
    userRole: OrgRole
}

const ROLE_LABELS: Record<OrgRole, string> = {
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
}

const ROLE_COLORS: Record<OrgRole, string> = {
    admin: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    editor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function OrgSettingsClient({
    orgId,
    orgName,
    currentUserId,
    userRole,
}: OrgSettingsClientProps) {
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Invite form
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<OrgRole>('editor')
    const [inviting, setInviting] = useState(false)
    const [inviteSuccess, setInviteSuccess] = useState('')
    const [inviteError, setInviteError] = useState('')

    // Transfer admin
    const [transferOpen, setTransferOpen] = useState(false)
    const [transferTarget, setTransferTarget] = useState('')
    const [transferring, setTransferring] = useState(false)

    // Remove member
    const [removeOpen, setRemoveOpen] = useState(false)
    const [removingId, setRemovingId] = useState<string | null>(null)

    const isAdmin = userRole === 'admin'

    async function loadMembers() {
        setLoading(true)
        try {
            const res = await fetch(`/api/organizations/${orgId}/members`)
            if (!res.ok) throw new Error('Failed to load members')
            const json = await res.json()
            setMembers(json.data ?? [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMembers()
    }, [orgId])

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault()
        if (!inviteEmail.trim()) return
        setInviting(true)
        setInviteError('')
        setInviteSuccess('')
        try {
            const res = await fetch(`/api/organizations/${orgId}/invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error?.message ?? 'Failed to send invitation')
            setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`)
            setInviteEmail('')
        } catch (err) {
            setInviteError(err instanceof Error ? err.message : 'Error sending invitation')
        } finally {
            setInviting(false)
        }
    }

    async function handleRoleChange(userId: string, role: OrgRole) {
        try {
            await fetch(`/api/organizations/${orgId}/members/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            })
            setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m))
        } catch {
            // ignore
        }
    }

    async function handleRemove(userId: string) {
        try {
            await fetch(`/api/organizations/${orgId}/members/${userId}`, { method: 'DELETE' })
            setMembers(prev => prev.filter(m => m.user_id !== userId))
        } catch {
            // ignore
        } finally {
            setRemoveOpen(false)
            setRemovingId(null)
        }
    }

    async function handleTransfer() {
        if (!transferTarget) return
        setTransferring(true)
        try {
            const res = await fetch(`/api/organizations/${orgId}/transfer-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: transferTarget }),
            })
            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error?.message ?? 'Failed to transfer admin')
            }
            setTransferOpen(false)
            await loadMembers()
        } catch {
            // ignore
        } finally {
            setTransferring(false)
        }
    }

    const nonAdminMembers = members.filter(
        m => m.user_id !== currentUserId && m.role !== 'admin'
    )

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold">{orgName}</h1>
                <p className="text-muted-foreground text-sm mt-1">Organization settings</p>
            </div>

            {/* Members section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Members</h2>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading members...</span>
                    </div>
                ) : error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    {isAdmin && <TableHead className="w-24">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map(member => (
                                    <TableRow key={member.user_id}>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {member.profile?.display_name ?? member.profile?.email ?? member.user_id}
                                                    {member.user_id === currentUserId && (
                                                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                                    )}
                                                </p>
                                                {member.profile?.display_name && (
                                                    <p className="text-xs text-muted-foreground">{member.profile.email}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isAdmin && member.user_id !== currentUserId ? (
                                                <Select
                                                    value={member.role}
                                                    onValueChange={v => v && handleRoleChange(member.user_id, v as OrgRole)}
                                                >
                                                    <SelectTrigger className="h-7 w-[100px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="editor">Editor</SelectItem>
                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs ${ROLE_COLORS[member.role]}`}
                                                >
                                                    {ROLE_LABELS[member.role]}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(member.joined_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell>
                                                {member.user_id !== currentUserId && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            setRemovingId(member.user_id)
                                                            setRemoveOpen(true)
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>

            {/* Invite section (admin only) */}
            {isAdmin && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">Invite Member</h2>
                    </div>
                    <form onSubmit={handleInvite} className="space-y-3">
                        <div className="flex gap-3 flex-wrap">
                            <div className="flex-1 min-w-[220px] space-y-1.5">
                                <Label htmlFor="invite-email" className="text-sm">Email address</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="colleague@example.com"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm">Role</Label>
                                <Select value={inviteRole} onValueChange={v => v && setInviteRole(v as OrgRole)}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="invisible text-sm">Send</Label>
                                <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                                    {inviting ? 'Sending...' : 'Send Invite'}
                                </Button>
                            </div>
                        </div>
                        {inviteSuccess && (
                            <p className="text-sm text-emerald-400">{inviteSuccess}</p>
                        )}
                        {inviteError && (
                            <p className="text-sm text-destructive">{inviteError}</p>
                        )}
                    </form>
                </section>
            )}

            {/* Transfer admin (admin only) */}
            {isAdmin && nonAdminMembers.length > 0 && (
                <>
                    <Separator />
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-lg font-semibold">Transfer Admin</h2>
                        </div>
                        <Alert variant="default" className="border-amber-500/20 bg-amber-500/10">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <AlertDescription className="text-amber-300 text-sm">
                                Transferring admin role will remove your admin access. This cannot be undone without the new admin.
                            </AlertDescription>
                        </Alert>
                        <div className="flex gap-3 items-end flex-wrap">
                            <div className="space-y-1.5 min-w-[200px]">
                                <Label className="text-sm">Transfer to</Label>
                                <Select value={transferTarget} onValueChange={(v) => setTransferTarget(v ?? '')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {nonAdminMembers.map(m => (
                                            <SelectItem key={m.user_id} value={m.user_id}>
                                                {m.profile?.display_name ?? m.profile?.email ?? m.user_id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="destructive"
                                disabled={!transferTarget || transferring}
                                onClick={() => setTransferOpen(true)}
                            >
                                {transferring ? 'Transferring...' : 'Transfer Admin'}
                            </Button>
                        </div>
                    </section>
                </>
            )}

            {/* Remove member dialog */}
            <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove member?</DialogTitle>
                        <DialogDescription>
                            This will remove the member from the organization. They will lose access immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => removingId && handleRemove(removingId)}
                        >
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer admin dialog */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm admin transfer</DialogTitle>
                        <DialogDescription>
                            You will lose admin access after this action. Are you sure?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleTransfer}
                            disabled={transferring}
                        >
                            {transferring ? 'Transferring...' : 'Yes, transfer admin'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
