import { useEffect } from "react";

export default function SeoHelmet({ title, description, schemaData }) {
  useEffect(() => {
    // 1. Update Document Title
    const fullTitle = title 
      ? `${title} | ApexRetail OS` 
      : "ApexRetail OS - Smart Retail Management & Inventory Intelligence";
    document.title = fullTitle;

    // 2. Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description || "AI-powered retail POS and inventory replenishment platform.";

    // 3. Inject Dynamic Schema.org JSON-LD
    let scriptTag = document.getElementById("page-json-ld");
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "page-json-ld";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }

    const defaultSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: fullTitle,
      description: metaDescription.content
    };

    scriptTag.textContent = JSON.stringify(schemaData || defaultSchema);
  }, [title, description, schemaData]);

  return null;
}
