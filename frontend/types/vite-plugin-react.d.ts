declare module "@vitejs/plugin-react" {
  import type { Plugin } from "vite";
  export default function react(...args: any[]): Plugin;
}
