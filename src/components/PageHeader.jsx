// src/components/PageHeader.jsx
export default function PageHeader({ children }) {
  return (
    <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center md:text-left">
      {children}
    </h1>
  );
}
