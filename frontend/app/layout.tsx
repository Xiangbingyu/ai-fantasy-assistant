import type { Metadata } from "next";
import "./globals.css";

// 导入客户端Provider组件
import { AuthProvider } from "./hooks/useAuth";

// 根布局文件默认是服务器组件，可以导出metadata
export const metadata: Metadata = {
  title: "AI Fantasy Assistant",
  description: "AI驱动的奇幻助手应用",
  icons: {
    icon: "/image/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* AuthProvider是客户端组件，但可以在服务器组件中使用 */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
