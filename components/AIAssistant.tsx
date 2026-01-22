'use client';

import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { SpreadsheetData } from '@/types/spreadsheet';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
}

interface AIAssistantProps {
  spreadsheetData?: SpreadsheetData;
  onApplyCode?: (code: string, type: 'formula' | 'transformation') => void;
}

export default function AIAssistant({ spreadsheetData, onApplyCode }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you with Excel formulas and data transformations. I only see your column headers, not your actual data. What would you like to do?',
    },
  ]);
  const [input, setInput] = useState('');
  const { askAI, loading } = useAIAssistant();

  const handleSend = async () => {
    if (!input.trim() || !spreadsheetData) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Ask AI with only headers and first row types
    const response = await askAI(
      input,
      spreadsheetData.headers,
      spreadsheetData.rows[0]
    );

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.success
        ? `${response.explanation}\n\n\`\`\`${response.type === 'formula' ? 'excel' : 'javascript'}\n${response.code}\n\`\`\``
        : `Error: ${response.error}`,
      provider: response.provider,
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Optionally auto-apply the code
    if (response.success && response.code && onApplyCode) {
      // Note: In a real app, you'd show a confirmation dialog
      // onApplyCode(response.code, response.type);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="glass-morphism px-6 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="text-white" size={22} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">AI Assistant</h3>
            <p className="text-xs text-gray-600 font-medium mt-0.5">
              🔒 Privacy: I only see column headers, never your data
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50 to-blue-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} message-bubble`}
          >
            {message.role === 'assistant' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot size={20} className="text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-md ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white message-bubble-user'
                  : 'bg-white text-gray-900 border border-gray-200 message-bubble-assistant'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              {message.provider && (
                <p className="text-xs mt-2 opacity-70 font-medium">via {message.provider}</p>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0 shadow-md">
                <User size={20} className="text-gray-700" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start message-bubble">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-md">
              <Bot size={20} className="text-blue-600" />
            </div>
            <div className="bg-white rounded-2xl px-5 py-3 shadow-md border border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white p-5 shadow-lg">
        {!spreadsheetData && (
          <div className="mb-3 bg-amber-50 border-l-4 border-amber-500 p-3 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">
              📄 Open a spreadsheet to start using AI assistance
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me to create formulas or transformations..."
              disabled={!spreadsheetData || loading}
              className="w-full px-5 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || !spreadsheetData || loading}
            className="btn px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
