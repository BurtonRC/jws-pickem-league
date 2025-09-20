import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // scrolls to top whenever pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null; // this component doesn’t render anything
}
