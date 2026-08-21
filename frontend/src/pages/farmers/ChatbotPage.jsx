import React, { useState, useRef, useEffect } from "react";
import {
  FiSend,
  FiMessageCircle,
  FiUser,
  FiLoader,
  FiMic,
  FiMicOff,
  FiImage,
} from "react-icons/fi";

const API_URL = "http://localhost:8000/chatbot/chat";
const IMAGE_API_URL = "http://localhost:8000/chatbot/image";
const TRANSCRIBE_API_URL = "http://localhost:8000/chatbot/transcribe";

const ChatbotPage = () => {
  // ============================================================
  // CHAT MESSAGES
  // ============================================================

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Namaste! 👋 I am your Farmer Assistant. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================================================
  // LOCATION
  // ============================================================

  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] =
    useState("requesting");

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
  // GET FARMER LOCATION
  // ============================================================

  useEffect(() => {
    if (!navigator.geolocation) {
      console.log(
        "❌ Geolocation is not supported by this browser."
      );

      setLocationStatus("unsupported");

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } =
          position.coords;

        console.log(
          "📍 Farmer location:",
          latitude,
          longitude
        );

        setLocation({
          latitude,
          longitude,
        });

        setLocationStatus("success");
      },

      (error) => {
        console.error(
          "❌ Location permission/error:",
          error
        );

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
    // ----------------------------------------------------------
    // STOP RECORDING
    // ----------------------------------------------------------

    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert(
          "Your browser does not support microphone access."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current = [];

      // --------------------------------------------------------
      // Collect audio
      // --------------------------------------------------------

      mediaRecorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      // --------------------------------------------------------
      // Recording stopped
      // --------------------------------------------------------

      mediaRecorder.onstop = async () => {
        // Stop microphone tracks
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type: "audio/webm",
          }
        );

        setRecording(false);
        setTranscribing(true);

        try {
          const formData = new FormData();

          formData.append(
            "file",
            audioBlob,
            "farmer-question.webm"
          );

          console.log(
            "🎙️ Sending audio for transcription..."
          );

          const response = await fetch(
            TRANSCRIBE_API_URL,
            {
              method: "POST",
              body: formData,
            }
          );

          const data =
            await response.json();

          console.log(
            "🎙️ Transcription response:",
            data
          );

          if (!response.ok) {
            throw new Error(
              data.detail ||
                "Transcription failed."
            );
          }

          if (!data.text) {
            throw new Error(
              "No text was returned."
            );
          }

          console.log(
            "🎙️ Transcribed:",
            data.text
          );

          // Put transcription into input box
          setInput(data.text);

        } catch (error) {
          console.error(
            "❌ Transcription error:",
            error
          );

          alert(
            "Sorry, I couldn't understand the audio. Please try again."
          );

        } finally {
          setTranscribing(false);
        }
      };

      // Start recording
      mediaRecorder.start();

      setRecording(true);

      console.log(
        "🎙️ Recording started..."
      );

    } catch (error) {
      console.error(
        "❌ Microphone error:",
        error
      );

      alert(
        "Please allow microphone access to use voice input."
      );
    }
  };

  // ============================================================
  // IMAGE UPLOAD
  // ============================================================

  const handleImageSelect = async (e) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    // ----------------------------------------------------------
    // Validate image
    // ----------------------------------------------------------

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select a valid image."
      );

      e.target.value = "";

      return;
    }

    // ----------------------------------------------------------
    // File size
    // ----------------------------------------------------------

    if (
      file.size >
      20 * 1024 * 1024
    ) {
      alert(
        "Image must be smaller than 20 MB."
      );

      e.target.value = "";

      return;
    }

    setUploadingImage(true);

    // ----------------------------------------------------------
    // Preview
    // ----------------------------------------------------------

    const imagePreviewUrl =
      URL.createObjectURL(file);

    const imageId = Date.now();

    const analysisId =
      imageId + 1;

    // ----------------------------------------------------------
    // Show image + analyzing message
    // ----------------------------------------------------------

    setMessages((prev) => [
      ...prev,

      {
        id: imageId,
        sender: "user",
        text: "",
        imageUrl: imagePreviewUrl,
      },

      {
        id: analysisId,
        sender: "bot",
        text: "Analyzing your image... 🌱🔍",
        typing: true,
      },
    ]);

    // ----------------------------------------------------------
    // Send image
    // ----------------------------------------------------------

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      console.log(
        "📷 Sending image to backend..."
      );

      console.log(
        "📷 File:",
        file.name
      );

      console.log(
        "📷 Type:",
        file.type
      );

      console.log(
        "📷 Size:",
        file.size
      );

      const response =
        await fetch(
          IMAGE_API_URL,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      console.log(
        "📷 Image analysis response:",
        data
      );

      // --------------------------------------------------------
      // Backend error
      // --------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Image analysis failed."
        );
      }

      // --------------------------------------------------------
      // AI response
      // --------------------------------------------------------

      const aiResponse =
        data.response ||
        "I could not understand the image. Please try another image.";

      // --------------------------------------------------------
      // Replace analyzing message
      // --------------------------------------------------------

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === analysisId
            ? {
                ...msg,
                text: aiResponse,
                typing: false,
              }
            : msg
        )
      );

    } catch (error) {
      console.error(
        "❌ Image analysis error:",
        error
      );

      // --------------------------------------------------------
      // Error message
      // --------------------------------------------------------

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === analysisId
            ? {
                ...msg,
                text:
                  "Sorry, I couldn't analyze this image right now. Please try again. 🌱",
                typing: false,
              }
            : msg
        )
      );

    } finally {
      setUploadingImage(false);

      // Allow same image to be selected again
      e.target.value = "";
    }
  };

  // ============================================================
  // SEND TEXT MESSAGE
  // ============================================================

  const handleSend = async () => {
    const trimmedInput =
      input.trim();

    if (
      !trimmedInput ||
      loading
    ) {
      return;
    }

    // ----------------------------------------------------------
    // User message
    // ----------------------------------------------------------

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: trimmedInput,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");

    setLoading(true);

    // ----------------------------------------------------------
    // Typing message
    // ----------------------------------------------------------

    const typingId =
      Date.now() + 1;

    setMessages((prev) => [
      ...prev,

      {
        id: typingId,
        sender: "bot",
        text: "Thinking... 🌱",
        typing: true,
      },
    ]);

    try {
      // --------------------------------------------------------
      // Conversation history
      // --------------------------------------------------------

      const conversation = [
        ...messages,
        userMessage,
      ]
        .filter(
          (msg) =>
            msg.id !== 1 &&
            !msg.typing &&
            msg.text
        )
        .map((msg) => ({
          role:
            msg.sender === "user"
              ? "user"
              : "assistant",

          content: msg.text,
        }));

      console.log(
        "📤 Sending conversation:",
        conversation
      );

      console.log(
        "📍 Sending location:",
        location
      );

      // --------------------------------------------------------
      // Request
      // --------------------------------------------------------

      const response =
        await fetch(
          API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              message:
                trimmedInput,

              conversation:
                conversation,

              latitude:
                location?.latitude ??
                null,

              longitude:
                location?.longitude ??
                null,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "🤖 Chatbot response:",
        data
      );

      // --------------------------------------------------------
      // Backend error
      // --------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Chatbot request failed."
        );
      }

      // --------------------------------------------------------
      // Replace typing message
      // --------------------------------------------------------

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? {
                ...msg,

                text:
                  data.response ||
                  "Sorry, I didn't get a response.",

                typing: false,
              }
            : msg
        )
      );

    } catch (error) {
      console.error(
        "❌ Chatbot error:",
        error
      );

      // --------------------------------------------------------
      // Error response
      // --------------------------------------------------------

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? {
                ...msg,

                text:
                  "Sorry, I couldn't process your request right now. Please try again. 🌱",

                typing: false,
              }
            : msg
        )
      );

    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      handleSend();
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen p-4 md:p-6">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="mb-5">

        <h1 className="text-3xl font-bold text-white">
          Farmer Chatbot
        </h1>

        <p className="mt-1 text-white/80">
          Your AI farming assistant
        </p>

      </div>

      {/* ======================================================
          CHAT CONTAINER
      ====================================================== */}

      <div
        className="
          mx-auto
          flex
          h-[calc(100vh-150px)]
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >

        {/* ====================================================
            CHAT HEADER
        ==================================================== */}

        <div
          className="
            flex
            items-center
            gap-3
            bg-gradient-to-r
            from-green-600
            to-emerald-600
            px-5
            py-4
            text-white
          "
        >

          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-white/20
            "
          >
            <FiMessageCircle
              size={25}
            />
          </div>

          <div>

            <h2 className="text-lg font-bold">
              Farmer Assistant
            </h2>

            <p className="text-sm text-white/80">
              Ask about crops, soil,
              irrigation, weather & more
            </p>

          </div>

        </div>

        {/* ====================================================
            LOCATION STATUS
        ==================================================== */}

        {locationStatus ===
          "success" && (
          <div
            className="
              border-b
              bg-green-50
              px-4
              py-2
              text-center
              text-xs
              text-green-700
            "
          >
            📍 Location detected — I can
            provide location-based farming
            advice.
          </div>
        )}

        {locationStatus ===
          "denied" && (
          <div
            className="
              border-b
              bg-yellow-50
              px-4
              py-2
              text-center
              text-xs
              text-yellow-700
            "
          >
            📍 Location access is unavailable.
            Some location-based recommendations
            may be limited.
          </div>
        )}

        {locationStatus ===
          "unsupported" && (
          <div
            className="
              border-b
              bg-yellow-50
              px-4
              py-2
              text-center
              text-xs
              text-yellow-700
            "
          >
            📍 Your browser does not support
            location services.
          </div>
        )}

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        <div
          className="
            flex-1
            space-y-4
            overflow-y-auto
            bg-gray-50
            p-5
          "
        >

          {messages.map(
            (message) => (

              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={`flex max-w-[80%] items-end gap-2 ${
                    message.sender === "user"
                      ? "flex-row-reverse"
                      : "flex-row"
                  }`}
                >

                  {/* ==========================================
                      AVATAR
                  ========================================== */}

                  <div
                    className={`
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      ${
                        message.sender ===
                        "user"
                          ? "bg-green-600 text-white"
                          : "bg-green-100 text-green-700"
                      }
                    `}
                  >

                    {message.sender ===
                    "user" ? (
                      <FiUser
                        size={18}
                      />
                    ) : (
                      <FiMessageCircle
                        size={18}
                      />
                    )}

                  </div>

                  {/* ==========================================
                      MESSAGE BUBBLE
                  ========================================== */}

                  <div
                    className={`
                      whitespace-pre-line
                      rounded-2xl
                      px-4
                      py-3
                      text-sm
                      shadow-sm
                      ${
                        message.sender ===
                        "user"
                          ? "rounded-br-md bg-green-600 text-white"
                          : "rounded-bl-md bg-white text-gray-800"
                      }
                    `}
                  >

                    {/* ========================================
                        UPLOADED IMAGE
                    ======================================== */}

                    {message.imageUrl && (
                      <img
                        src={
                          message.imageUrl
                        }
                        alt="Uploaded image"
                        className="
                          mb-2
                          max-h-72
                          max-w-full
                          rounded-xl
                          object-contain
                        "
                      />
                    )}

                    {/* ========================================
                        TYPING ANIMATION
                    ======================================== */}

                    {message.typing ? (

                      <div
                        className="
                          flex
                          items-center
                          gap-1
                        "
                      >

                        <span
                          className="
                            h-2
                            w-2
                            animate-bounce
                            rounded-full
                            bg-green-500
                          "
                        />

                        <span
                          className="
                            h-2
                            w-2
                            animate-bounce
                            rounded-full
                            bg-green-500
                          "
                          style={{
                            animationDelay:
                              "0.15s",
                          }}
                        />

                        <span
                          className="
                            h-2
                            w-2
                            animate-bounce
                            rounded-full
                            bg-green-500
                          "
                          style={{
                            animationDelay:
                              "0.3s",
                          }}
                        />

                      </div>

                    ) : (

                      /* ========================================
                         TEXT
                      ======================================== */

                      message.text && (
                        <div className="whitespace-pre-line">
                          {message.text}
                        </div>
                      )

                    )}

                  </div>

                </div>

              </div>

            )
          )}

          <div
            ref={messagesEndRef}
          />

        </div>

        {/* ====================================================
            INPUT AREA
        ==================================================== */}

        <div
          className="
            border-t
            bg-white
            p-4
          "
        >

          {/* ==================================================
              HIDDEN IMAGE INPUT
          ================================================== */}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={
              handleImageSelect
            }
          />

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            {/* ==================================================
                IMAGE BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={() =>
                imageInputRef.current?.click()
              }
              disabled={
                loading ||
                uploadingImage
              }
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-green-100
                text-green-700
                transition
                hover:bg-green-200
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              title="Upload image"
            >

              {uploadingImage ? (

                <FiLoader
                  size={20}
                  className="animate-spin"
                />

              ) : (

                <FiImage
                  size={20}
                />

              )}

            </button>

            {/* ==================================================
                TEXT INPUT
            ================================================== */}

            <input
              type="text"
              value={input}
              onChange={(e) =>
                setInput(
                  e.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              disabled={
                loading ||
                transcribing
              }
              placeholder={
                transcribing
                  ? "Converting voice to text..."
                  : "Ask about farming, crops, soil, weather..."
              }
              className="
                flex-1
                rounded-xl
                border
                border-gray-300
                px-4
                py-3
                text-sm
                outline-none
                transition
                focus:border-green-500
                focus:ring-2
                focus:ring-green-200
                disabled:bg-gray-100
              "
            />

            {/* ==================================================
                MICROPHONE
            ================================================== */}

            <button
              type="button"
              onClick={
                handleMicClick
              }
              disabled={
                loading ||
                transcribing
              }
              className={`
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-xl
                text-white
                transition
                ${
                  recording
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-600 hover:bg-green-700"
                }
                disabled:cursor-not-allowed
                disabled:opacity-50
              `}
              title={
                recording
                  ? "Stop recording"
                  : "Speak your question"
              }
            >

              {recording ? (

                <FiMicOff
                  size={20}
                />

              ) : (

                <FiMic
                  size={20}
                />

              )}

            </button>

            {/* ==================================================
                SEND BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={
                handleSend
              }
              disabled={
                !input.trim() ||
                loading ||
                transcribing
              }
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-green-600
                text-white
                transition
                hover:bg-green-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              title="Send message"
            >

              {loading ? (

                <FiLoader
                  size={20}
                  className="animate-spin"
                />

              ) : (

                <FiSend
                  size={20}
                />

              )}

            </button>

          </div>

          {/* ==================================================
              HELP TEXT
          ================================================== */}

          <p
            className="
              mt-2
              text-center
              text-xs
              text-gray-400
            "
          >

            {recording ? (
              "🎙️ Listening... Click the microphone to stop"
            ) : transcribing ? (
              "🔄 Converting your voice to text..."
            ) : uploadingImage ? (
              "📷 Analyzing your image..."
            ) : (
              "Press Enter to send • 🎙️ Speak • 📷 Upload any image"
            )}

          </p>

        </div>

      </div>

    </div>
  );
};

export default ChatbotPage;