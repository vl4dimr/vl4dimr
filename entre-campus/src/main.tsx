import { render } from "preact";
import "./estilos/base.css";
import "./lib/instalar";
import { App } from "./App";
import { Proveedor } from "./estado";

render(
  <Proveedor>
    <App />
  </Proveedor>,
  document.getElementById("app")!,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
}
