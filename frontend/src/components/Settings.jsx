import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Settings as SettingsIcon, 
  Building, 
  Users, 
  Plug, 
  Bell,
  Save,
  Shield,
  Globe,
  Mail,
  Smartphone,
  Clock,
  Database,
  Key,
  UserCheck,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Calendar,
  Video,
  Users2
} from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-medium">Settings</h1>
          <p className="text-muted-foreground">Configure your HR system preferences</p>
        </div>
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm cursor-pointer transition-shadow hover:shadow-xl"
          onClick={() => setActiveTab('company')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Company Settings</p>
                <p className="text-lg font-medium">Configure</p>
              </div>
              <Building className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Company-wide HR policies</p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm cursor-pointer transition-shadow hover:shadow-xl"
          onClick={() => setActiveTab('permissions')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">User Permissions</p>
                <p className="text-lg font-medium">Manage</p>
              </div>
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Roles and access control</p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm cursor-pointer transition-shadow hover:shadow-xl"
          onClick={() => setActiveTab('integrations')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Integrations</p>
                <p className="text-lg font-medium">Connect</p>
              </div>
              <Plug className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">External systems & tools</p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm cursor-pointer transition-shadow hover:shadow-xl"
          onClick={() => setActiveTab('notifications')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className="text-lg font-medium">Configure</p>
              </div>
              <Bell className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Alerts & preferences</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Company Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" placeholder="Triple G Accounting" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input id="companyEmail" type="email" placeholder="contact@tripleg.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD</SelectItem>
                      <SelectItem value="eur">EUR</SelectItem>
                      <SelectItem value="php">PHP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                User Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { role: 'Admin', users: 2, permissions: 'Full Access' },
                { role: 'HR Manager', users: 3, permissions: 'Employee & Payroll' },
                { role: 'Employee', users: 245, permissions: 'View Only' }
              ].map((role, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center gap-4">
                    <UserCheck className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{role.role}</p>
                      <p className="text-sm text-muted-foreground">{role.users} users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-primary/10 text-primary border-primary">
                      {role.permissions}
                    </Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="w-5 h-5 text-primary" />
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Slack', status: 'Connected', icon: MessageSquare },
                { name: 'Google Calendar', status: 'Connected', icon: Calendar },
                { name: 'Microsoft Teams', status: 'Available', icon: Users2 },
                { name: 'Zoom', status: 'Available', icon: Video }
              ].map((integration, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <integration.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">External integration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={integration.status === 'Connected' ? 'bg-primary/10 text-primary border-primary' : 'bg-secondary'}>
                      {integration.status}
                    </Badge>
                    <Button variant="outline" size="sm">
                      {integration.status === 'Connected' ? 'Configure' : 'Connect'}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { title: 'Email Notifications', description: 'Receive notifications via email', enabled: true },
                { title: 'Push Notifications', description: 'Browser push notifications', enabled: false },
                { title: 'Leave Requests', description: 'Notify when leave requests are submitted', enabled: true },
                { title: 'Payroll Alerts', description: 'Alerts for payroll processing', enabled: true },
                { title: 'System Updates', description: 'Notifications about system updates', enabled: false }
              ].map((notification, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {notification.enabled ? 
                        <CheckCircle className="w-5 h-5 text-primary" /> : 
                        <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                    </div>
                  </div>
                  <Switch defaultChecked={notification.enabled} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}