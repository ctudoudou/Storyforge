"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, LayoutDashboard, Settings, Video, Users, HelpCircle, User } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: "工作台", path: "/" },
    { icon: Film, label: "我的项目", path: "/projects" },
    { icon: Users, label: "预设资产", path: "/assets" },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-neutral-300 font-sans selection:bg-neutral-700">
      {/* Sidebar */}
      <aside className="w-16 lg:w-64 border-r border-neutral-800 bg-neutral-900/50 flex flex-col justify-between flex-shrink-0 transition-all duration-300">
        <div>
          {/* Logo Area */}
          <div className="h-14 flex items-center justify-center lg:justify-start lg:px-6 border-b border-neutral-800/50">
            <Video className="w-6 h-6 text-neutral-100" />
            <span className="ml-3 font-semibold text-neutral-100 hidden lg:block tracking-wide">
              MakeStudio
            </span>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (pathname.startsWith('/project/') && item.path === '/');
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    "flex items-center justify-center lg:justify-start px-0 lg:px-3 py-2.5 rounded-lg transition-colors group",
                    isActive
                      ? "bg-neutral-800 text-neutral-100"
                      : "hover:bg-neutral-800/50 hover:text-neutral-100 text-neutral-400"
                  )}
                  title={item.label}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="ml-3 hidden lg:block text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 space-y-1 border-t border-neutral-800/50">
          <Link
            href="/settings"
            className={clsx(
              "w-full flex items-center justify-center lg:justify-start px-0 lg:px-3 py-2.5 rounded-lg transition-colors",
              pathname === "/settings"
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100"
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="ml-3 hidden lg:block text-sm font-medium">设置</span>
          </Link>
          <button className="w-full flex items-center justify-center lg:justify-start px-0 lg:px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100 transition-colors">
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            <span className="ml-3 hidden lg:block text-sm font-medium">帮助中心</span>
          </button>
          
          <div className="pt-4 mt-2 border-t border-neutral-800/50 flex items-center justify-center lg:justify-start lg:px-3 pb-2">
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden">
               <User className="w-4 h-4 text-neutral-300" />
            </div>
            <div className="ml-3 hidden lg:block">
              <p className="text-sm font-medium text-neutral-200">用户名称</p>
              <p className="text-xs text-neutral-500">Pro 计划</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
