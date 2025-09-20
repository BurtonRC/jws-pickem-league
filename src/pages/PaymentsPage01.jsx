import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react"; // npm install qrcode.react

export default function DynamicPaymentPage() {
  const CAD_ENTRY_FEE = 100;
  const INTERAC_EMAIL = "your-email@bank.com"; // Replace with your actual Interac email

  const [rates, setRates] = useState({ USD: null, EUR: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(INTERAC_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p>Loading payment info...</p>;
  if (error) return <p>Error: {error}</p>;

  const payments = [
    {
      amount: Math.ceil(CAD_ENTRY_FEE * rates.USD),
      symbol: "$",
      flagUrl: "https://flagcdn.com/24x18/us.png", // larger flag for cards
      alt: "USA",
    },
    {
      amount: Math.ceil(CAD_ENTRY_FEE * rates.EUR),
      symbol: "€",
      flagUrl: "https://flagcdn.com/24x18/eu.png", // larger flag for cards
      alt: "EU",
    },
  ];

  return (
    <>
      <style>
        {`
          body {
            font-family: sans-serif;
          }

          .desktop-qr {
            display: none;
          }

          @media (min-width: 768px) {
            .desktop-qr {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
          }

          .flag-container {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .flag-container img {
            height: 2em; /* larger flags above headings */
            vertical-align: middle;
          }

          .heading-text {
            text-align: center;
            font-size: 1.75rem;
            margin-bottom: 1rem;
          }

          .card-flag {
            height: 1.5em; /* centered above card text */
            margin-bottom: 5px;
          }
        `}
      </style>

      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center space-y-10">

        {/* Canadian Users Section */}
        <div
          style={{
            width: "100%",
            maxWidth: 600,
            padding: "2rem",
            border: "2px solid #8b6212",
            borderRadius: "12px",
            backgroundColor: "#ffecc6",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Flags above heading */}
          <div className="flag-container">
            <img src="https://flagcdn.com/48x36/ca.png" alt="Canada" />
          </div>
          <h2 className="heading-text">Canadian Members</h2>

          <span style={{ textAlign: "center", fontSize: "1.5rem", marginBottom: 10 }}>Send ${CAD_ENTRY_FEE} via Interac e‑Transfer</span>
          <p style={{ textAlign: "center", fontSize: "0.95rem", marginBottom: "10px" }}>
            Click the button below to copy the Interac email,<br></br> then open your bank app to send the transfer.
          </p>
          <button
            onClick={copyEmailToClipboard}
            style={{
              marginBottom: "10px",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#008f45",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            {copied ? "Copied" : "Copy Interac Email"}
          </button>

          {/* Desktop-only QR code */}
          <div className="desktop-qr" style={{ marginTop: "15px" }}>
            <p style={{ textAlign: "center", fontSize: "0.95rem", marginTop: "20px", marginBottom: "20px" }}>
            Another handy option would be to scan <br></br> the QR code with your mobile banking app.
          </p>
            <QRCodeCanvas
              value={`interac://pay?recipient=${INTERAC_EMAIL}&amount=${CAD_ENTRY_FEE}&note=NFL%20Pick'em%20Membership`}
              size={128}
            />
            <p style={{ fontSize: "0.75rem", textAlign: "center", marginTop: "5px" }}>
              Scan the QR code
            </p>
          </div>
        </div>

        {/* US/EU Users Section */}
        <div
          style={{
            width: "100%",
            maxWidth: 600,
            padding: "2rem",
            border: "2px solid #0283ae",
            borderRadius: "12px",
            backgroundColor: "#d8e6eb",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Flags above heading */}
          <div className="flag-container">
            <img src="https://flagcdn.com/48x36/us.png" alt="USA" />
            <img src="https://flagcdn.com/48x36/eu.png" alt="EU" />
          </div>
          <h2 className="heading-text">US & EU Members</h2>

          <p style={{ textAlign: "center", fontSize: "0.95rem", marginBottom: "1rem" }}>
            Pay via your preferred processor. Amounts are approximate CAD equivalent.
          </p>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              width: "100%",
            }}
          >
            {payments.map(({ currency, amount, symbol, flagUrl, alt }) => (
              <div
                key={currency}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                  border: "2px solid #0283ae",
                  borderRadius: "10px",
                  backgroundColor: "#ebfaff",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                }}
              >
                {/* Flag centered above card */}
                <img src={flagUrl} alt={alt} className="card-flag" />
                <span>{currency}</span>
                <span>{symbol}{amount} {currency}</span>
                <p style={{ marginTop: "0.5rem", textAlign: "center", fontWeight: "normal", fontSize: "0.85rem" }}>
                  Pay via your preferred processor.
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
