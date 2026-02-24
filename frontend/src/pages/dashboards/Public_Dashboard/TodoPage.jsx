import React from 'react';
import TodoList from './TodoList.jsx';
import PublicNavigation from './PublicNavigation';
import BimSpecialistSidebar from '../BimSpecialist/components/BimSpecialistSidebar';

const TodoPage = ({ user, token, onLogout, onNavigate, onNotificationUpdate }) => {
  const isBimSpecialistMode = user?.role === 'bim_specialist';

  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="todo" user={user} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className={isBimSpecialistMode ? 'max-w-[1600px] mx-auto flex gap-6' : 'max-w-1400px mx-auto px-2 sm:px-10'}>
          {isBimSpecialistMode && (
            <aside className="w-64 shrink-0 hidden lg:block">
              <BimSpecialistSidebar currentPage="todo" onNavigate={onNavigate} />
            </aside>
          )}

          <div className={isBimSpecialistMode ? 'flex-1 min-w-0 px-2 sm:px-4' : ''}>
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
