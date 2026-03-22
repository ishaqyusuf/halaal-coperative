import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <h1>Halaal Cooperative</h1>
      <p>Multi-tenant cooperative savings and loan management platform.</p>
    </main>
  );
}
