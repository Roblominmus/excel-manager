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

    // Check for API key configuration errors
    const isConfigError = response.error?.includes('not configured') || 
                          response.error?.includes('API key');

    let assistantContent: string;
    if (response.success) {
      assistantContent = `${response.explanation}\n\n\`\`\`${response.type === 'formula' ? 'excel' : 'javascript'}\n${response.code}\n\`\`\``;
    } else if (isConfigError) {
      assistantContent = `⚙️ **AI Configuration Required**

To use the AI assistant, you need to configure API keys for at least one AI provider.

**Supported Providers:**
- Groq (fast, recommended)
- DeepSeek
- OpenAI
- Anthropic

**How to configure:**
1. Create a \`.env.local\` file in the project root
2. Add your API keys:
   \`\`\`
   GROQ_API_KEY=your_key_here
   DEEPSEEK_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   \`\`\`
3. Restart the development server

Get API keys from:
- Groq: https://console.groq.com
- DeepSeek: https://platform.deepseek.com
- OpenAI: https://platform.openai.com
- Anthropic: https://console.anthropic.com`;
    } else {
      assistantContent = `❌ Error: ${response.error}`;
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: assistantContent,
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
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--gray-50)' }}>
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: 'var(--text-secondary)' }} />
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>AI Assistant</h3>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Privacy: Only sees column headers
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: 'var(--gray-200)' }}>
                <Bot size={14} style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3 py-2 text-sm`}
              style={{
                backgroundColor: message.role === 'user' ? 'rgba(0, 102, 204, 0.1)' : 'var(--gray-100)',
                color: 'var(--text-primary)',
              }}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              {message.provider && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>via {message.provider}</p>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: 'var(--gray-300)' }}>
                <User size={14} style={{ color: 'var(--text-primary)' }} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 flex items-center justify-center" style={{ backgroundColor: 'var(--gray-200)' }}>
              <Bot size={14} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="px-3 py-2" style={{ backgroundColor: 'var(--gray-100)' }}>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--gray-400)' }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--gray-400)', animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--gray-400)', animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
        {!spreadsheetData && (
          <div className="mb-2 bg-yellow-50 border border-yellow-200 p-2 text-xs text-yellow-900">
            Open a spreadsheet to use AI assistance
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me to create formulas..."
            disabled={!spreadsheetData || loading}
            className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !spreadsheetData || loading}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
