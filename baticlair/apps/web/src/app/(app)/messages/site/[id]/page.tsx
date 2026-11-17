"use client";

import { useParams } from "next/navigation";
import { MessageDuSite } from "@/components/messages";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <MessageDuSite id={id} />;
}
