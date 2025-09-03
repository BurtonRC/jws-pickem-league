// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      // Use hash for redirect since we're using HashRouter
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "https://jwnflpickem.com/update-password" // <-- include /#/update-password
});




      if (error) throw error;

      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError(err.message || "Failed to send reset email.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      <img
        src={`${import.meta.env.BASE_URL}images/pickem-logo.png`}
        alt="Logo"
        className="h-30 mb-8"
      />
      <form
        onSubmit={handleForgotPassword}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4"
      >
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-600 text-sm">{message}</p>}

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Send Reset Email
        </button>
      </form>
    </div>
  );
}
