import React from 'react';
import { Button } from '../../../components/ui/button';
import TodoList from './TodoList.jsx';
import PublicNavigation from './PublicNavigation';

const TodoPage = ({ user, token, onLogout, onNavigate, onNotificationUpdate }) => {
  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="todo" user={user} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-1400px mx-auto px-2 sm:px-10">
          <TodoList 
            token={token} 
            user={user} 
            onNotificationUpdate={onNotificationUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
