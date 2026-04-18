import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { getSupabaseClient } from "@/components/atomic-crm/providers/supabase/supabase";

type Message = { role: "user" | "assistant" | "system"; content: string };

const hasSpeechRecognition =
  typeof window !== "undefined" &&
  ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

const hasSpeechSynthesis =
  typeof window !== "undefined" && "speechSynthesis" in window;

// Match browser language to a recognition locale
const getMicLang = () => {
  const lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
  return lang.startsWith("es") ? "es-US" : "en-US";
};

// Detect language of a response string for TTS voice selection
const detectLang = (text: string): string => {
  const spanishPattern =
    /[áéíóúñü]|\b(el|la|los|las|un|una|de\s|en\s|que\s|es\s|se\s|no\s|con|por|para|del|al)\b/i;
  return spanishPattern.test(text) ? "es-US" : "en-US";
};

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Stop TTS when the chat panel is closed
  useEffect(() => {
    if (!open && hasSpeechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    }
  }, [open]);

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

  function handleMicClick() {
    if (!hasSpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getMicLang();

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) setInput(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleSpeakClick(text: string, index: number) {
    if (!hasSpeechSynthesis) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = detectLang(text);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <>
      {/* Floating toggle button */}
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
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-semibold">KW CHISPA AI</div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 overflow-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Start the conversation...
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
                {m.role === "assistant" && hasSpeechSynthesis && (
                  <div className="mt-0.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => handleSpeakClick(m.content, i)}
                      aria-label={speakingIndex === i ? "Stop speaking" : "Read aloud"}
                    >
                      {speakingIndex === i ? (
                        <VolumeX className="h-3 w-3 text-primary" />
                      ) : (
                        <Volume2 className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input area */}
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
                placeholder="Type a message..."
              />
              <div className="flex flex-col gap-1">
                {hasSpeechRecognition && (
                  <Button
                    type="button"
                    size="icon"
                    variant={isListening ? "destructive" : "outline"}
                    className={`h-7 w-7 shrink-0${isListening ? " animate-pulse" : ""}`}
                    onClick={handleMicClick}
                    aria-label={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? (
                      <MicOff className="h-3.5 w-3.5" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button type="submit" disabled={loading} size="sm" className="h-7">
                  Send
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
