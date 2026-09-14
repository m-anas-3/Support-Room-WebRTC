import { SupportCall } from "@/components/room/support-call";

export default async function RoomPage({ params }: PageProps<"/room/[roomId]">) {
  const { roomId } = await params;
  return <SupportCall roomId={roomId} />;
}
