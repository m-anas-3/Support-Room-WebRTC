import { CustomerJoin } from "@/components/join/customer-join";

export default async function JoinPage({ params }: PageProps<"/join/[roomId]">) {
  const { roomId } = await params;
  return <CustomerJoin roomId={roomId} />;
}
