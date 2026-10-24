import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/vendor/**",
  ]),
  // The 3D scene is imperative by nature: three.js objects, cameras and lights are mutated every frame inside
  // useFrame, which is how react-three-fiber is meant to be used. The React Compiler's immutability and purity
  // rules do not apply to those objects.
  {
    files: ["src/components/gallery3d/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Code carried over unchanged from the archive app and the Email Studio (see INTEGRATION_PLAN.md). It is kept
  // byte-for-byte where possible, so its pre-existing lint findings are reported as warnings, not fixed in place.
  {
    files: [
      "src/components/ui/**",
      "src/hooks/use-toast.ts",
      "src/components/email-studio/**",
      "src/components/archive/**",
      "src/components/auth/**",
      "src/app/studio/archive/**",
      "src/app/studio/sales/**",
      "src/app/studio/website/profile/**",
      "src/app/api/generate-catalog/**",
      "src/app/api/upload/**",
      "src/app/actions/db.ts",
      "src/app/login/**",
      "src/lib/catalog.ts",
      "src/lib/pdf-templates.tsx",
      "src/lib/image-compression.ts",
      "src/lib/compress-image.ts",
      "src/lib/types/**",
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "warn",
    },
  },
]);

export default eslintConfig;
