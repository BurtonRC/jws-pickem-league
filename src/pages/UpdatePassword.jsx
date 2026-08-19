import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const logoPath = `${import.meta.env.BASE_URL}images/pickem-logo.png`;

  useEffect(() => {
    let mounted = true;

    const establishRecoverySession = async () => {
      setError("");
      setMessage("");

      // Supabase may establish the recovery session automatically
      // when the recovery URL is loaded.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        setReady(true);
        return;
      }

      // Give Supabase's auth event handling a moment to process
      // the recovery URL.
      const timeout = setTimeout(async () => {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (currentSession) {
          setReady(true);
        } else {
          setError(
            "This password reset link is invalid or has expired. Please request a new one."
          );
        }
      }, 1000);

      return () => clearTimeout(timeout);
    };

    establishRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN"
      ) {
        if (session) {
          setReady(true);
          setError("");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setMessage(
        "Password updated successfully. You can now log in."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("Password update failed:", err);
      setError(
        err.message || "Unable to update your password."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <img
        src={logoPath}
        alt="JWs PickEm Logo"
        className="h-[180px] mb-12"
      />

      <form
        onSubmit={handleUpdate}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">
          Reset Password
        </h1>

        {error && (
          <p className="text-red-600 text-sm">
            {error}
          </p>
        )}

        {message && (
          <p className="text-green-600 text-sm">
            {message}
          </p>
        )}

        {!ready && !error && (
          <p className="text-gray-600 text-sm text-center">
            Verifying your password reset link...
          </p>
        )}

        {ready && (
          <>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={saving}
                className="w-full p-2 pr-16 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600 hover:underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={saving}
                className="w-full p-2 pr-16 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600 hover:underline"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving
                ? "Updating..."
                : "Update Password"}
            </button>
          </>
        )}

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-blue-500 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}