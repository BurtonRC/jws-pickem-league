// components/WarningModal.js
import React from "react";

export default function WarningModal({ isOpen, messages = [], onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-red-600">Incomplete Selections</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
        <button
          className="mt-4 w-full bg-blue-500 text-white font-semibold py-2 rounded-xl hover:bg-blue-600 transition"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
}
