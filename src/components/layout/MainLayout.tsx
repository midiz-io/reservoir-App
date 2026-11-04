import { ReactNode } from 'react';
import { Sidebar, MobileHeader } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Main Content */}
      <div className="lg:ml-64 print:ml-0 transition-all duration-300">
        {/* Desktop Header */}
        <div className="hidden lg:block print:hidden">
          <Header />
        </div>
        
        {/* Content with mobile top padding */}
        <main className="p-4 sm:p-6 pt-20 lg:pt-6 print:p-0 print:m-0">{children}</main>
      </div>
    </div>
  );
}
