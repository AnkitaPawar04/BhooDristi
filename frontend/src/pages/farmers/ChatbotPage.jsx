import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { FiSend, FiMessageCircle, FiUser, FiLoader, FiMic, FiMicOff, FiImage } from "react-icons/fi";
import chatbotBgVideo from "./videos/dashboard.mp4";
import authStorage from "../../services/authStorage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Styles for the markdown the bot returns (bold, lists, tables).
const markdownComponents = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  ul: (props) => <ul className="mb-2 ml-5 list-disc space-y-1" {...props} />,
  ol: (props) => <ol className="mb-2 ml-5 list-decimal space-y-1" {...props} />,
  h1: (props) => <h3 className="mb-2 text-base font-semibold" {...props} />,
  h2: (props) => <h3 className="mb-2 text-base font-semibold" {...props} />,
  h3: (props) => <h3 className="mb-2 text-base font-semibold" {...props} />,
  hr: () => <hr className="my-3 border-emerald-200" />,
  table: (props) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-left font-semibold" {...props} />
  ),
  td: (props) => <td className="border border-emerald-200 px-2 py-1 align-top" {...props} />,
};

const API_URL = "http://localhost:8000/chatbot/chat";
const IMAGE_API_URL = "http://localhost:8000/chatbot/image";
const TRANSCRIBE_API_URL = "http://localhost:8000/chatbot/transcribe";
const HISTORY_API_URL = "http://localhost:8000/chatbot/history";
const STREAM_API_URL = "http://localhost:8000/chatbot/chat/stream";
const FEEDBACK_API_URL = "http://localhost:8000/chatbot/feedback";

// Quick questions shown on an empty chat, in the app's language.
const QUICK_QUESTIONS = {
  en: [
    "What should I sow this season?",
    "Will it rain this week?",
    "How much water does my crop need?",
    "What are today's market prices?",
    "Which government schemes can I get?",
  ],
  hi: [
    "इस मौसम में क्या बोऊं?",
    "क्या इस हफ्ते बारिश होगी?",
    "मेरी फसल को कितना पानी चाहिए?",
    "आज मंडी में क्या भाव है?",
    "मुझे कौन सी सरकारी योजनाएं मिल सकती हैं?",
  ],
  mr: [
    "या हंगामात काय पेरावे?",
    "या आठवड्यात पाऊस पडेल का?",
    "माझ्या पिकाला किती पाणी लागेल?",
    "आज बाजारभाव काय आहे?",
    "मला कोणत्या सरकारी योजना मिळू शकतात?",
  ],
};

const SPEECH_LANG = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

const getAppLanguage = () => {
  const lang = localStorage.getItem("language");
  return ["en", "hi", "mr"].includes(lang) ? lang : "en";
};

// Plain text for text-to-speech (drop Markdown symbols and emoji).
const toSpeechText = (text) =>
  text
    .replace(/[#*_`>|]/g, " ")
    .replace(/-{3,}/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
const LOCAL_HISTORY_KEY = "chatbot_history";

const GREETING = {
  id: 1,
  sender: "bot",
  text: "Namaste! 👋 I am your Farmer Assistant. How can I help you today?",
};

const ChatbotPage = ({ onNavigate, compact = false, onClose }) => {
  // ============================================================
  // CHAT
  // ============================================================

  const [messages, setMessages] = useState([GREETING]);

  const farmerId = Number(authStorage.getFarmerId()) || null;
  const historyLoadedRef = useRef(false);
  const handleSendRef = useRef(null);
  const [speakingId, setSpeakingId] = useState(null);

  // ============================================================
  // LISTEN (text-to-speech in the browser)
  // ============================================================

  const handleSpeak = (message) => {
    if (!window.speechSynthesis) {
      alert("Your browser does not support reading answers aloud.");
      return;
    }

    window.speechSynthesis.cancel();

    if (speakingId === message.id) {
      setSpeakingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(toSpeechText(message.text));
    // Devanagari text is read in the app language (Hindi/Marathi), else English.
    const hasDevanagari = /[\u0900-\u097F]/.test(message.text);
    const lang = getAppLanguage();
    utterance.lang = hasDevanagari
      ? SPEECH_LANG[lang === "en" ? "hi" : lang]
      : "en-IN";
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang === utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(message.id);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  // ============================================================
  // FEEDBACK (thumbs up / down)
  // ============================================================

  const handleFeedback = async (message, rating) => {
    if (!message.dbId) return;

    setMessages((previous) =>
      previous.map((m) =>
        m.id === message.id ? { ...m, feedback: rating } : m
      )
    );

    try {
      await fetch(FEEDBACK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: message.dbId, rating }),
      });
    } catch (error) {
      console.error("Feedback error:", error);
    }
  };

  // ============================================================
  // CHAT HISTORY
  // Logged-in farmers: stored in the backend database.
  // Not logged in: kept in this browser's localStorage.
  // ============================================================

  useEffect(() => {
    const loadHistory = async () => {
      try {
        if (farmerId) {
          const response = await fetch(`${HISTORY_API_URL}/${farmerId}`);
          if (response.ok) {
            const rows = await response.json();
            setMessages([
              GREETING,
              ...rows.map((row) => ({
                id: `h-${row.id}`,
                dbId: row.id,
                feedback: row.feedback,
                sender: row.role === "user" ? "user" : "bot",
                text: row.content,
              })),
            ]);
          }
        } else {
          const saved = JSON.parse(
            localStorage.getItem(LOCAL_HISTORY_KEY) || "[]"
          );
          if (saved.length) {
            setMessages([GREETING, ...saved]);
          }
        }
      } catch (error) {
        console.error("Could not load chat history:", error);
      } finally {
        historyLoadedRef.current = true;
      }
    };

    loadHistory();
  }, [farmerId]);

  useEffect(() => {
    if (farmerId || !historyLoadedRef.current) {
      return;
    }

    // Keep only finished text messages (no typing placeholders or image previews).
    const toSave = messages
      .filter((message) => message.id !== 1 && !message.typing && message.text)
      .slice(-100)
      .map(({ id, sender, text }) => ({ id, sender, text }));

    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(toSave));
  }, [messages, farmerId]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================================================
  // LOCATION
  // ============================================================

  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("requesting");

  // ============================================================
  // VOICE
  // ============================================================

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ============================================================
  // IMAGE
  // ============================================================

  const imageInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ============================================================
  // SCROLL
  // ============================================================

  const messagesEndRef = useRef(null);

  // ============================================================
  // LOCATION DETECTION
  // ============================================================

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLocationStatus("success");
      },
      (error) => {
        console.error("Location error:", error);
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading, uploadingImage]);

  // ============================================================
  // VOICE INPUT
  // ============================================================

  const handleMicClick = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Your browser does not support microphone access.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        // Safari records audio/mp4, Chrome/Firefox record audio/webm.
        // Whisper needs the file extension to match the real format.
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const extension = mimeType.includes("mp4")
          ? "mp4"
          : mimeType.includes("ogg")
          ? "ogg"
          : "webm";

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        setRecording(false);

        if (audioBlob.size === 0) {
          alert("No audio was recorded. Check that your microphone is allowed and try again.");
          return;
        }

        setTranscribing(true);

        try {
          const formData = new FormData();

          formData.append(
            "file",
            audioBlob,
            `farmer-question.${extension}`
          );

          const response = await fetch(
            // Use the app's language (en / hi / mr) so Whisper doesn't
            // force English or Hindi speech into Marathi.
            `${TRANSCRIBE_API_URL}?language=${
              ["en", "hi", "mr"].includes(localStorage.getItem("language"))
                ? localStorage.getItem("language")
                : "mr"
            }`,
            {
              method: "POST",
              body: formData,
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.detail || "Transcription failed."
            );
          }

          if (!data.text) {
            throw new Error("No text was returned.");
          }

          // Send straight away so voice is one step for the farmer.
          handleSendRef.current?.(data.text);
        } catch (error) {
          console.error("Transcription error:", error);

          alert(
            "Sorry, I couldn't understand the audio. " +
              (error.message || "Please try again.")
          );
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);

      alert(
        "Please allow microphone access to use voice input."
      );
    }
  };

  // ============================================================
  // IMAGE UPLOAD
  // ============================================================

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("Image must be smaller than 20 MB.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);

    const imagePreviewUrl = URL.createObjectURL(file);
    const imageId = Date.now();
    const analysisId = imageId + 1;

    setMessages((previous) => [
      ...previous,

      {
        id: imageId,
        sender: "user",
        text: "",
        imageUrl: imagePreviewUrl,
      },

      {
        id: analysisId,
        sender: "bot",
        text: "Analyzing your image...",
        typing: true,
      },
    ]);

    try {
      const formData = new FormData();

      formData.append("file", file);

      if (farmerId) {
        formData.append("farmer_id", String(farmerId));
      }

      const response = await fetch(
        IMAGE_API_URL,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Image analysis failed."
        );
      }

      const aiResponse =
        data.response ||
        "I could not understand the image. Please try another image.";

      setMessages((previous) =>
        previous.map((message) =>
          message.id === analysisId
            ? {
                ...message,
                text: aiResponse,
                dbId: data.message_id,
                typing: false,
              }
            : message
        )
      );
    } catch (error) {
      console.error("Image analysis error:", error);

      setMessages((previous) =>
        previous.map((message) =>
          message.id === analysisId
            ? {
                ...message,
                text:
                  "Sorry, I couldn't analyze this image right now. " +
                  (error.message || "Please try again."),
                typing: false,
              }
            : message
        )
      );
    } finally {
      setUploadingImage(false);

      event.target.value = "";

      setTimeout(() => {
        URL.revokeObjectURL(imagePreviewUrl);
      }, 1000);
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend = async (textOverride) => {
    const trimmedInput = (
      typeof textOverride === "string" ? textOverride : input
    ).trim();

    if (!trimmedInput || loading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: trimmedInput,
    };

    const conversation = [
      ...messages,
      userMessage,
    ]
      .filter(
        (message) =>
          message.id !== 1 &&
          !message.typing &&
          message.text
      )
      .slice(-10)
      .map((message) => ({
        role:
          message.sender === "user"
            ? "user"
            : "assistant",
        content: message.text,
      }));

    const typingId = Date.now() + 1;

    setMessages((previous) => [
      ...previous,
      userMessage,
      {
        id: typingId,
        sender: "bot",
        text: "",
        typing: true,
      },
    ]);

    setInput("");
    setLoading(true);

    const updateBot = (changes) =>
      setMessages((previous) =>
        previous.map((message) =>
          message.id === typingId
            ? { ...message, ...changes }
            : message
        )
      );

    try {
      // Streaming: the answer appears while it is being written.
      const response = await fetch(STREAM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedInput,
          conversation,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          district: authStorage.getUser()?.district ?? null,
          farmer_id: farmerId,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Chatbot request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamed = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.error) {
            throw new Error(event.error);
          }

          if (event.delta) {
            streamed += event.delta;
            updateBot({ text: streamed, typing: false });
          }

          if (event.done) {
            updateBot({
              text: event.response || streamed,
              dbId: event.message_id,
              typing: false,
            });
          }
        }
      }
    } catch (error) {
      console.error("Chatbot error:", error);

      updateBot({
        text:
          "Sorry, I couldn't process your request right now. " +
          (error.message || "Please try again."),
        typing: false,
      });
    } finally {
      setLoading(false);
    }
  };

  handleSendRef.current = handleSend;

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  // ============================================================
  // MESSAGE BUBBLE
  // ============================================================

  const renderMessage = (message) => {
    const isUser = message.sender === "user";

    return (
      <div
        key={message.id}
        className={`flex ${
          isUser
            ? "justify-end"
            : "justify-start"
        }`}
      >
        <div
          className={`flex max-w-[85%] items-end gap-3 ${
            isUser
              ? "flex-row-reverse"
              : "flex-row"
          }`}
        >
          {/* Avatar */}
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${
              isUser
                ? "bg-emerald-600 text-white"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isUser ? (
              <FiUser size={17} />
            ) : (
              <FiMessageCircle size={17} />
            )}
          </div>

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-md ${
              isUser
                ? "rounded-br-md bg-emerald-600 text-white"
                : "rounded-bl-md border border-emerald-100 bg-white/95 text-gray-800 backdrop-blur-sm"
            }`}
          >
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Uploaded"
                className="mb-2 max-h-72 max-w-full rounded-xl object-contain"
              />
            )}

            {message.typing ? (
              <div className="flex items-center gap-1.5 py-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />

                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
                  style={{
                    animationDelay: "0.15s",
                  }}
                />

                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
                  style={{
                    animationDelay: "0.3s",
                  }}
                />
              </div>
            ) : (
              message.text && (
                isUser ? (
                  <div className="whitespace-pre-line">
                    {message.text}
                  </div>
                ) : (
                  <div className="break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {message.text}
                    </ReactMarkdown>

                    {message.id !== 1 && (
                      <div className="mt-2 flex items-center gap-1 text-gray-400">
                        <button
                          type="button"
                          onClick={() => handleSpeak(message)}
                          title={speakingId === message.id ? "Stop" : "Listen"}
                          className={`rounded-full px-2 py-0.5 text-sm hover:bg-emerald-50 ${
                            speakingId === message.id ? "text-emerald-600" : ""
                          }`}
                        >
                          {speakingId === message.id ? "⏹️" : "🔊"}
                        </button>

                        {message.dbId && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleFeedback(message, 1)}
                              title="Helpful"
                              className={`rounded-full px-2 py-0.5 text-sm hover:bg-emerald-50 ${
                                message.feedback === 1 ? "bg-emerald-100" : "opacity-60"
                              }`}
                            >
                              👍
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFeedback(message, -1)}
                              title="Not helpful"
                              className={`rounded-full px-2 py-0.5 text-sm hover:bg-red-50 ${
                                message.feedback === -1 ? "bg-red-100" : "opacity-60"
                              }`}
                            >
                              👎
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // UI
  // ============================================================

  if (compact) {
    return (
      <div className="h-full w-full bg-white">
        <div className="flex h-full flex-col bg-white">
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <FiMessageCircle size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold">Farmer Assistant</div>
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium hover:bg-white/20"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3">
            <div className="space-y-4">
              {messages.map((message) => renderMessage(message))}

              {messages.length <= 1 && !loading && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_QUESTIONS[getAppLanguage()].map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSend(question)}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-700 shadow-sm hover:bg-emerald-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-emerald-100 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                className={
                  recording
                    ? "flex h-9 w-9 animate-pulse items-center justify-center rounded-full border border-red-300 bg-red-500 text-white"
                    : "flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }
                onClick={handleMicClick}
                title={recording ? "Stop recording" : "Voice input"}
              >
                {recording ? <FiMicOff size={16} /> : <FiMic size={16} />}
              </button>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                onClick={() => imageInputRef.current?.click()}
                title="Upload image"
              >
                <FiImage size={16} />
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {recording && (
                <span className="text-xs font-medium text-red-600">
                  🎙️ Listening... tap the mic again to stop
                </span>
              )}

              {transcribing && (
                <span className="text-xs text-emerald-700">
                  Converting your voice to text...
                </span>
              )}
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about crops, soil, irrigation..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-emerald-400"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || transcribing || !input.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-emerald-300"
                aria-label="Send message"
              >
                {loading ? <FiLoader size={18} className="animate-spin" /> : <FiSend size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen farm-page overflow-hidden">
      {/* ========================================================
          SAME BACKGROUND AS SOIL MANAGEMENT
      ======================================================== */}

      <video
        autoPlay
        loop
        muted
        playsInline
        className="dashboard-bg-video"
        ref={(video) => {
          if (video) {
            video.playbackRate = 0.5;
          }
        }}
      >
        <source
          src={chatbotBgVideo}
          type="video/mp4"
        />
      </video>

      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <Sidebar
        currentPage="chatbot"
        onNavigate={onNavigate}
      />

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}

      <div className="flex-1 min-w-0 relative z-10">
        <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">

          {/* ====================================================
              PAGE HEADER
          ==================================================== */}

          <div className="page-header mb-6 animate-fadeInUp">
            <h1 className="page-title text-white">
              Farmer Chatbot
            </h1>

            <p className="page-subtitle text-white">
              Your AI farming assistant for crops, soil,
              irrigation, weather and more
            </p>

            <div className="page-divider"></div>
          </div>

          {/* ====================================================
              CHAT CARD
          ==================================================== */}

          <div
            className="
              mx-auto
              flex
              h-[calc(100vh-180px)]
              min-h-[550px]
              max-w-6xl
              flex-col
              overflow-hidden
              rounded-2xl
              border-4
              border-emerald-200
              bg-white/95
              shadow-2xl
              backdrop-blur-sm
            "
          >

            {/* ==================================================
                CHAT HEADER
            ================================================== */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                bg-gradient-to-r
                from-emerald-500
                to-green-600
                px-5
                py-4
                text-white
                md:px-7
              "
            >
              <div className="flex items-center gap-4">

                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white/20
                    shadow-inner
                  "
                >
                  <FiMessageCircle size={25} />
                </div>

                <div>
                  <h2 className="text-lg font-bold md:text-xl">
                    Farmer Assistant
                  </h2>

                  <p className="text-xs text-white/85 md:text-sm">
                    Ask about crops, soil, irrigation,
                    weather & farming
                  </p>
                </div>

              </div>

              {/* Online indicator */}
              <div
                className="
                  hidden
                  items-center
                  gap-2
                  rounded-full
                  bg-white/15
                  px-3
                  py-2
                  text-xs
                  font-medium
                  md:flex
                "
              >
                <span className="h-2.5 w-2.5 rounded-full bg-green-200"></span>
                AI Assistant
              </div>
            </div>

            {/* ==================================================
                LOCATION STATUS
            ================================================== */}

            {locationStatus === "success" && (
              <div
                className="
                  border-b
                  border-green-100
                  bg-green-50
                  px-4
                  py-2
                  text-center
                  text-xs
                  font-medium
                  text-green-700
                "
              >
                📍 Location detected — I can provide
                location-based farming advice.
              </div>
            )}

            {locationStatus === "denied" && (
              <div
                className="
                  border-b
                  border-yellow-100
                  bg-yellow-50
                  px-4
                  py-2
                  text-center
                  text-xs
                  font-medium
                  text-yellow-700
                "
              >
                📍 Location access is unavailable.
                Some location-based recommendations
                may be limited.
              </div>
            )}

            {locationStatus === "unsupported" && (
              <div
                className="
                  border-b
                  border-yellow-100
                  bg-yellow-50
                  px-4
                  py-2
                  text-center
                  text-xs
                  font-medium
                  text-yellow-700
                "
              >
                📍 Your browser does not support
                location services.
              </div>
            )}

            {/* ==================================================
                MESSAGES AREA
            ================================================== */}

            <div
              className="
                flex-1
                overflow-y-auto
                bg-gradient-to-b
                from-emerald-50/70
                via-gray-50
                to-green-50/60
                p-4
                md:p-6
              "
            >
              <div className="mx-auto max-w-4xl space-y-4">

                {messages.map(renderMessage)}

                {messages.length <= 1 && !loading && (
                  <div className="flex flex-wrap gap-2">
                    {QUICK_QUESTIONS[getAppLanguage()].map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleSend(question)}
                        className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-700 shadow-sm hover:bg-emerald-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />

              </div>
            </div>

            {/* ==================================================
                INPUT SECTION
            ================================================== */}

            <div
              className="
                border-t
                border-emerald-100
                bg-white/95
                p-3
                md:p-4
              "
            >

              {/* Hidden image input */}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <div className="mx-auto max-w-4xl">

                {/* Input controls */}

                <div className="flex items-center gap-2">

                  {/* IMAGE */}

                  <button
                    type="button"
                    onClick={() =>
                      imageInputRef.current?.click()
                    }
                    disabled={
                      loading ||
                      uploadingImage ||
                      transcribing
                    }
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-emerald-200
                      bg-emerald-50
                      text-emerald-700
                      transition
                      hover:bg-emerald-100
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      md:h-12
                      md:w-12
                    "
                    title="Upload crop or plant image"
                  >
                    {uploadingImage ? (
                      <FiLoader
                        size={19}
                        className="animate-spin"
                      />
                    ) : (
                      <FiImage size={19} />
                    )}
                  </button>

                  {/* INPUT */}

                  <input
                    type="text"
                    value={input}
                    onChange={(event) =>
                      setInput(event.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    disabled={
                      loading ||
                      transcribing ||
                      uploadingImage
                    }
                    placeholder={
                      transcribing
                        ? "Converting voice to text..."
                        : "Ask your farming question..."
                    }
                    className="
                      min-w-0
                      flex-1
                      rounded-xl
                      border
                      border-gray-300
                      bg-white
                      px-4
                      py-3
                      text-sm
                      text-gray-800
                      outline-none
                      transition
                      placeholder:text-gray-400
                      focus:border-emerald-500
                      focus:ring-2
                      focus:ring-emerald-200
                      disabled:bg-gray-100
                    "
                  />

                  {/* MICROPHONE */}

                  <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={
                      loading ||
                      transcribing ||
                      uploadingImage
                    }
                    className={`
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      text-white
                      shadow-sm
                      transition
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      md:h-12
                      md:w-12
                      ${
                        recording
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }
                    `}
                    title={
                      recording
                        ? "Stop recording"
                        : "Speak your question"
                    }
                  >
                    {recording ? (
                      <FiMicOff size={19} />
                    ) : (
                      <FiMic size={19} />
                    )}
                  </button>

                  {/* SEND */}

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={
                      !input.trim() ||
                      loading ||
                      transcribing ||
                      uploadingImage
                    }
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-emerald-600
                      text-white
                      shadow-sm
                      transition
                      hover:bg-emerald-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      md:h-12
                      md:w-12
                    "
                    title="Send message"
                  >
                    {loading ? (
                      <FiLoader
                        size={19}
                        className="animate-spin"
                      />
                    ) : (
                      <FiSend size={19} />
                    )}
                  </button>

                </div>

                {/* Helper text */}

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    justify-center
                    text-center
                    text-[11px]
                    text-gray-400
                    md:text-xs
                  "
                >
                  {recording ? (
                    "🎙️ Listening... Click the microphone to stop"
                  ) : transcribing ? (
                    "🔄 Converting your voice to text..."
                  ) : uploadingImage ? (
                    "📷 Analyzing your image..."
                  ) : (
                    "Press Enter to send • 🎙️ Voice input • 📷 Image analysis"
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;