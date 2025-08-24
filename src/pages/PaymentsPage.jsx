import React, { useEffect, useState } from "react";

export default function DynamicPaymentPage() {
  const CAD_ENTRY_FEE = 100;

  const [rates, setRates] = useState({ USD: null, EUR: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paymentLinks = {
    CAD: "https://buy.stripe.com/your-cad-link",
    USD: "https://buy.stripe.com/your-usd-link",
    EUR: "https://buy.stripe.com/your-eur-link",
  };

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(
          "https://api.frankfurter.app/latest?from=CAD&to=USD,EUR"
        );
        const data = await res.json();

        if (data && data.rates) {
          setRates({
            USD: data.rates.USD,
            EUR: data.rates.EUR,
          });
        } else {
          setError("Failed to load exchange rates");
        }
      } catch (e) {
        setError("Failed to load exchange rates");
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, []);

  if (loading) return <p>Loading payment info...</p>;
  if (error) return <p>Error: {error}</p>;

  const payments = [
    {
      currency: "CAD",
      amount: CAD_ENTRY_FEE.toFixed(2),
      symbol: "$",
      link: paymentLinks.CAD,
      flag: "🇨🇦",
    },
    {
      currency: "USD",
      amount: (CAD_ENTRY_FEE * rates.USD).toFixed(2),
      symbol: "$",
      link: paymentLinks.USD,
      flag: "🇺🇸",
    },
    {
      currency: "EUR",
      amount: (CAD_ENTRY_FEE * rates.EUR).toFixed(2),
      symbol: "€",
      link: paymentLinks.EUR,
      flag: "🇪🇺",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full md:w-[90%] max-w-5xl mx-auto p-6 space-y-4">
        <div style={{ maxWidth: 600, margin: "auto", padding: "2rem", fontFamily: "sans-serif" }}>
          <h1 style={{ textAlign: "center" }}>NFL Pick’em Entry Fee</h1>
          <p style={{ textAlign: "center", padding: "30px 0px" }}>
            Select your currency to pay the <strong>${CAD_ENTRY_FEE} CAD</strong> equivalent securely via Stripe.
          </p>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            {payments.map(({ currency, amount, symbol, link, flag }) => (
              <a
                key={currency}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  backgroundColor: "#f9f9f9",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  textDecoration: "none",
                  color: "#000",
                  transition: "background-color 0.2s ease-in-out",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef6ff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
              >
                <span style={{ fontSize: "1.5rem", marginRight: 10 }}>{flag}</span>
                {symbol}
                {amount} {currency}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
