import React, { useState } from 'react';
import { Users, Calendar, FileText, Truck, ClipboardList, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';

const SiteCoordinatorHub = ({ user, token, onLogout, onNavigate }) => {
  const [selectedFeature, setSelectedFeature] = useState(null);

  const stats = [
    { label: 'Active Teams', value: '4', color: '#FF7120', icon: Users },
    { label: 'Scheduled Tasks', value: '12', color: '#10B981', icon: Calendar },
    { label: 'Pending Reports', value: '3', color: '#3B82F6', icon: FileText },
    { label: 'Deliveries Today', value: '2', color: '#F59E0B', icon: Truck }
  ];

  const recentActivity = [
    { type: 'team', title: 'Team A assigned to Zone 2', date: '1 hour ago', status: 'completed' },
    { type: 'schedule', title: 'Updated weekly schedule', date: '3 hours ago', status: 'completed' },
    { type: 'delivery', title: 'Material delivery scheduled', date: '5 hours ago', status: 'pending' }
  ];

  const features = [
    {
      icon: Users,
      title: 'Team Management',
      description: 'Coordinate site teams and assignments',
      color: '#FF7120',
      details: 'Assign teams, track attendance, and manage workforce',
      actions: ['Assign Teams', 'View Roster']
    },
    {
      icon: Calendar,
      title: 'Schedule Coordination',
      description: 'Manage site schedules and timelines',
      color: '#10B981',
      details: 'Create schedules, coordinate tasks, and track deadlines',
      actions: ['Create Schedule', 'View Calendar']
    },
    {
      icon: FileText,
      title: 'Daily Reports',
      description: 'Generate and submit daily site reports',
      color: '#3B82F6',
      details: 'Document daily activities, progress, and issues',
      actions: ['New Report', 'View Reports']
    },
    {
      icon: Truck,
      title: 'Logistics Coordination',
      description: 'Manage deliveries and equipment',
      color: '#F59E0B',
      details: 'Schedule deliveries, track equipment, and coordinate logistics',
      actions: ['Schedule Delivery', 'Track Equipment']
    },
    {
      icon: ClipboardList,
      title: 'Task Assignment',
      description: 'Assign and track site tasks',
      color: '#8B5CF6',
      details: 'Create tasks, assign to teams, and monitor completion',
      actions: ['Create Task', 'View Tasks']
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: '#00273C' }}>
      <PublicNavigation onNavigate={onNavigate} currentPage="coordinator-hub" user={user} />

      <div className="pt-40 sm:pt-28 px-3 sm:px-6 pb-6 w-full">
        <div className="max-w-7xl mx-auto px-2 sm:px-10">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Site Coordinator Dashboard
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Welcome back, {user.first_name}! Coordinate teams, schedules, and site operations.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="p-4 rounded-lg"
                  style={{
                    background: '#002035',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isExpanded = selectedFeature === index;
              return (
                <div
                  key={index}
                  className="relative p-6 rounded-xl transition-all duration-300 cursor-pointer"
                  style={{
                    background: '#002035',
                    border: `1px solid ${isExpanded ? feature.color : 'rgba(255, 255, 255, 0.1)'}`,
                    gridColumn: isExpanded ? 'span 2' : 'span 1'
                  }}
                  onClick={() => setSelectedFeature(isExpanded ? null : index)}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${feature.color}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${feature.color}20`,
                        border: `1px solid ${feature.color}`
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: feature.color }} />
                    </div>
                    <div
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: 'rgba(255, 113, 32, 0.2)',
                        color: '#FF7120',
                        border: '1px solid #FF7120'
                      }}
                    >
                      Coming Soon
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-4">
                    {feature.description}
                  </p>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-gray-300 text-sm mb-4">{feature.details}</p>
                      <div className="flex gap-2 flex-wrap">
                        {feature.actions.map((action, idx) => (
                          <button
                            key={idx}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                              background: `${feature.color}20`,
                              color: feature.color,
                              border: `1px solid ${feature.color}`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = feature.color;
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = `${feature.color}20`;
                              e.currentTarget.style.color = feature.color;
                            }}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="p-6 rounded-xl" style={{ background: '#002035', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <button
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                style={{ transition: 'color 0.2s' }}
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: '#001f35' }}
                >
                  <div className="flex items-center gap-3">
                    {activity.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{activity.title}</p>
                      <p className="text-gray-400 text-xs">{activity.date}</p>
                    </div>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      background: activity.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                      color: activity.status === 'completed' ? '#10B981' : '#FBB936'
                    }}
                  >
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteCoordinatorHub;
