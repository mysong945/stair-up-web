'use client';

import { usePathname, useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  ClipboardList, 
  Settings 
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // 排除不显示导航栏的页面
  const hideNavPages = ['/login', '/register'];
  if (hideNavPages.includes(pathname)) {
    return null;
  }

  const navItems = [
    {
      name: '训练',
      path: '/',
      icon: TrendingUp,
    },
    {
      name: '记录',
      path: '/history',
      icon: ClipboardList,
    },
    {
      name: '设置',
      path: '/settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50"
      role="navigation"
      aria-label="主导航"
    >
      <div className="max-w-screen-sm mx-auto px-4">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[48px] min-h-[48px] px-3 py-1
                  transition-all duration-200 ease-in-out
                  rounded-lg
                  ${isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 active:scale-95'
                  }
                `}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className="mb-0.5"
                />
                <span 
                  className={`text-xs font-medium ${
                    isActive ? 'font-semibold' : ''
                  }`}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
