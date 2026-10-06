import { readFile } from "fs/promises";
import path from "path";
import { Suspense } from "react";
import { WeddingApp } from "@/components/wedding/WeddingApp";

async function loadFragment(name: "envelope" | "main") {
  const file = path.join(
    process.cwd(),
    "public/wedding/fragments",
    `${name === "main" ? "main" : "envelope"}.html`,
  );
  return readFile(file, "utf8");
}

export default async function Home() {
  const [envelopeHtml, inviteHtml] = await Promise.all([
    loadFragment("envelope"),
    loadFragment("main"),
  ]);

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fff" }} />}>
      <WeddingApp envelopeHtml={envelopeHtml} inviteHtml={inviteHtml} />
    </Suspense>
  );
}
