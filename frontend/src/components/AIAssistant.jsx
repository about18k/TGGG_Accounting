import React, { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea
} from './ui/accounting-ui';
import alviProfile from '@/assets/651002f6876413a3b201123bf1660ae20713e019.png';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Clock, 
  DollarSign, 
  Calendar,
  Users,
  Sparkles,
  Lightbulb,
  TrendingUp,
  FileText,
  HelpCircle,
  Zap
} from 'lucide-react';



const mockConversation = [
  {
    id: 1,
    content: "Hello! I'm your HR AI Assistant. I can help you with employee information, policies, leave balances, payroll questions, and much more. What would you like to know?",
    sender: 'ai',
    timestamp: '09:00 AM',
    suggestions: ['Check leave balance', 'Find employee info', 'Policy questions', 'Payroll help']
  }
];

const quickActions = [
  {
    title: 'Leave Balance',
    description: 'Check remaining vacation days',
    icon: Calendar,
    query: 'What is my leave balance?',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
  },
  {
    title: 'Payroll Info',
    description: 'Get payroll and salary details',
    icon: DollarSign,
    query: 'When is the next payroll date?',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
  },
  {
    title: 'Attendance',
    description: 'View attendance records',
    icon: Clock,
    query: 'Show my attendance this month',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
  },
  {
    title: 'Employee Directory',
    description: 'Find team member contacts',
    icon: Users,
    query: 'Find contact for Sarah Johnson',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
  },
  {
    title: 'Company Policies',
    description: 'Access HR policies',
    icon: FileText,
    query: 'What is the remote work policy?',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100'
  },
  {
    title: 'Performance',
    description: 'Check performance metrics',
    icon: TrendingUp,
    query: 'Show my performance review status',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100'
  }
];

const aiResponses = {
  'leave balance': "Based on your current leave balance:\n• Vacation: 17 days remaining (out of 25)\n• Sick Leave: 8 days remaining (out of 10)\n• Personal Days: 3 days remaining (out of 5)\n\nYou have upcoming leave scheduled for February 15-20 (5 vacation days).",
  'payroll': "Here's your payroll information:\n• Next Payroll Date: January 31st, 2024\n• Pay Frequency: Bi-weekly\n• Last Payslip: Available in your employee portal\n• Direct Deposit: Enabled to account ending in 4567\n\nWould you like me to show you how to access your payslips?",
  'attendance': "Your attendance summary for January 2024:\n• Days Present: 18 out of 20\n• Total Hours: 144 hours\n• Average Daily Hours: 8.4 hours\n• Late Arrivals: 2 times\n• Overall Attendance Rate: 94.2%\n\nYour attendance is above company average. Great job!",
  'employee directory': "I found Sarah Johnson's contact information:\n• Email: sarah.johnson@company.com\n• Phone: +1 (555) 123-4567\n• Department: Engineering\n• Position: Senior Developer\n• Manager: John Smith\n• Office Location: New York\n\nWould you like me to find anyone else's contact information?",
  'remote work policy': "Here's our Remote Work Policy summary:\n• Eligible employees can work remotely up to 3 days per week\n• Must maintain core hours: 10 AM - 3 PM EST\n• Required to attend in-person meetings when scheduled\n• Home office stipend: $500 annually\n• Equipment provided: Laptop, monitor, accessories\n\nFor the full policy document, check the HR portal under 'Policies & Procedures'.",
  'performance review': "Your Performance Review Status:\n• Current Review Cycle: Q1 2024\n• Review Period: January 1 - March 31, 2024\n• Self-Assessment: Due February 15th\n• Manager Review: Scheduled for February 20th\n• Goals Progress: 3 of 4 goals on track\n• Last Review Score: 4.2/5.0 (Exceeds Expectations)\n\nReminder: Complete your self-assessment by February 15th.",
  'default': "I understand you're asking about HR-related topics. I can help you with:\n• Employee information and directory\n• Leave balances and time-off requests\n• Payroll and benefits questions\n• Company policies and procedures\n• Attendance and performance data\n• Onboarding and training resources\n\nCould you please be more specific about what you'd like to know?"
};

export function AIAssistant() {
  const [messages, setMessages] = useState(mockConversation);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const getAIResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('leave') || lowerMessage.includes('vacation') || lowerMessage.includes('balance')) {
      return aiResponses['leave balance'];
    }
    if (lowerMessage.includes('payroll') || lowerMessage.includes('salary') || lowerMessage.includes('pay')) {
      return aiResponses['payroll'];
    }
    if (lowerMessage.includes('attendance') || lowerMessage.includes('hours') || lowerMessage.includes('time')) {
      return aiResponses['attendance'];
    }
    if (lowerMessage.includes('sarah') || lowerMessage.includes('contact') || lowerMessage.includes('directory')) {
      return aiResponses['employee directory'];
    }
    if (lowerMessage.includes('remote') || lowerMessage.includes('policy') || lowerMessage.includes('work from home')) {
      return aiResponses['remote work policy'];
    }
    if (lowerMessage.includes('performance') || lowerMessage.includes('review') || lowerMessage.includes('evaluation')) {
      return aiResponses['performance review'];
    }
    
    return aiResponses['default'];
  };

  const sendMessage = (content) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      content,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        content: getAIResponse(content),
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Ask another question', 'View employee portal', 'Schedule meeting', 'Contact HR']
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickAction = (query) => {
    sendMessage(query);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-medium flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-chart-1 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            AI Assistant
          </h1>
          <p className="text-muted-foreground">Get instant help with HR questions and tasks</p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <Zap className="w-3 h-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-accent/50"
                    onClick={() => handleQuickAction(action.query)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat with HR Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <ScrollArea className="h-96 p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.sender === 'ai' && (
                      <Avatar className="w-8 h-8 bg-gradient-to-r from-primary to-chart-1">
                        <AvatarFallback className="bg-gradient-to-r from-primary to-chart-1 text-primary-foreground">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`max-w-md ${message.sender === 'user' ? 'order-2' : ''}`}>
                      <div
                        className={`p-3 rounded-lg whitespace-pre-line ${
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-accent text-accent-foreground'
                        }`}
                      >
                        {message.content}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-3">
                        {message.timestamp}
                      </p>
                      
                      {/* Suggestions */}
                      {message.suggestions && message.sender === 'ai' && (
                        <div className="flex flex-wrap gap-2 mt-3 px-3">
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => sendMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.sender === 'user' && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={alviProfile} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 bg-gradient-to-r from-primary to-chart-1">
                      <AvatarFallback className="bg-gradient-to-r from-primary to-chart-1 text-primary-foreground">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-accent text-accent-foreground p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about HR..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
                  className="flex-1"
                />
                <Button onClick={() => sendMessage(inputMessage)} disabled={!inputMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 px-1">
                Ask about leave balances, policies, employee directory, payroll, and more
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Capabilities */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            What I Can Help You With
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Employee Information
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Find employee contacts</li>
                <li>• Department information</li>
                <li>• Reporting structure</li>
                <li>• Team directories</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Time & Attendance
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Leave balances</li>
                <li>• Attendance records</li>
                <li>• Holiday schedules</li>
                <li>• Time-off requests</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Payroll & Benefits
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Payroll schedules</li>
                <li>• Salary information</li>
                <li>• Benefits enrollment</li>
                <li>• Tax documents</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Policies & Procedures
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Company policies</li>
                <li>• HR procedures</li>
                <li>• Code of conduct</li>
                <li>• Compliance info</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Performance
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Review schedules</li>
                <li>• Goal tracking</li>
                <li>• Feedback history</li>
                <li>• Career development</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                General Support
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• IT support requests</li>
                <li>• Office locations</li>
                <li>• Training resources</li>
                <li>• FAQs and help</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
