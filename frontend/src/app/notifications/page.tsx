'use client';
import { useState } from 'react';
import { 
  Bell, Package, DollarSign, Star, 
  AlertCircle, CheckCircle, Clock, Settings 
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'payments' | 'system'>('all');

  // Mock notifications data
  const mockNotifications = [
    {
      id: '1',
      type: 'order',
      title: 'New Order Received',
      message: 'Order #AB123456 - 2×6kg cylinders for delivery',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      read: false,
      icon: Package,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment Received',
      message: 'GH₵85.00 payment confirmed for order #AB123455',
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      read: false,
      icon: DollarSign,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: '3',
      type: 'system',
      title: 'Rider KYC Approved',
      message: 'Kwame Asante\'s KYC verification has been approved',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      read: true,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: '4',
      type: 'order',
      title: 'Order Delivered',
      message: 'Order #AB123454 has been successfully delivered',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      read: true,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: '5',
      type: 'system',
      title: 'Low Stock Alert',
      message: 'Kofi Gas Station: 6kg cylinders running low (3 remaining)',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      read: true,
      icon: AlertCircle,
      color: 'text-yellow-600 bg-yellow-100'
    },
    {
      id: '6',
      type: 'order',
      title: 'New Review Received',
      message: 'Customer left a 5-star review for your service',
      timestamp: new Date(Date.now() - 10800000), // 3 hours ago
      read: true,
      icon: Star,
      color: 'text-yellow-600 bg-yellow-100'
    }
  ];

  const filteredNotifications = activeTab === 'all' 
    ? mockNotifications 
    : mockNotifications.filter(n => n.type === activeTab);

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    // In real app, this would call an API
    console.log('Mark all as read');
  };

  const markAsRead = (id: string) => {
    // In real app, this would call an API
    console.log('Mark as read:', id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-gray-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500">{unreadCount} unread notifications</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            {unreadCount > 0 && (
              <Button size="sm" onClick={markAllAsRead}>
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All', count: mockNotifications.length },
            { key: 'orders', label: 'Orders', count: mockNotifications.filter(n => n.type === 'order').length },
            { key: 'payments', label: 'Payments', count: mockNotifications.filter(n => n.type === 'payment').length },
            { key: 'system', label: 'System', count: mockNotifications.filter(n => n.type === 'system').length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {filteredNotifications.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {activeTab === 'all' 
                ? 'You\'re all caught up! No new notifications.'
                : `No ${activeTab} notifications at the moment.`
              }
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const IconComponent = notification.icon;
              
              return (
                <Card 
                  key={notification.id}
                  className={`cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`text-sm ${!notification.read ? 'text-gray-700' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`${
                          notification.type === 'order' ? 'bg-blue-100 text-blue-700' :
                          notification.type === 'payment' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {notification.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Notification Settings */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Notification Preferences</h3>
              <p className="text-sm text-blue-700 mb-3">
                Customize which notifications you receive and how you're notified.
              </p>
              <Button size="sm" variant="secondary">
                Manage Preferences
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}