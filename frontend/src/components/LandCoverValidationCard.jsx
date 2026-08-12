import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const validationContent = {
  "Permanent Water": {
    icon: "💧",
    title: "Water Body Detected",
    status: "Location Not Suitable",
    reason:
      "This location is a water body, not agricultural land.",
    suggestion:
      "Select a nearby agricultural field for crop recommendation.",
    border: "border-blue-300 dark:border-blue-700",
    header: "bg-blue-50 dark:bg-blue-900/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    statusColor: "text-blue-700 dark:text-blue-300",
  },

  "Built-up": {
    icon: "🏙️",
    title: "Urban Area Detected",
    status: "Location Not Suitable",
    reason:
      "This location is a built-up or urban area, not farmland.",
    suggestion:
      "Select an agricultural field or farmland to continue.",
    border: "border-gray-300 dark:border-gray-700",
    header: "bg-gray-50 dark:bg-gray-800",
    iconBg: "bg-gray-100 dark:bg-gray-700",
    statusColor: "text-gray-700 dark:text-gray-300",
  },

  Trees: {
    icon: "🌳",
    title: "Forest Area Detected",
    status: "Location Not Suitable",
    reason:
      "This location is covered by natural tree vegetation, not cultivated farmland.",
    suggestion:
      "Choose a cultivated agricultural field for crop recommendation.",
    border: "border-green-300 dark:border-green-700",
    header: "bg-green-50 dark:bg-green-900/20",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    statusColor: "text-green-700 dark:text-green-300",
  },

  Grassland: {
    icon: "🌾",
    title: "Grassland Detected",
    status: "Location Not Suitable",
    reason:
      "This location is grassland, not cultivated farmland.",
    suggestion:
      "Select an agricultural field for crop recommendation.",
    border: "border-lime-300 dark:border-lime-700",
    header: "bg-lime-50 dark:bg-lime-900/20",
    iconBg: "bg-lime-100 dark:bg-lime-900/40",
    statusColor: "text-lime-700 dark:text-lime-300",
  },

  Shrubland: {
    icon: "🌿",
    title: "Shrubland Detected",
    status: "Location Not Suitable",
    reason:
      "This location contains natural shrub vegetation, not cultivated farmland.",
    suggestion:
      "Select cultivated agricultural land to continue.",
    border: "border-amber-300 dark:border-amber-700",
    header: "bg-amber-50 dark:bg-amber-900/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    statusColor: "text-amber-700 dark:text-amber-300",
  },

  default: {
    icon: "⚠️",
    title: "Unsupported Location",
    status: "Location Not Suitable",
    reason:
      "Crop recommendation is available only for agricultural land.",
    suggestion:
      "Please choose another location.",
    border: "border-yellow-300 dark:border-yellow-700",
    header: "bg-yellow-50 dark:bg-yellow-900/20",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
    statusColor: "text-yellow-700 dark:text-yellow-300",
  },
};

const LandCoverValidationCard = ({
  validation,
  onChangeLocation,
  selectedLocation,
}) => {
  if (!validation) {
    return null;
  }

  const { land_cover, class_id } = validation;

  const content =
    validationContent[land_cover] || validationContent.default;

  const handleClose = () => {
    if (onChangeLocation) {
      onChangeLocation();
    }
  };

  // Close popup with Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Prevent background scrolling while popup is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="land-cover-validation-title"
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <section
        className={`
          relative z-10
          w-full max-w-lg
          max-h-[88vh]
          overflow-y-auto
          bg-white dark:bg-gray-800
          rounded-2xl
          shadow-2xl
          border-2 ${content.border}
        `}
      >
        {/* Header */}
        <div
          className={`
            px-5 py-4
            border-b border-gray-200 dark:border-gray-700
            ${content.header}
          `}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Land-cover icon */}
              <div
                className={`
                  w-11 h-11
                  rounded-full
                  flex items-center justify-center
                  text-xl
                  flex-shrink-0
                  ${content.iconBg}
                `}
              >
                {content.icon}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Location Validation
                </p>

                <h2
                  id="land-cover-validation-title"
                  className="text-xl font-bold text-gray-900 dark:text-white mt-0.5"
                >
                  {content.title}
                </h2>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close validation popup"
              className="
                w-8 h-8
                rounded-full
                flex items-center justify-center
                text-gray-500
                hover:text-gray-900
                hover:bg-gray-200
                dark:text-gray-400
                dark:hover:text-white
                dark:hover:bg-gray-700
                transition
                flex-shrink-0
              "
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Status */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Status
            </p>

            <p
              className={`mt-1 font-bold ${content.statusColor}`}
            >
              {content.status}
            </p>
          </div>

          {/* Detected Land Cover */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Detected Land Cover
            </p>

            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {land_cover || "Unknown"}
            </p>

            {class_id !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ESA WorldCover Class: {class_id}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Reason
            </p>

            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-6">
              {content.reason}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Recommended Action
            </p>

            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-6">
              {content.suggestion}
            </p>
          </div>

          {/* Coordinates */}
          {selectedLocation && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Selected Coordinates
              </p>

              <p className="mt-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                {selectedLocation.latitude.toFixed(6)},{" "}
                {selectedLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Primary action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="
                w-full
                px-5 py-3
                rounded-xl
                bg-green-600
                hover:bg-green-700
                active:bg-green-800
                text-white
                font-bold
                text-sm
                transition-colors
                duration-200
                shadow-md
              "
            >
              Select Another Location
            </button>
          </div>

          {/* Small helper text */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            You can also press Esc or click outside to close.
          </p>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default LandCoverValidationCard;