import { useState, useEffect } from "react";

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window === "undefined") return { path: "/pos", params: {} };
    const hash = window.location.hash.replace(/^#/, "") || "/pos";
    return parseRoute(hash);
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "") || "/pos";
      setCurrentRoute(parseRoute(hash));
      window.scrollTo(0, 0);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  return { ...currentRoute, navigate };
}

function parseRoute(path) {
  // Clean query string if present
  const [pathname] = path.split("?");

  if (pathname.startsWith("/product/")) {
    const id = pathname.replace("/product/", "");
    return { path: "/product", params: { id }, raw: pathname };
  }

  const validPaths = ["/pos", "/dashboard", "/inventory", "/reorders", "/terms", "/privacy"];
  if (pathname === "/" || pathname === "") {
    return { path: "/pos", params: {}, raw: "/pos" };
  }

  if (validPaths.includes(pathname)) {
    return { path: pathname, params: {}, raw: pathname };
  }

  return { path: "/404", params: {}, raw: pathname };
}
