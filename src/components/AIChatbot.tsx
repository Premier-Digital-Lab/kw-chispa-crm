import React, { useEffect, useRef, useState } from "react";
import { useTranslate } from "ra-core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X } from "lucide-react";
import { getSupabaseClient } from "@/components/atomic-crm/providers/supabase/supabase";

type Message = { role: "user" | "assistant" | "system"; content: string };

export default function AIChatbot() {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, open]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;

    const newUser: Message = { role: "user", content: text };
    const nextMessages = [...messages, newUser];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;

      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const assistantText = (data?.reply as string) || "";
      setMessages((m) => [...m, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${String(err)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="icon"
          variant="secondary"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open chat"
          className="rounded-full p-2"
        >
          <MessageCircle />
        </Button>
      </div>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[300px] h-[400px] bg-background border rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-semibold">KW CHISPA AI</div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </div>

          <div ref={messagesRef} className="flex-1 overflow-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                {translate("crm.auth.chatbot.start", { _: "Start the conversation..." })}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[85%] px-3 py-2 rounded-md text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="px-3 py-2 border-t">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="h-14 resize-none"
                placeholder={translate("crm.auth.chatbot.placeholder", { _: "Type a message..." })}
              />
              <div className="flex flex-col">
                <Button type="submit" disabled={loading} size="sm">
                  {translate("crm.auth.chatbot.send", { _: "Send" })}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
