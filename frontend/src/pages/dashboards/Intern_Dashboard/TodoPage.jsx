import React from 'react';
import TodoList from './TodoList.jsx';
import PublicNavigation from './PublicNavigation';
import InternSidebar from './components/InternSidebar';

const TodoPage = ({ user, token, onLogout, onNavigate, onNotificationUpdate }) => {
  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="todo" />

      <div className="relative pt-28 px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <InternSidebar currentPage="todo" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] p-4 sm:p-6">
              <TodoList
                token={token}
                user={user}
                onNotificationUpdate={onNotificationUpdate}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
