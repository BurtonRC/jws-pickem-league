// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const navigate = useNavigate();

  const logoPath = `${import.meta.env.BASE_URL}images/pickem-logo.png`;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Try login with email first
      let { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.includes("@") ? identifier : undefined,
        password,
      });

      // If no email, try username lookup
      if (!data?.user && !identifier.includes("@")) {
        const { data: userByUsername } = await supabase
          .from("users") // replace with your table storing usernames
          .select("email")
          .eq("username", identifier)
          .single();

        if (!userByUsername?.email) {
          setError("User not found");
          return;
        }

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: userByUsername.email,
          password,
        });

        if (loginError) throw loginError;
        if (loginData?.user) navigate("/home");
      } else {
        if (error) throw error;
        navigate("/home");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) setError(error.message);
    else setMessage("Check your email for the reset link.");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <img src={logoPath} alt="JWs PickEm Logo" className="h-[180px] mb-12" />

      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4">
        {!showReset ? (
          // --- Login Form ---
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <input
              type="text"
              placeholder="Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Log In
            </button>

           {/* <p className="text-sm text-center mt-2">
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </p> */}

            <p className="text-sm text-center">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        ) : (
          // --- Forgot Password Form ---
        {/*  <form onSubmit={handleResetPassword} className="space-y-4">
            {message && <p className="text-green-500 text-sm text-center">{message}</p>}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800 transition"
            >
              Send Reset Link
            </button>

            <p className="text-sm text-center mt-2">
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="text-blue-600 hover:underline"
              >
                Back to Login
              </button>
            </p>
          </form> */}
        )}
      </div>
    </div>
  );
}
