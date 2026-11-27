import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminProviders } from "@/admin/components/providers/admin-providers";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-admin-sans",
});

export const metadata: Metadata = {
    title: {
        default: "VibeOGram Admin",
        template: "%s | VibeOGram Admin",
    },
};

const themeBootScript = `
(function () {
  try {
    var key = "vibeogram-admin-theme";
    var stored = localStorage.getItem(key);
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    var root = document.currentScript && document.currentScript.parentElement;
    if (!root) return;
    root.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className={`${inter.variable} admin-theme font-sans antialiased`}
            data-theme="dark"
            suppressHydrationWarning
        >
            <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
            <AdminProviders>{children}</AdminProviders>
        </div>
    );
}
