import React from "react";
import ReactDOM from "react-dom/client";
import StewardshipPanel from "./StewardshipPanel";

const params = new URLSearchParams(window.location.search);
const projectId = params.get("project") ?? "demo";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StewardshipPanel projectId={projectId} />
  </React.StrictMode>
);
