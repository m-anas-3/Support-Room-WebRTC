"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Link2, Plus, Video } from "lucide-react";
import { toast } from "sonner";

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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const inviteLink = "supportroom.app/join/SR-8421";

export function CreateRoomDialog() {
  const [created, setCreated] = useState(false);

  function copyLink() {
    void navigator.clipboard?.writeText(`https://${inviteLink}`);
    toast.success("Invitation link copied");
  }

  return (
    <Dialog onOpenChange={(open) => !open && setCreated(false)}>
      <DialogTrigger render={<Button size="lg" className="h-10 px-4" />}><Plus />New room</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <span className="mb-1 grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-5" /></span>
              <DialogTitle>Room is ready</DialogTitle>
              <DialogDescription>Send this secure link to your customer. It expires when the session ends.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2 pl-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{inviteLink}</span>
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy invitation link"><Copy /></Button>
            </div>
            <DialogFooter>
              <Button className="w-full sm:w-auto" render={<Link href="/room/SR-8421" />}><Video />Open room</Button>
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
                <FieldLabel htmlFor="customer-name">Customer name</FieldLabel>
                <Input id="customer-name" placeholder="e.g. Jordan Taylor" />
              </Field>
              <Field>
                <FieldLabel htmlFor="reference">Reference</FieldLabel>
                <Input id="reference" placeholder="Order, ticket, or case number" />
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Session note</FieldLabel>
                <Textarea id="notes" placeholder="What will you help with?" className="min-h-20 resize-none" />
                <FieldDescription>Only agents can see this note.</FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter><Button onClick={() => setCreated(true)}><Plus />Create room</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
