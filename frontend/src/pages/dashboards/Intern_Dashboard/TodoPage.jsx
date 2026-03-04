import React from 'react';
import TodoList from './TodoList.jsx';
import PublicNavigation from './PublicNavigation';

const TodoPage = ({ user, token, onLogout, onNavigate, onNotificationUpdate }) => {
  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="todo" />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10 w-full">
        <div className="max-w-[1400px] mx-auto px-2 sm:px-10 space-y-5 sm:space-y-8">
          <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] p-4 sm:p-6">
            <TodoList
              token={token}
              user={user}
              onNotificationUpdate={onNotificationUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
