"use client";

import Link from "next/link";
import { ArrowUpRight, Video } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SavedHostRoom } from "@/lib/signaling/client";

export function OpenRooms({ rooms }: { rooms: SavedHostRoom[] }) {
  if (!rooms.length) return null;
  return (
    <Card className="overflow-hidden border shadow-none ring-0 [--card-spacing:1.5rem]">
      <CardHeader className="border-b">
        <CardTitle>Open rooms</CardTitle>
        <CardDescription>
          Return to a room you created in this browser tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {rooms.map((room) => (
          <Link
            key={room.roomId}
            href={`/room/${room.roomId}`}
            className="flex min-w-0 items-center gap-3 px-5 py-4 hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            aria-label={`Open room ${room.reference || room.roomId.slice(0, 8)}`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Video className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {room.reference || "Support room"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Expires{" "}
                {new Date(room.expiresAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <span className="hidden text-sm font-medium text-primary sm:inline">
              Open room
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-primary" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
