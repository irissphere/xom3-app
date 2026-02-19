import SurfaceFrame from "./components/SurfaceFrame";

export default function NotFound() {
  return (
    <SurfaceFrame
      title="Page not found"
      description="That page doesn’t exist. Use the dashboard to navigate."
      activation="active"
      links={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/leads", label: "Leads" },
        { href: "/settings", label: "Settings" },
      ]}
      footerNote="If you expected something else, tell us what you clicked so we can fix it."
    />
  );
}
