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
    <div className="h-full flex flex-col bg-white border-l">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-600" size={24} />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Privacy: I only see column headers, never your data
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-blue-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              {message.provider && (
                <p className="text-xs mt-2 opacity-70">via {message.provider}</p>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot size={18} className="text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        {!spreadsheetData && (
          <p className="text-sm text-amber-600 mb-2">
            Open a spreadsheet to start using AI assistance
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me to create formulas or transformations..."
            disabled={!spreadsheetData || loading}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !spreadsheetData || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
