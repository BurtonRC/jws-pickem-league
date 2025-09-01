// src/pages/SignUp.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const logoPath = `${import.meta.env.BASE_URL}images/pickem-logo.png`;

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      navigate("/login");
    } catch (err) {
      setError("Signup failed, try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <img src={logoPath} alt="JWs PickEm Logo" className="h-[120px] mb-12" />
      <form
        onSubmit={handleSignUp}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4"
      >
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Sign Up
        </button>
        <p className="text-sm text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
