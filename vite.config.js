import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // Appen ligger aktuelt på https://git.foo.dk/taxa/.
    // Kan ændres via VITE_BASE_PATH uden kodeændringer.
    base: env.VITE_BASE_PATH || "/taxa/",
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: true,
    },
  };
});
