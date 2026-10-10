import React, { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import { Navbar } from "../components/Navbar";
import { Toast } from "../components/Toast";

export const metadata: Metadata = {
  title: "NeoStats - Real-Time Collaborative Project Management",
  description: "Enterprise-grade real-time project management platform with RBAC and optimistic concurrency control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50/60 text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          <SocketProvider>
            <div className="flex min-h-screen flex-col">
              <Suspense fallback={null}>
                <Navbar />
              </Suspense>
              <main className="flex-1">
                <Suspense
                  fallback={
                    <div className="flex h-96 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    </div>
                  }
                >
                  {children}
                </Suspense>
              </main>
              <Toast />
            </div>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
