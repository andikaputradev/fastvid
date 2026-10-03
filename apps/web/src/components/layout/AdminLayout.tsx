import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar
          isMobile
          onClose={() => setMobileMenuOpen(false)}
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </div>

      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
          <AdminSidebar />
        </div>
        <div className="flex min-w-0 flex-col">
          <AdminTopbar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
