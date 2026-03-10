import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from '@/components/custom/use-scroll-to-bottom';
import { useState, useRef } from "react";
import { message } from "../../interfaces/interfaces"
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {v4 as uuidv4} from 'uuid';

//const socket = new WebSocket("ws://localhost:8090"); //change to your websocket endpoint

// get the device (instance)'s websocket endpoint
const proto = window.location.protocol === "https:" ? "wss" : "ws";
const host = window.location.hostname;
const frontendPort = window.location.port;
const socketPort = frontendPort === "8502" ? "8091" : "8090";
const socket = new WebSocket(`${proto}://${host}:${socketPort}`);

export function Chat() {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const [messages, setMessages] = useState<message[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);
  const [loggedInUserName, setLoggedInUserName] = useState<string>("");
  const [isLoginPending, setIsLoginPending] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [usedLoginPromptButtons, setUsedLoginPromptButtons] = useState<Record<string, boolean>>({});
  const [loginModalText, setLoginModalText] = useState<string>("Der Server fordert einen Login an.");
  const [loginUserid, setLoginUserid] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [resetSuggestionsSignal, setResetSuggestionsSignal] = useState<number>(0);

  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const suppressNextLoginCancelRef = useRef<boolean>(false);
  const lastLoginPromptIdRef = useRef<string | null>(null);

  const getLoginRequestText = (rawData: unknown): string | null => {
    if (typeof rawData !== "string") return null;

    try {
      const parsed = JSON.parse(rawData) as {
        type?: string;
        event?: string;
        action?: string;
        message?: string;
        description?: string;
      };

      const eventType = (parsed.type || parsed.event || parsed.action || "").toLowerCase();
      if (eventType.includes("login") && eventType.includes("request")) {
        return parsed.description || parsed.message || "Der Server fordert einen Login an.";
      }
    } catch {
      // Ignore parse errors and check text markers below.
    }

    const lowerRawData = rawData.toLowerCase();
    if (lowerRawData.includes("login_request") || lowerRawData.includes("login request")) {
      return rawData;
    }

    return null;
  };

  const getSuggestedIntents = (rawData: unknown): string[] | null => {
    if (typeof rawData !== "string") return null;

    try {
      const parsed = JSON.parse(rawData) as {
        type?: string;
        event?: string;
        action?: string;
        items?: unknown;
        suggested_intents?: unknown;
      };
      const eventType = (parsed.type || parsed.event || parsed.action || "").toLowerCase();
      const isSuggestedIntentsEvent =
        eventType === "suggested_intents" ||
        (eventType.includes("suggested") && eventType.includes("intent"));
      if (!isSuggestedIntentsEvent) return null;

      const source = parsed.items ?? parsed.suggested_intents;
      if (!Array.isArray(source)) return [];

      const suggestions = source
        .map((entry) => {
          if (typeof entry === "string") return entry.trim();
          if (entry && typeof entry === "object" && "description" in entry) {
            const value = (entry as { description?: unknown }).description;
            return typeof value === "string" ? value.trim() : "";
          }
          return "";
        })
        .filter((entry) => entry.length > 0);

      return suggestions;
    } catch {
      return null;
    }
  };

  const getLoginSuccessName = (rawData: unknown): string | undefined => {
    if (typeof rawData !== "string") return undefined;

    try {
      const parsed = JSON.parse(rawData) as {
        type?: string;
        event?: string;
        action?: string;
        name?: unknown;
      };
      const eventType = (parsed.type || parsed.event || parsed.action || "").toLowerCase();
      const isLoginSuccess =
        eventType === "login_success" || (eventType.includes("login") && eventType.includes("success"));
      if (!isLoginSuccess) return undefined;
      if (typeof parsed.name === "string") return parsed.name.trim();
      return "";
    } catch {
      return undefined;
    }
  };

  const isLogoutSuccessResponse = (rawData: unknown): boolean => {
    if (typeof rawData !== "string") return false;

    try {
      const parsed = JSON.parse(rawData) as {
        type?: string;
        event?: string;
        action?: string;
      };
      const eventType = (parsed.type || parsed.event || parsed.action || "").toLowerCase();
      return eventType === "logout_success" || (eventType.includes("logout") && eventType.includes("success"));
    } catch {
      return false;
    }
  };

  const getAuthState = (rawData: unknown): { authenticated: boolean; name: string } | null => {
    if (typeof rawData !== "string") return null;

    try {
      const parsed = JSON.parse(rawData) as {
        type?: string;
        event?: string;
        action?: string;
        authenticated?: unknown;
        name?: unknown;
      };
      const eventType = (parsed.type || parsed.event || parsed.action || "").toLowerCase();
      if (eventType !== "auth_state") return null;

      const authenticated = Boolean(parsed.authenticated);
      const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
      return { authenticated, name };
    } catch {
      return null;
    }
  };

  const closeLoginModalOnSuccess = (name?: string) => {
    setIsUserLoggedIn(true);
    if (name && name.trim()) {
      setLoggedInUserName(name.trim());
    }
    setIsLoginPending(false);
    setLoginError("");
    setLoginPassword("");
    suppressNextLoginCancelRef.current = true;
    setIsLoginModalOpen(false);
  };

  const cleanupMessageHandler = () => {
    if (messageHandlerRef.current && socket) {
      socket.removeEventListener("message", messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
  };

  const showLoginPromptMessage = (loginRequestText: string) => {
    const cleanedText = loginRequestText
      .replace(/geben sie jetzt ihre userid ein\.?/gi, "")
      .trim();

    setMessages(prev => {
      const nextPromptId = uuidv4();
      lastLoginPromptIdRef.current = nextPromptId;
      setUsedLoginPromptButtons(current => {
        const updated = { ...current };
        for (const msg of prev) {
          if (msg.role === "login_prompt") {
            updated[msg.id] = true;
          }
        }
        updated[nextPromptId] = false;
        return updated;
      });

      return [...prev, { content: cleanedText, role: "login_prompt", id: nextPromptId }];
    });
  };

  const reactivateLastLoginPromptButton = () => {
    const lastPromptId = lastLoginPromptIdRef.current;
    if (!lastPromptId) return;

    setUsedLoginPromptButtons(current => ({
      ...current,
      [lastPromptId]: false,
    }));
  };

  const handleLoggedOutState = () => {
    setIsUserLoggedIn(false);
    setLoggedInUserName("");
    reactivateLastLoginPromptButton();
    setResetSuggestionsSignal((value) => value + 1);
  };

  const updateLoginStateFromText = (text: string) => {
    const lower = text.toLowerCase();
    const isLogoutText =
      /abgemeldet/.test(lower) ||
      /ausgeloggt/.test(lower) ||
      /logout erfolgreich/.test(lower);
    const isLoginSuccessText =
      (/angemeldet/.test(lower) || /login erfolgreich/.test(lower)) &&
      !/nicht angemeldet/.test(lower) &&
      !/fehlgeschlagen/.test(lower);

    if (isLogoutText) {
      handleLoggedOutState();
      return;
    }

    if (isLoginSuccessText) {
      setIsUserLoggedIn(true);
    }
  };

  const isLoginSuccessText = (text: string) => {
    const lower = text.toLowerCase();
    return (
      (/angemeldet/.test(lower) || /login erfolgreich/.test(lower)) &&
      !/nicht angemeldet/.test(lower) &&
      !/fehlgeschlagen/.test(lower)
    );
  };

async function handleSubmit(text?: string) {
  if (!socket || socket.readyState !== WebSocket.OPEN || isLoading || isLoginModalOpen || isLoginPending) return;

  const messageText = text || question;
  setIsLoading(true);
  cleanupMessageHandler();
  
  const traceId = uuidv4();
  setMessages(prev => [...prev, { content: messageText, role: "user", id: traceId }]);
  socket.send(messageText);
  setQuestion("");

  try {
    let streamedAssistantText = "";
    const messageHandler = (event: MessageEvent) => {
      const authState = getAuthState(event.data);
      if (authState) {
        setIsUserLoggedIn(authState.authenticated);
        setLoggedInUserName(authState.authenticated ? authState.name : "");
        if (!authState.authenticated) {
          handleLoggedOutState();
        }
        return;
      }

      const loginSuccessName = getLoginSuccessName(event.data);
      if (loginSuccessName !== undefined) {
        closeLoginModalOnSuccess(loginSuccessName);
        return;
      }

      if (isLogoutSuccessResponse(event.data)) {
        handleLoggedOutState();
        return;
      }

      const loginRequestText = getLoginRequestText(event.data);
      if (loginRequestText) {
        setIsLoading(false);
        setIsLoginPending(true);
        setLoginModalText(loginRequestText);
        setLoginError("");
        showLoginPromptMessage(loginRequestText);
        cleanupMessageHandler();
        return;
      }

      const suggestedIntents = getSuggestedIntents(event.data);
      if (suggestedIntents) {
        if (suggestedIntents.length > 0) {
          setMessages(prev => [
            ...prev,
            { content: "", role: "suggested_intents", id: uuidv4(), suggestions: suggestedIntents },
          ]);
        }
        return;
      }

      const eventData = typeof event.data === "string" ? event.data : "";
      setIsLoading(false);
      if(eventData.includes("[END]")) {
        cleanupMessageHandler();
        return;
      }

      if (isLoginSuccessText(eventData)) {
        closeLoginModalOnSuccess();
      }

      streamedAssistantText += eventData;
      updateLoginStateFromText(streamedAssistantText);
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        const newContent = lastMessage?.role === "assistant" 
          ? lastMessage.content + eventData
          : eventData;
        
        const newMessage = { content: newContent, role: "assistant", id: traceId };
        return lastMessage?.role === "assistant"
          ? [...prev.slice(0, -1), newMessage]
          : [...prev, newMessage];
      });

    };

    messageHandlerRef.current = messageHandler;
    socket.addEventListener("message", messageHandler);
  } catch (error) {
    console.error("WebSocket error:", error);
    setIsLoading(false);
  }
}

const sendAndCollectResponse = (payload: string): Promise<{ text: string; loginRequestText: string | null }> => {
  return new Promise((resolve, reject) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket is not connected."));
      return;
    }

    let text = "";
    const handler = (event: MessageEvent) => {
      const authState = getAuthState(event.data);
      if (authState) {
        setIsUserLoggedIn(authState.authenticated);
        setLoggedInUserName(authState.authenticated ? authState.name : "");
        if (!authState.authenticated) {
          handleLoggedOutState();
        }
        return;
      }

      const loginSuccessName = getLoginSuccessName(event.data);
      if (loginSuccessName !== undefined) {
        closeLoginModalOnSuccess(loginSuccessName);
        return;
      }

      if (isLogoutSuccessResponse(event.data)) {
        handleLoggedOutState();
        return;
      }

      const loginRequestText = getLoginRequestText(event.data);
      if (loginRequestText) {
        socket.removeEventListener("message", handler);
        resolve({ text: "", loginRequestText });
        return;
      }

      const suggestedIntents = getSuggestedIntents(event.data);
      if (suggestedIntents) {
        return;
      }

      const eventData = typeof event.data === "string" ? event.data : "";
      if (eventData.includes("[END]")) {
        socket.removeEventListener("message", handler);
        resolve({ text: text.trim(), loginRequestText: null });
        return;
      }

      if (isLoginSuccessText(eventData)) {
        closeLoginModalOnSuccess();
      }

      text += eventData;
    };

    socket.addEventListener("message", handler);
    socket.send(payload);
  });
};

const cancelLoginProcess = async () => {
  cleanupMessageHandler();
  setLoginError("");
  setLoginPassword("");
  setIsLoginPending(false);

  try {
    const cancelResponse = await sendAndCollectResponse("__CANCEL_LOGIN__");
    updateLoginStateFromText(cancelResponse.text);
    if (cancelResponse.text) {
      setMessages(prev => [...prev, { content: cancelResponse.text, role: "assistant", id: uuidv4() }]);
    }
  } catch (error) {
    console.error("Login cancel via WebSocket failed:", error);
  } finally {
    // Keep chat usable even if backend cancel fails.
    setIsLoginPending(false);
  }
};

const handleLoginModalOpenChange = (open: boolean) => {
  setIsLoginModalOpen(open);

  if (open) return;

  if (suppressNextLoginCancelRef.current) {
    suppressNextLoginCancelRef.current = false;
    return;
  }

  void cancelLoginProcess();
};

const handleLogout = async () => {
  if (!isUserLoggedIn) return;
  await handleSubmit("logout");
};

const handleLoginSubmit = async () => {
  if (!socket || socket.readyState !== WebSocket.OPEN || isLoading) return;

  const userid = loginUserid.trim();
  if (!userid || !loginPassword) {
    setLoginError("Bitte userid und Passwort eingeben.");
    return;
  }

  setIsLoading(true);
  setLoginError("");
  cleanupMessageHandler();

  try {
    const useridResponse = await sendAndCollectResponse(userid);
    if (useridResponse.loginRequestText) {
      setIsLoginPending(true);
      setLoginModalText(useridResponse.loginRequestText);
      showLoginPromptMessage(useridResponse.loginRequestText);
      setIsLoading(false);
      return;
    }

    if (useridResponse.text) {
      setLoginModalText(useridResponse.text);
      updateLoginStateFromText(useridResponse.text);
    }

    if (!/passwort/i.test(useridResponse.text)) {
      setIsLoading(false);
      return;
    }

    const passwordResponse = await sendAndCollectResponse(loginPassword);
    if (passwordResponse.loginRequestText) {
      setIsLoginPending(true);
      setLoginModalText(passwordResponse.loginRequestText);
      showLoginPromptMessage(passwordResponse.loginRequestText);
      setIsLoading(false);
      return;
    }

    if (passwordResponse.text) {
      setLoginModalText(passwordResponse.text);
      updateLoginStateFromText(passwordResponse.text);
      const isLoginFailureText =
        /anmeldung fehlgeschlagen/i.test(passwordResponse.text) ||
        /verbleibende versuche/i.test(passwordResponse.text);

      if (!isLoginFailureText) {
        setMessages(prev => [...prev, { content: passwordResponse.text, role: "assistant", id: uuidv4() }]);
      }
    }

    setLoginPassword("");
    if (/angemeldet/i.test(passwordResponse.text)) {
      setIsUserLoggedIn(true);
      setIsLoginPending(false);
      suppressNextLoginCancelRef.current = true;
      setIsLoginModalOpen(false);
      setLoginUserid("");
    }
  } catch (error) {
    console.error("Login via WebSocket failed:", error);
    setLoginError("Login konnte nicht gesendet werden.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-transparent">
      <Header
        isLoggedIn={isUserLoggedIn}
        userName={loggedInUserName}
        onLogout={() => void handleLogout()}
        logoutDisabled={isLoading || isLoginModalOpen || isLoginPending}
      />
      <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4" ref={messagesContainerRef}>
        {messages.length == 0 && <Overview />}
        {messages.map((message) => (
          message.role === "login_prompt" ? (
            <div key={message.id} className="w-full mx-auto max-w-3xl px-4">
              <div className="rounded-xl border bg-muted/70 p-4 flex flex-col gap-3">
                <p className="text-base">{message.content || "Bitte melden Sie sich an, um fortzufahren."}</p>
                <div>
                  <Button
                    type="button"
                    onClick={() => {
                      setUsedLoginPromptButtons(prev => ({ ...prev, [message.id]: true }));
                      setLoginError("");
                      setIsLoginModalOpen(true);
                    }}
                    disabled={isLoading || isUserLoggedIn || Boolean(usedLoginPromptButtons[message.id])}
                  >
                    Anmelden
                  </Button>
                </div>
              </div>
            </div>
          ) : message.role === "suggested_intents" ? (
            <div key={message.id} className="w-full mx-auto max-w-3xl px-4">
              <div className="rounded-xl border bg-muted/70 p-4 flex flex-col gap-3">
                <p className="text-sm font-medium uppercase tracking-wide text-foreground">
                  Vorschläge
                </p>
                <div className="flex flex-wrap gap-2">
                {(message.suggestions || []).map((suggestion, index) => (
                  <button
                    key={`${message.id}-${index}`}
                    type="button"
                    className="rounded-full border border-border bg-background px-4 py-2 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleSubmit(suggestion)}
                    disabled={isLoading || isLoginPending || isLoginModalOpen}
                  >
                    {suggestion}
                  </button>
                ))}
                </div>
              </div>
            </div>
          ) : (
            <PreviewMessage key={message.id} message={message} />
          )
        ))}
        {isLoading && <ThinkingMessage />}
        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]"/>
      </div>
      <div className="flex mx-auto px-4 bg-transparent pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <ChatInput  
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isDisabled={isLoginPending || isLoginModalOpen}
          resetSuggestionsSignal={resetSuggestionsSignal}
        />
      </div>
      <Dialog open={isLoginModalOpen} onOpenChange={handleLoginModalOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login erforderlich</DialogTitle>
            <DialogDescription>{loginModalText}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="login-userid">Username / UserID</Label>
              <Input
                id="login-userid"
                placeholder="z. B. 12345"
                value={loginUserid}
                onChange={(event) => setLoginUserid(event.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login-password">Passwort</Label>
              <Input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                disabled={isLoading}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLoginSubmit();
                  }
                }}
              />
            </div>
            {loginError ? <p className="text-base text-destructive">{loginError}</p> : null}
          </div>
          <DialogFooter>
            <Button onClick={() => void handleLoginSubmit()} disabled={isLoading}>
              {isLoading ? "Anmeldung..." : "Anmelden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
