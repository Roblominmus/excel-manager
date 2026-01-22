'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Send, Bot, User, Trash2, X, Save, Copy } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { SpreadsheetData } from '@/types/spreadsheet';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  code?: string;
}

interface SavedFormula {
  id: string;
  formula: string;
  description: string;
  timestamp: number;
}

interface AIAssistantProps {
  spreadsheetData?: SpreadsheetData;
  evaluateFormula?: (formula: string) => unknown;
  onApplyCode?: (code: string, type: 'formula' | 'transformation') => void;
  onClose?: () => void;
}

export default function AIAssistant({ spreadsheetData, evaluateFormula, onApplyCode, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you with Excel formulas and data transformations. I only see your column headers, not your actual data. What would you like to do?',
    },
  ]);
  const [input, setInput] = useState('');
  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>([]);
  const [showSavedFormulas, setShowSavedFormulas] = useState(false);
  const { askAI, loading } = useAIAssistant();

  // Load saved formulas from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedFormulas');
    if (saved) {
      try {
        setSavedFormulas(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved formulas:', e);
      }
    }
  }, []);

  // Save formula to localStorage
  const saveFormula = useCallback((formula: string, description: string) => {
    const timestamp = Date.now();
    const newFormula: SavedFormula = {
      id: timestamp.toString(),
      formula,
      description,
      timestamp,
    };
    const updated = [...savedFormulas, newFormula];
    setSavedFormulas(updated);
    localStorage.setItem('savedFormulas', JSON.stringify(updated));
  }, [savedFormulas]);

  // Delete formula
  const deleteFormula = useCallback((id: string) => {
    const updated = savedFormulas.filter(f => f.id !== id);
    setSavedFormulas(updated);
    localStorage.setItem('savedFormulas', JSON.stringify(updated));
  }, [savedFormulas]);

  const handleSend = async () => {
    if (!input.trim() || !spreadsheetData) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    // Ask AI with full data so it can analyze and calculate
    const response = await askAI(
      currentInput,
      spreadsheetData.headers,
      spreadsheetData.rows
    );

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.success
        ? `${response.explanation}\n\n\`\`\`excel\n${response.code}\n\`\`\``
        : `Error: ${response.error}`,
      provider: response.provider,
      code: response.success ? response.code : undefined,
    };

    // If it's a formula and we can evaluate it, calculate the result
    if (response.success && response.type === 'formula' && response.code && evaluateFormula) {
      try {
        const result = evaluateFormula(response.code);
        assistantMessage.content += `\n\n**Result:** \`${result}\``;
      } catch (error: any) {
        console.error('Formula evaluation error:', error);
      }
    }

    setMessages(prev => [...prev, assistantMessage]);

    // Optionally auto-apply the code
    if (response.success && response.code && onApplyCode) {
      // Note: In a real app, you'd show a confirmation dialog
      // onApplyCode(response.code, response.type);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I can help you with Excel formulas and data analysis. I can see your spreadsheet data and generate formulas to answer your questions. For example, try asking me to "sum all values in column A" or "calculate the average in column B".',
      },
    ]);
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--gray-50)' }}>
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: 'var(--text-secondary)' }} />
          <div className="flex flex-col">
            <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>AI Assistant</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Can generate formulas and calculate results
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowSavedFormulas(!showSavedFormulas)}
            title="Saved Formulas"
            className="p-2 rounded transition-colors"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: showSavedFormulas ? 'rgba(0, 102, 204, 0.1)' : 'var(--gray-100)',
            }}
            onMouseEnter={(e) => {
              if (!showSavedFormulas) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--gray-200)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showSavedFormulas) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--gray-100)';
              }
            }}
          >
            <Save size={16} />
          </button>
          <button
            onClick={handleClearChat}
            title="Clear chat history"
            className="p-2 rounded transition-colors"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--gray-100)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--gray-200)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--gray-100)';
            }}
          >
            <Trash2 size={16} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close AI Assistant"
              className="p-2 rounded transition-colors"
              style={{
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--gray-100)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--gray-200)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--gray-100)';
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Saved Formulas Panel */}
      {showSavedFormulas && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--gray-50)', maxHeight: '200px', overflowY: 'auto' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Saved Formulas ({savedFormulas.length})
          </p>
          {savedFormulas.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No saved formulas yet</p>
          ) : (
            <div className="space-y-1">
              {savedFormulas.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-200 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{f.description}</p>
                    <code className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.formula}</code>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(f.formula);
                    }}
                    className="p-1 hover:bg-gray-300 rounded"
                    title="Copy formula"
                  >
                    <Copy size={12} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFormula(f.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Delete formula"
                  >
                    <Trash2 size={12} style={{ color: 'var(--error)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              className={`max-w-[85%] px-3 py-2 text-sm markdown-content`}
              style={{
                backgroundColor: message.role === 'user' ? 'rgba(0, 102, 204, 0.1)' : 'var(--gray-100)',
                color: 'var(--text-primary)',
              }}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter 
                          style={oneDark} 
                          language={match[1]} 
                          PreTag="div"
                          customStyle={{ margin: '0.5rem 0', borderRadius: '4px' }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className="bg-gray-200 px-1 rounded text-xs" {...props}>{children}</code>
                      );
                    },
                    p({ children }) {
                      return <p className="leading-relaxed mb-2 last:mb-0">{children}</p>;
                    },
                    strong({ children }) {
                      return <strong className="font-semibold">{children}</strong>;
                    },
                  } as Components}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}
              {message.provider && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>via {message.provider}</p>
              )}
              {message.role === 'assistant' && message.code && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      // Get the user message that prompted this response
                      const userMsgIndex = messages.findIndex(m => m.id === message.id) - 1;
                      const userMsg = userMsgIndex >= 0 ? messages[userMsgIndex] : null;
                      const description = userMsg?.content || 'Formula';
                      saveFormula(message.code!, description);
                    }}
                    className="px-2 py-1 text-xs rounded flex items-center gap-1"
                    style={{ 
                      backgroundColor: 'var(--primary)', 
                      color: 'white',
                    }}
                  >
                    <Save size={12} />
                    Save Formula
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(message.code!)}
                    className="px-2 py-1 text-xs rounded flex items-center gap-1"
                    style={{ 
                      backgroundColor: 'var(--gray-200)', 
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Copy size={12} />
                    Copy
                  </button>
                </div>
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
