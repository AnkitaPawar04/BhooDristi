import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../contexts/AppContext';
import { getTranslation } from '../utils/i18n';

const LogoutConfirm = ({ isOpen, onConfirm, onCancel }) => {
  const { language } = useApp();

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div className="w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-white p-8 shadow-2xl dark:bg-gray-800">
        <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-100">
          {getTranslation(language, 'confirmLogout')}
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          {getTranslation(language, 'areYouSure')}
        </p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border-2 border-gray-300 px-6 py-2 font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {getTranslation(language, 'no')}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
          >
            {getTranslation(language, 'yes')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutConfirm;
