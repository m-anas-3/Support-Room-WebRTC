"use client";

import { useState } from "react";
import Link from "next/link";
import type { CreatedRoom } from "@support-room/shared";
import { Check, Copy, Link2, Plus, Video } from "lucide-react";
import { toast } from "sonner";

import { useAgentIdentity } from "@/components/auth/agent-identity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSessionRecord } from "@/lib/sessions/client";
import { createSupportRoom, invitationUrl } from "@/lib/signaling/client";

export function CreateRoomDialog() {
  const agent = useAgentIdentity();
  const [created, setCreated] = useState<CreatedRoom | null>(null);
  const [reference, setReference] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);
  const inviteLink = created ? invitationUrl(created) : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invitation link copied");
    } catch { toast.error("Could not copy the link. Select and copy it manually."); }
  }

  return (
    <Dialog onOpenChange={(open) => { if (!open) { setCreated(null); setError(null); setHistoryWarning(null); } }}>
      <DialogTrigger render={<Button size="lg" className="h-10 px-4" />}><Plus />New room</DialogTrigger>
      <DialogContent className="min-w-0 grid-cols-[minmax(0,1fr)] sm:max-w-md [&>*]:min-w-0">
        {created ? (
          <>
            <DialogHeader>
              <span className="mb-1 grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-5" /></span>
              <DialogTitle>Room is ready</DialogTitle>
              <DialogDescription>Send this link to your customer. It expires in 30 minutes or when you end the room.</DialogDescription>
            </DialogHeader>
            <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border bg-muted/40 p-2 pl-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{inviteLink}</span>
              <Button variant="outline" size="icon" className="shrink-0" onClick={copyLink} aria-label="Copy invitation link"><Copy /></Button>
            </div>
            {historyWarning && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">{historyWarning}</p>}
            <DialogFooter>
              <Button nativeButton={false} className="w-full sm:w-auto" render={<Link href={`/room/${created.roomId}`} />}><Video />Open room</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create a support room</DialogTitle>
              <DialogDescription>Add a reference so this session is easy to find later.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reference">Reference</FieldLabel>
                <Input id="reference" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Order, ticket, or case number" />
              </Field>
            </FieldGroup>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button disabled={isCreating} onClick={async () => {
              setIsCreating(true); setError(null); setHistoryWarning(null);
              try {
                const room = await createSupportRoom(reference);
                try {
                  await createSessionRecord({ roomId: room.roomId, agentId: agent.id, agentName: agent.name, reference });
                } catch (historyError) {
                  setHistoryWarning(historyError instanceof Error ? historyError.message : "Room created, but its session history could not be saved.");
                }
                setCreated(room);
              }
              catch (roomError) { setError(roomError instanceof Error ? roomError.message : "Could not create the room."); }
              finally { setIsCreating(false); }
            }}><Plus />{isCreating ? "Creating…" : "Create room"}</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
