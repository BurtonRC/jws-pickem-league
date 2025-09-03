import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [accessToken, setAccessToken] = useState(null);

  const logoPath = `${import.meta.env.BASE_URL}images/pickem-logo.png`;

  useEffect(() => {

    console.log("Hash:", window.location.hash);
  console.log("Search:", window.location.search);
  console.log("Token from hash:", token);


  // Try query string first
  let token = new URLSearchParams(window.location.search).get("access_token");

  // If not found, try hash fragment
  if (!token) {
    const hash = window.location.hash.substring(1); // remove #
    const params = new URLSearchParams(hash);
    token = params.get("access_token");
  }

  if (!token) {
    setMessage("Invalid or expired link.");
  } else {
    setAccessToken(token);
    supabase.auth.setSession({ access_token: token });
  }
}, []);


  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!accessToken) return;

    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else setMessage("Password updated successfully! You can now log in.");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <img src={logoPath} alt="JWs PickEm Logo" className="h-[180px] mb-12" />

      <form
        onSubmit={handleUpdate}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4"
      >
        {message && (
          <p
            className={
              message.includes("successfully")
                ? "text-green-600"
                : "text-red-500"
            }
          >
            {message}
          </p>
        )}

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
