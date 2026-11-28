"use client";

import { useParams } from "next/navigation";
import { ReponseNegoce } from "@/components/messages";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ReponseNegoce id={id} />;
}
