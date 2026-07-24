import type { Metadata } from "next";
import { ControlRoom } from "@/components/control-room";

export const metadata: Metadata = {
  title: "Control Room",
  description: "Generate an agent intent and run it through a Veylock policy.",
};

export default function AppPage() {
  return <ControlRoom />;
}
