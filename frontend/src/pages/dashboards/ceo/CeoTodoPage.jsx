import React from 'react';
import TodoList from '../Public_Dashboard/TodoList.jsx';
import CeoNavigation from './CeoNavigation';
import CeoSidebar from './CeoSidebar';

const CeoTodoPage = ({ user, token, onLogout, onNavigate, onNotificationUpdate }) => {
  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <CeoNavigation onNavigate={onNavigate} currentPage="todo" user={user} onLogout={onLogout} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-64 shrink-0">
            <CeoSidebar currentPage="todo" onNavigate={onNavigate} onLogout={onLogout} />
          </aside>

          <div className="flex-1 min-w-0 px-2 sm:px-4">
            <TodoList token={token} user={user} onNotificationUpdate={onNotificationUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CeoTodoPage;
