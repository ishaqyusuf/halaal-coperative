import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <main>
      <h1>Halaal Cooperative Dashboard</h1>
      <p>Admin dashboard for cooperative management.</p>
    </main>
  );
}
